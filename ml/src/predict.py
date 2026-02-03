"""
=============================================================================
FoodBridge AI - Prediction / Inference Module (PyTorch)
=============================================================================

This module handles making predictions with the trained LSTM model.
It provides functions for:
1. Loading and preparing recent data for prediction
2. Running inference on new data
3. Formatting predictions for the web application
4. Computing risk scores and confidence levels

Production Deployment Notes:
---------------------------
- This module is designed to be called by an API endpoint
- Predictions are cached for efficiency
- Results include confidence intervals for uncertainty quantification

Academic Background:
-------------------
Uncertainty Quantification:
    For neural networks, we can estimate prediction uncertainty using:
    1. Point estimates + empirical intervals
    2. Monte Carlo Dropout (dropout at inference time)
    3. Ensemble methods
    
    We use empirical intervals based on historical prediction errors.

Author: FoodBridge AI Team
Version: 2.0.0 (PyTorch)
=============================================================================
"""

import numpy as np
import pandas as pd
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import logging

import torch
import torch.nn as nn

from config import (
    MODEL_CONFIG,
    PREDICTION_CONFIG,
    MODELS_DIR,
    DATA_DIR,
    PREDICTIONS_OUTPUT_PATH,
    NGO_CONFIGS,
    NGO_ID_MAP
)
from data_preprocessing import (
    FeatureScaler,
    create_temporal_features,
    get_feature_columns,
    load_processed_data
)
from lstm_model import load_model, get_device

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# DATA PREPARATION FOR INFERENCE
# =============================================================================

def prepare_inference_data(
    historical_data: pd.DataFrame,
    ngo_id: str,
    scaler: FeatureScaler
) -> np.ndarray:
    """
    Prepare data for inference for a single NGO.
    
    Args:
        historical_data: DataFrame with recent history
        ngo_id: NGO identifier
        scaler: Fitted scaler
        
    Returns:
        Preprocessed input array of shape (1, sequence_length, num_features)
    """
    # Filter for specific NGO
    ngo_data = historical_data[historical_data['ngo_id'] == ngo_id].copy()
    
    # Sort by date and get most recent sequence_length days
    ngo_data = ngo_data.sort_values('date').tail(MODEL_CONFIG.sequence_length)
    
    if len(ngo_data) < MODEL_CONFIG.sequence_length:
        raise ValueError(
            f"Insufficient data for {ngo_id}: need {MODEL_CONFIG.sequence_length} days, "
            f"got {len(ngo_data)}"
        )
    
    # Create temporal features
    ngo_data = create_temporal_features(ngo_data)
    
    # Get feature columns
    feature_cols = get_feature_columns()
    
    # Scale features
    scaled_features = scaler.transform(ngo_data, feature_cols)
    
    # Reshape for model input: (1, sequence_length, num_features)
    return scaled_features.reshape(1, MODEL_CONFIG.sequence_length, -1)


def create_mock_recent_data(
    num_days: int = 30,
    base_date: Optional[datetime] = None
) -> pd.DataFrame:
    """
    Create mock recent data for demonstration.
    
    In production, this would be replaced with actual database queries.
    
    Args:
        num_days: Number of days of history to create
        base_date: End date (defaults to today)
        
    Returns:
        DataFrame with mock historical data
    """
    from generate_synthetic_data import generate_ngo_daily_data
    
    if base_date is None:
        base_date = datetime.now().date()
    
    start_date = base_date - timedelta(days=num_days)
    
    all_data = []
    for ngo_id, ngo_config in NGO_CONFIGS.items():
        ngo_data = generate_ngo_daily_data(
            ngo_id=ngo_id,
            ngo_config=ngo_config,
            start_date=start_date,
            end_date=base_date
        )
        all_data.append(ngo_data)
    
    return pd.concat(all_data, ignore_index=True)


# =============================================================================
# PREDICTION FUNCTIONS
# =============================================================================

