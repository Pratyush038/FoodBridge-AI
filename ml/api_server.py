"""
FoodBridge AI - FastAPI Server for LSTM Model Predictions
=========================================================

This server exposes the trained LSTM model via REST API endpoints.
Run with: uvicorn api_server:app --reload --port 8000
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json

# Import our ML modules
from src.config import MODEL_CONFIG, NGO_CONFIGS, MODELS_DIR, OUTPUTS_DIR
from src.lstm_model import LSTMModel, get_device
from src.data_preprocessing import load_processed_data

app = FastAPI(
    title="FoodBridge AI - LSTM Prediction API",
    description="API for food demand forecasting using LSTM neural network",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and scaler
model = None
scaler = None
device = None
training_history = None


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class PredictionResponse(BaseModel):
    ngo_id: str
    ngo_name: str
    predictions: List[Dict]
    summary: Dict


class TrainingMetrics(BaseModel):
    epochs_trained: int
    final_train_loss: float
    final_val_loss: float
    final_train_mae: float
    final_val_mae: float


class ModelInfo(BaseModel):
    model_type: str
    total_parameters: int
    sequence_length: int
    forecast_horizon: int
    device: str


# =============================================================================
# STARTUP EVENT - LOAD MODEL
# =============================================================================

@app.on_event("startup")
async def load_model():
    """Load the trained LSTM model on startup."""
    global model, scaler, device, training_history
    
    device = get_device()
    print(f"Using device: {device}")
    
    # Load scaler
    try:
        _, scaler = load_processed_data()
        print("✓ Loaded scaler")
    except Exception as e:
        print(f"Warning: Could not load scaler: {e}")
        scaler = None
    
    # Load model
    model_path = OUTPUTS_DIR / 'lstm_demand_model.pt'
    if not model_path.exists():
        model_path = MODELS_DIR / 'lstm_model_latest.pt'
    
    if model_path.exists():
        try:
            checkpoint = torch.load(model_path, map_location=device, weights_only=False)
            
            # Get input size
            input_size = 23  # Default
            if scaler is not None:
                splits, _ = load_processed_data()
                input_size = splits['X_train'].shape[2]
            
            model = LSTMModel(input_size=input_size)
            model.load_state_dict(checkpoint['model_state_dict'])
            model.to(device)
            model.eval()
            print(f"✓ Loaded model from {model_path}")
        except Exception as e:
            print(f"Error loading model: {e}")
            model = None
    else:
        print(f"Warning: No model found at {model_path}")
        model = None
    
    # Load training history
    history_path = OUTPUTS_DIR / 'training_history.json'
    if history_path.exists():
        with open(history_path, 'r') as f:
            training_history = json.load(f)
        print("✓ Loaded training history")


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "running",
        "model_loaded": model is not None,
        "service": "FoodBridge AI LSTM Prediction API"
    }


@app.get("/api/model-info")
async def get_model_info():
    """Get information about the loaded model."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    total_params = sum(p.numel() for p in model.parameters())
    
    return {
        "model_type": "LSTM",
        "total_parameters": total_params,
        "sequence_length": MODEL_CONFIG.sequence_length,
        "forecast_horizon": MODEL_CONFIG.forecast_horizon,
        "lstm_units": [MODEL_CONFIG.lstm_units_1, MODEL_CONFIG.lstm_units_2],
        "dense_units": MODEL_CONFIG.dense_units,
        "dropout_rate": MODEL_CONFIG.dropout_rate,
        "device": str(device)
    }


@app.get("/api/training-history")
async def get_training_history():
    """Get training history with loss and MAE curves."""
    if training_history is None:
        # Try to load from file
        history_path = OUTPUTS_DIR / 'training_history.json'
        if history_path.exists():
            with open(history_path, 'r') as f:
                history = json.load(f)
            return history
        raise HTTPException(status_code=404, detail="Training history not found")
    
    return training_history


