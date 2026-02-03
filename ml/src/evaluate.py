"""
=============================================================================
FoodBridge AI - Model Evaluation Module (PyTorch)
=============================================================================

This module provides comprehensive evaluation of the trained LSTM model,
including multiple metrics, visualizations, and per-NGO analysis.

Evaluation Metrics:
------------------
1. MSE (Mean Squared Error): Average squared difference
   - Formula: MSE = (1/n) Σ(y_true - y_pred)²
   - Good for: Penalizing large errors
   
2. MAE (Mean Absolute Error): Average absolute difference
   - Formula: MAE = (1/n) Σ|y_true - y_pred|
   - Good for: Interpretable error magnitude
   
3. RMSE (Root Mean Squared Error): Square root of MSE
   - Formula: RMSE = √MSE
   - Good for: Same units as target variable
   
4. MAPE (Mean Absolute Percentage Error): Percentage error
   - Formula: MAPE = (100/n) Σ|y_true - y_pred| / y_true
   - Good for: Relative error across different scales
   
5. R² (Coefficient of Determination): Variance explained
   - Formula: R² = 1 - SS_res / SS_tot
   - Good for: Model fit quality (1.0 = perfect)

Academic Note:
--------------
For time-series forecasting, we evaluate:
- Point-by-point predictions (each day separately)
- Cumulative forecasts (full horizon)
- Per-NGO performance (different patterns)
- Temporal patterns (weekday vs weekend, etc.)

Author: FoodBridge AI Team
Version: 2.0.0 (PyTorch)
=============================================================================
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple, Optional
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score
)
import json
import logging
from pathlib import Path

import torch
import torch.nn as nn

from config import (
    MODEL_CONFIG,
    MODELS_DIR,
    LOGS_DIR,
    DATA_DIR,
    EVALUATION_RESULTS_PATH,
    NGO_CONFIGS
)
from data_preprocessing import load_processed_data, FeatureScaler
from lstm_model import load_model, get_device

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# METRIC FUNCTIONS
# =============================================================================

def calculate_mse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Mean Squared Error."""
    return float(mean_squared_error(y_true.flatten(), y_pred.flatten()))


def calculate_mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Mean Absolute Error."""
    return float(mean_absolute_error(y_true.flatten(), y_pred.flatten()))


def calculate_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Root Mean Squared Error."""
    return float(np.sqrt(mean_squared_error(y_true.flatten(), y_pred.flatten())))


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray, epsilon: float = 1e-8) -> float:
    """
    Calculate Mean Absolute Percentage Error.
    
    Args:
        y_true: True values
        y_pred: Predicted values
        epsilon: Small value to avoid division by zero
    """
    y_true_flat = y_true.flatten()
    y_pred_flat = y_pred.flatten()
    
    # Avoid division by zero
    mask = np.abs(y_true_flat) > epsilon
    if not np.any(mask):
        return float('inf')
    
    return float(100 * np.mean(np.abs((y_true_flat[mask] - y_pred_flat[mask]) / y_true_flat[mask])))


def calculate_r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate R² (Coefficient of Determination)."""
    return float(r2_score(y_true.flatten(), y_pred.flatten()))


def calculate_all_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Calculate all evaluation metrics.
    
    Args:
        y_true: True values
        y_pred: Predicted values
        
    Returns:
        Dictionary of metrics
    """
    return {
        'mse': calculate_mse(y_true, y_pred),
        'mae': calculate_mae(y_true, y_pred),
        'rmse': calculate_rmse(y_true, y_pred),
        'mape': calculate_mape(y_true, y_pred),
        'r2': calculate_r2(y_true, y_pred)
    }


# =============================================================================
# PREDICTION HELPER
# =============================================================================