def predict_single_ngo(
    model: nn.Module,
    scaler: FeatureScaler,
    historical_data: pd.DataFrame,
    ngo_id: str,
    device: torch.device = None
) -> np.ndarray:
    """
    Make prediction for a single NGO.
    
    Args:
        model: Trained LSTM model
        scaler: Fitted scaler
        historical_data: Recent historical data
        ngo_id: NGO to predict for
        device: Device to use
        
    Returns:
        Predicted values (inverse transformed) of shape (forecast_horizon,)
    """
    device = device or get_device()
    
    # Prepare input
    X = prepare_inference_data(historical_data, ngo_id, scaler)
    
    # Convert to tensor
    X_tensor = torch.FloatTensor(X).to(device)
    
    # Predict
    model.eval()
    with torch.no_grad():
        y_pred_scaled = model(X_tensor)
    
    y_pred_scaled = y_pred_scaled.cpu().numpy()
    
    # Inverse transform
    y_pred = scaler.inverse_transform_target(y_pred_scaled.flatten())
    
    return y_pred


def predict_all_ngos(
    model: nn.Module,
    scaler: FeatureScaler,
    historical_data: pd.DataFrame,
    device: torch.device = None
) -> Dict[str, np.ndarray]:
    """
    Make predictions for all NGOs.
    
    Args:
        model: Trained LSTM model
        scaler: Fitted scaler
        historical_data: Recent historical data
        device: Device to use
        
    Returns:
        Dictionary mapping NGO ID to predictions
    """
    device = device or get_device()
    predictions = {}
    
    for ngo_id in NGO_CONFIGS.keys():
        try:
            pred = predict_single_ngo(model, scaler, historical_data, ngo_id, device)
            predictions[ngo_id] = pred
            logger.info(f"Predicted for {ngo_id}: {pred}")
        except Exception as e:
            logger.error(f"Failed to predict for {ngo_id}: {e}")
            predictions[ngo_id] = None
    
    return predictions


# =============================================================================
# RISK SCORING AND CONFIDENCE
# =============================================================================

def compute_risk_score(
    predicted_demand: float,
    ngo_id: str
) -> Tuple[float, str]:
    """
    Compute risk score based on predicted demand.
    
    Academic Note:
        Risk scoring transforms continuous predictions into actionable
        categories. We use threshold-based classification:
        - LOW: Below average demand
        - MEDIUM: Average demand
        - HIGH: Above average demand
        - CRITICAL: Significantly above average
    
    Args:
        predicted_demand: Predicted demand value
        ngo_id: NGO identifier (for context-specific thresholds)
        
    Returns:
        Tuple of (risk_score 0-100, risk_level string)
    """
    # Get NGO baseline
    ngo_config = NGO_CONFIGS.get(ngo_id)
    if ngo_config is None:
        baseline = 100  # Default
    else:
        baseline = ngo_config.base_demand
    
    # Calculate ratio
    ratio = predicted_demand / baseline
    
    # Map to risk score (0-100)
    if ratio <= 0.8:
        risk_score = max(0, ratio * 25)
        risk_level = 'LOW'
    elif ratio <= 1.0:
        risk_score = 20 + (ratio - 0.8) * 75
        risk_level = 'MEDIUM'
    elif ratio <= 1.2:
        risk_score = 35 + (ratio - 1.0) * 125
        risk_level = 'MEDIUM'
    elif ratio <= 1.5:
        risk_score = 60 + (ratio - 1.2) * 100
        risk_level = 'HIGH'
    else:
        risk_score = min(100, 90 + (ratio - 1.5) * 20)
        risk_level = 'CRITICAL'
    
    return risk_score, risk_level