@app.get("/api/evaluation-metrics")
async def get_evaluation_metrics():
    """Get model evaluation metrics."""
    eval_path = OUTPUTS_DIR / 'evaluation_results.json'
    
    if not eval_path.exists():
        # Return metrics from training history if available
        if training_history:
            return {
                "source": "training_history",
                "metrics": training_history.get('final_metrics', {}),
                "note": "Full evaluation not run yet"
            }
        raise HTTPException(status_code=404, detail="Evaluation results not found")
    
    with open(eval_path, 'r') as f:
        return json.load(f)


@app.get("/api/predictions")
async def get_all_predictions():
    """Get predictions for all NGOs."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Try to load cached predictions
    pred_path = OUTPUTS_DIR / 'predictions.json'
    if pred_path.exists():
        with open(pred_path, 'r') as f:
            return json.load(f)
    
    # Generate new predictions
    return await generate_predictions()


@app.get("/api/predictions/{ngo_id}")
async def get_ngo_prediction(ngo_id: str):
    """Get prediction for a specific NGO."""
    predictions = await get_all_predictions()
    
    if ngo_id not in predictions.get('ngos', {}):
        raise HTTPException(status_code=404, detail=f"NGO {ngo_id} not found")
    
    return predictions['ngos'][ngo_id]


@app.post("/api/generate-predictions")
async def generate_predictions():
    """Generate fresh predictions using the model."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if scaler is None:
        raise HTTPException(status_code=503, detail="Scaler not loaded")
    
    from src.generate_synthetic_data import generate_ngo_daily_data
    from src.data_preprocessing import create_temporal_features, get_feature_columns
    
    base_date = datetime.now().date()
    predictions_output = {
        'generated_at': datetime.now().isoformat(),
        'forecast_start': str(base_date),
        'forecast_horizon_days': MODEL_CONFIG.forecast_horizon,
        'model_version': '2.0.0',
        'ngos': {}
    }
    
    for ngo_id, ngo_config in NGO_CONFIGS.items():
        try:
            # Generate historical data
            start_date = base_date - timedelta(days=MODEL_CONFIG.sequence_length + 5)
            ngo_data = generate_ngo_daily_data(
                ngo_id=ngo_id,
                ngo_config=ngo_config,
                start_date=start_date,
                end_date=base_date
            )
            
            # Prepare for inference
            ngo_data = ngo_data.sort_values('date').tail(MODEL_CONFIG.sequence_length)
            ngo_data = create_temporal_features(ngo_data)
            
            feature_cols = get_feature_columns()
            scaled_features = scaler.transform(ngo_data, feature_cols)
            
            # Reshape and predict
            X = scaled_features.reshape(1, MODEL_CONFIG.sequence_length, -1)
            X_tensor = torch.FloatTensor(X).to(device)
            
            with torch.no_grad():
                y_pred_scaled = model(X_tensor)
            
            y_pred = scaler.inverse_transform_target(y_pred_scaled.cpu().numpy().flatten())
            
            # Format predictions
            daily_forecasts = []
            for day_idx in range(len(y_pred)):
                forecast_date = base_date + timedelta(days=day_idx + 1)
                demand = float(y_pred[day_idx])
                
                # Risk scoring
                ratio = demand / ngo_config.base_demand
                if ratio <= 0.8:
                    risk_level = 'LOW'
                    risk_score = max(0, ratio * 25)
                elif ratio <= 1.2:
                    risk_level = 'MEDIUM'
                    risk_score = 35 + (ratio - 0.8) * 62.5
                elif ratio <= 1.5:
                    risk_level = 'HIGH'
                    risk_score = 60 + (ratio - 1.2) * 100
                else:
                    risk_level = 'CRITICAL'
                    risk_score = min(100, 90 + (ratio - 1.5) * 20)
                
                daily_forecasts.append({
                    'date': str(forecast_date),
                    'day_index': day_idx + 1,
                    'predicted_demand': round(demand, 2),
                    'lower_bound_95': round(demand * 0.85, 2),
                    'upper_bound_95': round(demand * 1.15, 2),
                    'risk_score': round(risk_score, 1),
                    'risk_level': risk_level
                })
            
            avg_demand = float(np.mean(y_pred))
            predictions_output['ngos'][ngo_id] = {
                'ngo_name': ngo_config.name,
                'daily_forecasts': daily_forecasts,
                'summary': {
                    'average_daily_demand': round(avg_demand, 2),
                    'max_daily_demand': round(float(np.max(y_pred)), 2),
                    'min_daily_demand': round(float(np.min(y_pred)), 2),
                    'total_7day_demand': round(float(np.sum(y_pred)), 2),
                    'baseline_demand': ngo_config.base_demand
                }
            }
            
        except Exception as e:
            print(f"Error predicting for {ngo_id}: {e}")
            predictions_output['ngos'][ngo_id] = {
                'ngo_name': ngo_config.name,
                'error': str(e)
            }
    
    # Save predictions
    with open(OUTPUTS_DIR / 'predictions.json', 'w') as f:
        json.dump(predictions_output, f, indent=2)
    
    return predictions_output