def predict_with_model(
    model: nn.Module,
    X: np.ndarray,
    device: torch.device = None
) -> np.ndarray:
    """
    Make predictions using PyTorch model.
    
    Args:
        model: Trained PyTorch model
        X: Input data
        device: Device to use
        
    Returns:
        Predictions as numpy array
    """
    device = device or get_device()
    model.eval()
    
    X_tensor = torch.FloatTensor(X).to(device)
    
    with torch.no_grad():
        predictions = model(X_tensor)
    
    return predictions.cpu().numpy()


# =============================================================================
# EVALUATION FUNCTIONS
# =============================================================================

def evaluate_model_on_test_set(
    model: nn.Module,
    scaler: FeatureScaler
) -> Dict:
    """
    Evaluate model on the test set.
    
    Args:
        model: Trained PyTorch model
        scaler: Fitted scaler for inverse transform
        
    Returns:
        Dictionary with evaluation results
    """
    logger.info("=" * 60)
    logger.info("Evaluating Model on Test Set")
    logger.info("=" * 60)
    
    # Load data
    splits, _ = load_processed_data()
    X_test, y_test = splits['X_test'], splits['y_test']
    
    logger.info(f"Test set size: {len(X_test)} samples")
    
    # Make predictions
    y_pred = predict_with_model(model, X_test)
    
    # Calculate metrics on normalized data
    normalized_metrics = calculate_all_metrics(y_test, y_pred)
    
    # Inverse transform to original scale
    y_test_original = scaler.inverse_transform_target(y_test.flatten()).reshape(y_test.shape)
    y_pred_original = scaler.inverse_transform_target(y_pred.flatten()).reshape(y_pred.shape)
    
    # Calculate metrics on original scale
    original_metrics = calculate_all_metrics(y_test_original, y_pred_original)
    
    results = {
        'normalized_metrics': normalized_metrics,
        'original_scale_metrics': original_metrics,
        'test_size': len(X_test),
        'y_test': y_test.tolist(),
        'y_pred': y_pred.tolist()
    }
    
    logger.info("\nNormalized Scale Metrics:")
    for k, v in normalized_metrics.items():
        logger.info(f"  {k.upper()}: {v:.6f}")
    
    logger.info("\nOriginal Scale Metrics:")
    for k, v in original_metrics.items():
        logger.info(f"  {k.upper()}: {v:.6f}")
    
    return results


def evaluate_per_forecast_day(
    model: nn.Module,
    scaler: FeatureScaler
) -> Dict:
    """
    Evaluate model performance for each day in the forecast horizon.
    
    Academic Note:
        Forecast accuracy typically decreases as the horizon increases.
        This analysis helps understand how far ahead we can reliably predict.
    
    Args:
        model: Trained model
        scaler: Fitted scaler
        
    Returns:
        Dictionary with per-day metrics
    """
    logger.info("\n" + "=" * 60)
    logger.info("Per-Day Forecast Analysis")
    logger.info("=" * 60)
    
    splits, _ = load_processed_data()
    X_test, y_test = splits['X_test'], splits['y_test']
    
    y_pred = predict_with_model(model, X_test)
    
    # Inverse transform
    y_test_orig = scaler.inverse_transform_target(y_test.flatten()).reshape(y_test.shape)
    y_pred_orig = scaler.inverse_transform_target(y_pred.flatten()).reshape(y_pred.shape)
    
    per_day_metrics = {}
    
    for day in range(y_test.shape[1]):
        y_true_day = y_test_orig[:, day]
        y_pred_day = y_pred_orig[:, day]
        
        metrics = calculate_all_metrics(y_true_day, y_pred_day)
        per_day_metrics[f'day_{day + 1}'] = metrics
        
        logger.info(f"Day {day + 1}: MAE={metrics['mae']:.2f}, RMSE={metrics['rmse']:.2f}, R²={metrics['r2']:.3f}")
    
    return per_day_metrics