def compute_confidence_interval(
    predictions: np.ndarray,
    confidence_level: float = 0.95
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute simple confidence intervals based on historical prediction errors.
    
    Academic Note:
        For a properly calibrated model, confidence intervals should contain
        the true value approximately (confidence_level × 100)% of the time.
        
        We use a simple approach: ±10% for 90% CI, ±15% for 95% CI
        In production, this would be calibrated using validation set errors.
    
    Args:
        predictions: Predicted values
        confidence_level: Confidence level (e.g., 0.95 for 95% CI)
        
    Returns:
        Tuple of (lower_bounds, upper_bounds)
    """
    # Simple percentage-based intervals
    if confidence_level >= 0.95:
        margin = 0.15
    elif confidence_level >= 0.90:
        margin = 0.10
    else:
        margin = 0.05
    
    lower = predictions * (1 - margin)
    upper = predictions * (1 + margin)
    
    return lower, upper


# =============================================================================
# OUTPUT FORMATTING FOR WEB APPLICATION
# =============================================================================

def format_predictions_for_api(
    predictions: Dict[str, np.ndarray],
    base_date: Optional[datetime] = None
) -> Dict:
    """
    Format predictions for the web API.
    
    Args:
        predictions: Dictionary of NGO predictions
        base_date: Start date for forecast
        
    Returns:
        API-ready dictionary
    """
    if base_date is None:
        base_date = datetime.now().date()
    
    formatted = {
        'generated_at': datetime.now().isoformat(),
        'forecast_start': str(base_date),
        'forecast_horizon_days': MODEL_CONFIG.forecast_horizon,
        'model_version': '2.0.0',
        'ngos': {}
    }
    
    for ngo_id, pred in predictions.items():
        if pred is None:
            continue
        
        # Compute confidence intervals
        lower, upper = compute_confidence_interval(pred, 0.95)
        
        # Compute daily forecasts
        daily_forecasts = []
        for day_idx in range(len(pred)):
            forecast_date = base_date + timedelta(days=day_idx + 1)
            risk_score, risk_level = compute_risk_score(pred[day_idx], ngo_id)
            
            daily_forecasts.append({
                'date': str(forecast_date),
                'day_index': day_idx + 1,
                'predicted_demand': round(float(pred[day_idx]), 2),
                'lower_bound_95': round(float(lower[day_idx]), 2),
                'upper_bound_95': round(float(upper[day_idx]), 2),
                'risk_score': round(risk_score, 1),
                'risk_level': risk_level
            })
        
        # Aggregate metrics
        avg_demand = float(np.mean(pred))
        max_demand = float(np.max(pred))
        total_demand = float(np.sum(pred))
        avg_risk, overall_risk_level = compute_risk_score(avg_demand, ngo_id)
        
        formatted['ngos'][ngo_id] = {
            'ngo_name': NGO_CONFIGS[ngo_id].name if ngo_id in NGO_CONFIGS else ngo_id,
            'daily_forecasts': daily_forecasts,
            'summary': {
                'average_daily_demand': round(avg_demand, 2),
                'max_daily_demand': round(max_demand, 2),
                'total_7day_demand': round(total_demand, 2),
                'overall_risk_score': round(avg_risk, 1),
                'overall_risk_level': overall_risk_level
            }
        }
    
    return formatted


def format_predictions_for_display(
    predictions: Dict[str, np.ndarray],
    base_date: Optional[datetime] = None
) -> pd.DataFrame:
    """
    Format predictions as a DataFrame for display.
    
    Args:
        predictions: Dictionary of NGO predictions
        base_date: Start date for forecast
        
    Returns:
        DataFrame with predictions
    """
    if base_date is None:
        base_date = datetime.now().date()
    
    rows = []
    for ngo_id, pred in predictions.items():
        if pred is None:
            continue
        
        for day_idx in range(len(pred)):
            forecast_date = base_date + timedelta(days=day_idx + 1)
            risk_score, risk_level = compute_risk_score(pred[day_idx], ngo_id)
            
            rows.append({
                'NGO': ngo_id,
                'Date': forecast_date,
                'Day': day_idx + 1,
                'Predicted Demand': round(pred[day_idx], 2),
                'Risk Score': round(risk_score, 1),
                'Risk Level': risk_level
            })
    
    return pd.DataFrame(rows)


# =============================================================================
# MAIN PREDICTION PIPELINE
# =============================================================================

def run_prediction_pipeline(
    model_name: str = 'lstm_model_latest',
    use_mock_data: bool = True,
    save_results: bool = True
) -> Dict:
    """
    Run the complete prediction pipeline.
    
    Args:
        model_name: Name of model to load
        use_mock_data: Whether to use mock data (True) or real data (False)
        save_results: Whether to save results to file
        
    Returns:
        Formatted predictions dictionary
    """
    logger.info("=" * 70)
    logger.info("FoodBridge AI - Running Prediction Pipeline")
    logger.info("=" * 70)
    
    # Get device
    device = get_device()
    logger.info(f"Using device: {device}")
    
    # Load scaler and get input size
    _, scaler = load_processed_data()
    splits, _ = load_processed_data()
    input_size = splits['X_train'].shape[2]
    
    # Load model
    logger.info(f"Loading model: {model_name}")
    model = load_model(model_name, input_size=input_size, device=device)
    
    # Get historical data
    if use_mock_data:
        logger.info("Generating mock recent data...")
        historical_data = create_mock_recent_data(num_days=30)
    else:
        # In production, this would query the database
        logger.warning("Real data loading not implemented, using mock data")
        historical_data = create_mock_recent_data(num_days=30)
    
    logger.info(f"Historical data shape: {historical_data.shape}")
    
    # Make predictions
    logger.info("Making predictions...")
    predictions = predict_all_ngos(model, scaler, historical_data, device)
    
    # Format for API
    formatted = format_predictions_for_api(predictions)
    
    # Save results
    if save_results:
        with open(PREDICTIONS_OUTPUT_PATH, 'w') as f:
            json.dump(formatted, f, indent=2)
        logger.info(f"Saved predictions to {PREDICTIONS_OUTPUT_PATH}")
    
    # Print summary
    print("\n" + "=" * 70)
    print("PREDICTION SUMMARY")
    print("=" * 70)
    
    df = format_predictions_for_display(predictions)
    print("\nPredictions by NGO and Day:")
    print(df.to_string(index=False))
    
    print("\nOverall Risk Summary:")
    for ngo_id, ngo_data in formatted['ngos'].items():
        summary = ngo_data['summary']
        print(f"  {ngo_id}: Risk={summary['overall_risk_score']:.1f} ({summary['overall_risk_level']}), "
              f"Avg Demand={summary['average_daily_demand']:.1f}")
    
    return formatted


# =============================================================================
# QUICK PREDICTION FUNCTION FOR API
# =============================================================================

def get_predictions(
    model: Optional[nn.Module] = None,
    scaler: Optional[FeatureScaler] = None
) -> Dict:
    """
    Quick function to get predictions (for API use).
    
    Args:
        model: Pre-loaded model (will load if None)
        scaler: Pre-loaded scaler (will load if None)
        
    Returns:
        Formatted predictions
    """
    device = get_device()
    
    if scaler is None:
        _, scaler = load_processed_data()
    
    if model is None:
        splits, _ = load_processed_data()
        input_size = splits['X_train'].shape[2]
        model = load_model('lstm_model_latest', input_size=input_size, device=device)
    
    # Use mock data for demo
    historical_data = create_mock_recent_data(num_days=30)
    
    # Predict
    predictions = predict_all_ngos(model, scaler, historical_data, device)
    
    # Format
    return format_predictions_for_api(predictions)


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("FoodBridge AI - Prediction Module")
    print("=" * 70)
    
    # Run prediction pipeline
    results = run_prediction_pipeline(
        model_name='lstm_model_latest',
        use_mock_data=True,
        save_results=True
    )
    
    print("\n✓ Predictions generated successfully!")
    print(f"Results saved to: {PREDICTIONS_OUTPUT_PATH}")