@app.get("/api/ngo-list")
async def get_ngo_list():
    """Get list of all NGOs with their configurations."""
    return {
        ngo_id: {
            'name': config.name,
            'base_demand': config.base_demand,
            'volatility': config.volatility,
            'trend': config.trend
        }
        for ngo_id, config in NGO_CONFIGS.items()
    }


@app.get("/api/sample-predictions")
async def get_sample_predictions():
    """Get sample predictions visualization data from test set."""
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model or scaler not loaded")
    
    try:
        splits, _ = load_processed_data()
        X_test, y_test = splits['X_test'], splits['y_test']
        
        # Get 10 random samples
        np.random.seed(42)
        indices = np.random.choice(len(X_test), min(10, len(X_test)), replace=False)
        
        X_samples = X_test[indices]
        y_true = y_test[indices]
        
        # Predict
        X_tensor = torch.FloatTensor(X_samples).to(device)
        with torch.no_grad():
            y_pred_scaled = model(X_tensor)
        
        y_pred = y_pred_scaled.cpu().numpy()
        
        # Inverse transform
        y_true_orig = scaler.inverse_transform_target(y_true.flatten()).reshape(y_true.shape)
        y_pred_orig = scaler.inverse_transform_target(y_pred.flatten()).reshape(y_pred.shape)
        
        samples = []
        for i in range(len(indices)):
            samples.append({
                'sample_id': int(indices[i]),
                'actual': [round(float(v), 2) for v in y_true_orig[i]],
                'predicted': [round(float(v), 2) for v in y_pred_orig[i]],
                'days': list(range(1, 8))
            })
        
        return {'samples': samples}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/per-day-metrics")
async def get_per_day_metrics():
    """Get evaluation metrics for each forecast day."""
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model or scaler not loaded")
    
    try:
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        
        splits, _ = load_processed_data()
        X_test, y_test = splits['X_test'], splits['y_test']
        
        X_tensor = torch.FloatTensor(X_test).to(device)
        with torch.no_grad():
            y_pred_scaled = model(X_tensor)
        
        y_pred = y_pred_scaled.cpu().numpy()
        
        # Inverse transform
        y_test_orig = scaler.inverse_transform_target(y_test.flatten()).reshape(y_test.shape)
        y_pred_orig = scaler.inverse_transform_target(y_pred.flatten()).reshape(y_pred.shape)
        
        per_day = []
        for day in range(y_test.shape[1]):
            y_true_day = y_test_orig[:, day]
            y_pred_day = y_pred_orig[:, day]
            
            per_day.append({
                'day': day + 1,
                'mae': round(float(mean_absolute_error(y_true_day, y_pred_day)), 2),
                'rmse': round(float(np.sqrt(mean_squared_error(y_true_day, y_pred_day))), 2),
                'r2': round(float(r2_score(y_true_day, y_pred_day)), 4)
            })
        
        return {'per_day_metrics': per_day}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