def evaluate_per_ngo(
    model: nn.Module,
    scaler: FeatureScaler
) -> Dict:
    """
    Evaluate model performance for each NGO separately.
    
    Academic Note:
        Different NGOs may have different prediction difficulty based on
        their demand patterns (volatility, seasonality, etc.)
    
    Args:
        model: Trained model
        scaler: Fitted scaler
        
    Returns:
        Dictionary with per-NGO metrics
    """
    logger.info("\n" + "=" * 60)
    logger.info("Per-NGO Performance Analysis")
    logger.info("=" * 60)
    
    splits, _ = load_processed_data()
    X_test, y_test = splits['X_test'], splits['y_test']
    ngo_ids_test = splits.get('ngo_ids_test', None)
    
    if ngo_ids_test is None:
        logger.warning("NGO IDs not available in test split")
        return {}
    
    y_pred = predict_with_model(model, X_test)
    
    # Inverse transform
    y_test_orig = scaler.inverse_transform_target(y_test.flatten()).reshape(y_test.shape)
    y_pred_orig = scaler.inverse_transform_target(y_pred.flatten()).reshape(y_pred.shape)
    
    per_ngo_metrics = {}
    
    for ngo_id in sorted(set(ngo_ids_test)):
        mask = [i for i, n in enumerate(ngo_ids_test) if n == ngo_id]
        
        y_true_ngo = y_test_orig[mask]
        y_pred_ngo = y_pred_orig[mask]
        
        metrics = calculate_all_metrics(y_true_ngo, y_pred_ngo)
        per_ngo_metrics[ngo_id] = metrics
        
        logger.info(f"{ngo_id}: MAE={metrics['mae']:.2f}, RMSE={metrics['rmse']:.2f}, R²={metrics['r2']:.3f}")
    
    return per_ngo_metrics


# =============================================================================
# VISUALIZATION FUNCTIONS
# =============================================================================

def plot_predictions_vs_actual(
    model: nn.Module,
    scaler: FeatureScaler,
    num_samples: int = 10,
    save_path: Optional[Path] = None
):
    """
    Plot predicted vs actual values for sample sequences.
    
    Args:
        model: Trained model
        scaler: Fitted scaler
        num_samples: Number of samples to plot
        save_path: Path to save plot
    """
    splits, _ = load_processed_data()
    X_test, y_test = splits['X_test'], splits['y_test']
    
    # Select random samples
    indices = np.random.choice(len(X_test), min(num_samples, len(X_test)), replace=False)
    
    y_pred = predict_with_model(model, X_test[indices])
    
    # Inverse transform
    y_test_samples = scaler.inverse_transform_target(y_test[indices].flatten()).reshape(-1, y_test.shape[1])
    y_pred_samples = scaler.inverse_transform_target(y_pred.flatten()).reshape(-1, y_pred.shape[1])
    
    # Create subplots
    fig, axes = plt.subplots(2, 5, figsize=(20, 8))
    axes = axes.flatten()
    
    for i, (y_true, y_pred_i) in enumerate(zip(y_test_samples, y_pred_samples)):
        ax = axes[i]
        days = range(1, len(y_true) + 1)
        
        ax.plot(days, y_true, 'b-o', label='Actual', linewidth=2, markersize=6)
        ax.plot(days, y_pred_i, 'r--s', label='Predicted', linewidth=2, markersize=6)
        
        ax.set_xlabel('Forecast Day')
        ax.set_ylabel('Food Demand')
        ax.set_title(f'Sample {i + 1}')
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.3)
    
    plt.suptitle('Predictions vs Actual - Test Set Samples', fontsize=14, y=1.02)
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        logger.info(f"Saved predictions plot to {save_path}")
    
    plt.show()


def plot_error_distribution(
    model: nn.Module,
    scaler: FeatureScaler,
    save_path: Optional[Path] = None
):
    """
    Plot the distribution of prediction errors.
    
    Args:
        model: Trained model
        scaler: Fitted scaler
        save_path: Path to save plot
    """
    splits, _ = load_processed_data()
    X_test, y_test = splits['X_test'], splits['y_test']
    
    y_pred = predict_with_model(model, X_test)
    
    # Inverse transform
    y_test_orig = scaler.inverse_transform_target(y_test.flatten())
    y_pred_orig = scaler.inverse_transform_target(y_pred.flatten())
    
    errors = y_test_orig - y_pred_orig
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Histogram
    axes[0].hist(errors, bins=50, edgecolor='black', alpha=0.7)
    axes[0].axvline(x=0, color='red', linestyle='--', linewidth=2, label='Zero Error')
    axes[0].axvline(x=np.mean(errors), color='green', linestyle='-', linewidth=2, 
                    label=f'Mean: {np.mean(errors):.2f}')
    axes[0].set_xlabel('Prediction Error', fontsize=12)
    axes[0].set_ylabel('Frequency', fontsize=12)
    axes[0].set_title('Error Distribution', fontsize=14)
    axes[0].legend()
    
    # Q-Q plot (scatter of actual vs predicted)
    axes[1].scatter(y_test_orig, y_pred_orig, alpha=0.3, s=10)
    
    # Perfect prediction line
    min_val = min(y_test_orig.min(), y_pred_orig.min())
    max_val = max(y_test_orig.max(), y_pred_orig.max())
    axes[1].plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect Prediction')
    
    axes[1].set_xlabel('Actual Values', fontsize=12)
    axes[1].set_ylabel('Predicted Values', fontsize=12)
    axes[1].set_title('Actual vs Predicted', fontsize=14)
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        logger.info(f"Saved error distribution plot to {save_path}")
    
    plt.show()


def plot_per_day_metrics(
    per_day_metrics: Dict,
    save_path: Optional[Path] = None
):
    """
    Plot metrics across forecast horizon days.
    
    Args:
        per_day_metrics: Dictionary from evaluate_per_forecast_day
        save_path: Path to save plot
    """
    days = []
    mae_values = []
    rmse_values = []
    r2_values = []
    
    for day_key in sorted(per_day_metrics.keys()):
        days.append(int(day_key.split('_')[1]))
        mae_values.append(per_day_metrics[day_key]['mae'])
        rmse_values.append(per_day_metrics[day_key]['rmse'])
        r2_values.append(per_day_metrics[day_key]['r2'])
    
    fig, axes = plt.subplots(1, 3, figsize=(15, 4))
    
    # MAE
    axes[0].bar(days, mae_values, color='steelblue', edgecolor='black')
    axes[0].set_xlabel('Forecast Day')
    axes[0].set_ylabel('MAE')
    axes[0].set_title('MAE by Forecast Day')
    axes[0].set_xticks(days)
    
    # RMSE
    axes[1].bar(days, rmse_values, color='coral', edgecolor='black')
    axes[1].set_xlabel('Forecast Day')
    axes[1].set_ylabel('RMSE')
    axes[1].set_title('RMSE by Forecast Day')
    axes[1].set_xticks(days)
    
    # R²
    axes[2].bar(days, r2_values, color='seagreen', edgecolor='black')
    axes[2].set_xlabel('Forecast Day')
    axes[2].set_ylabel('R²')
    axes[2].set_title('R² by Forecast Day')
    axes[2].set_xticks(days)
    axes[2].set_ylim(0, 1)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        logger.info(f"Saved per-day metrics plot to {save_path}")
    
    plt.show()


# =============================================================================
# COMPREHENSIVE EVALUATION
# =============================================================================

def run_full_evaluation(
    model_name: str = 'lstm_model_latest',
    save_plots: bool = True
) -> Dict:
    """
    Run comprehensive model evaluation.
    
    Args:
        model_name: Name of the model to load
        save_plots: Whether to save plots
        
    Returns:
        Dictionary with all evaluation results
    """
    logger.info("=" * 70)
    logger.info("FoodBridge AI - Comprehensive Model Evaluation")
    logger.info("=" * 70)
    
    # Load model
    _, scaler = load_processed_data()
    
    # Get input size from data
    splits, _ = load_processed_data()
    input_size = splits['X_train'].shape[2]
    
    model = load_model(model_name, input_size=input_size)
    logger.info(f"Loaded model: {model_name}")
    
    # Run evaluations
    results = {}
    
    # Overall metrics
    results['overall'] = evaluate_model_on_test_set(model, scaler)
    
    # Per-day metrics
    results['per_day'] = evaluate_per_forecast_day(model, scaler)
    
    # Per-NGO metrics
    results['per_ngo'] = evaluate_per_ngo(model, scaler)
    
    # Save results
    save_results = {
        'overall_normalized': results['overall']['normalized_metrics'],
        'overall_original_scale': results['overall']['original_scale_metrics'],
        'per_day': results['per_day'],
        'per_ngo': results['per_ngo']
    }
    
    with open(EVALUATION_RESULTS_PATH, 'w') as f:
        json.dump(save_results, f, indent=2)
    logger.info(f"Saved evaluation results to {EVALUATION_RESULTS_PATH}")
    
    # Generate plots
    if save_plots:
        plot_predictions_vs_actual(
            model, scaler,
            save_path=LOGS_DIR / 'predictions_vs_actual.png'
        )
        
        plot_error_distribution(
            model, scaler,
            save_path=LOGS_DIR / 'error_distribution.png'
        )
        
        plot_per_day_metrics(
            results['per_day'],
            save_path=LOGS_DIR / 'per_day_metrics.png'
        )
    
    return results


def generate_evaluation_report(results: Dict) -> str:
    """
    Generate evaluation report.
    
    Args:
        results: Evaluation results dictionary
        
    Returns:
        Report string
    """
    overall = results['overall']['original_scale_metrics']
    
    report = f"""
================================================================================
                      FOODBRIDGE AI - EVALUATION REPORT
================================================================================

OVERALL TEST SET PERFORMANCE (Original Scale)
---------------------------------------------
  Mean Squared Error (MSE):       {overall['mse']:.4f}
  Mean Absolute Error (MAE):      {overall['mae']:.4f}
  Root Mean Squared Error (RMSE): {overall['rmse']:.4f}
  Mean Absolute % Error (MAPE):   {overall['mape']:.2f}%
  R² Score:                       {overall['r2']:.4f}

INTERPRETATION
--------------
  • The MAE of {overall['mae']:.2f} means predictions are, on average,
    {overall['mae']:.2f} units away from actual demand.
    
  • The R² of {overall['r2']:.2f} indicates the model explains {overall['r2']*100:.1f}%
    of the variance in food demand.
    
  • MAPE of {overall['mape']:.2f}% suggests the average relative error is
    approximately {overall['mape']:.1f}%.

PER-DAY FORECAST PERFORMANCE
----------------------------
"""
    
    for day_key in sorted(results['per_day'].keys()):
        day_metrics = results['per_day'][day_key]
        day_num = day_key.split('_')[1]
        report += f"  Day {day_num}: MAE={day_metrics['mae']:.2f}, R²={day_metrics['r2']:.3f}\n"
    
    report += "\nPER-NGO PERFORMANCE\n-------------------\n"
    
    for ngo_id in sorted(results['per_ngo'].keys()):
        ngo_metrics = results['per_ngo'][ngo_id]
        report += f"  {ngo_id}: MAE={ngo_metrics['mae']:.2f}, R²={ngo_metrics['r2']:.3f}\n"
    
    report += """
================================================================================
"""
    return report


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("FoodBridge AI - Model Evaluation")
    print("=" * 70)
    
    # Run full evaluation
    results = run_full_evaluation(save_plots=True)
    
    # Generate and print report
    report = generate_evaluation_report(results)
    print(report)
    
    # Save report
    report_path = LOGS_DIR / 'evaluation_report.txt'
    with open(report_path, 'w') as f:
        f.write(report)
    print(f"Report saved to {report_path}")
    
    print("\n✓ Evaluation complete!")
