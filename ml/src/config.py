"""
=============================================================================
FoodBridge AI - ML Pipeline Configuration
=============================================================================

This module centralizes all configuration parameters for the LSTM-based
Hunger Hotspot Prediction system.

Academic Note:
    Configuration separation is a best practice in ML engineering. It allows
    for reproducibility and easy hyperparameter tuning without code changes.

Author: FoodBridge AI Team
Version: 1.0.0
=============================================================================
"""

import os
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass, field


# =============================================================================
# PATH CONFIGURATION
# =============================================================================

# Base directory for ML pipeline
ML_BASE_DIR = Path(__file__).parent.parent
DATA_DIR = ML_BASE_DIR / "data"
MODELS_DIR = ML_BASE_DIR / "models"
LOGS_DIR = ML_BASE_DIR / "logs"
OUTPUTS_DIR = ML_BASE_DIR / "outputs"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# File paths
SYNTHETIC_DATA_PATH = DATA_DIR / "synthetic_ngo_demand.csv"
PROCESSED_DATA_PATH = DATA_DIR / "processed_sequences.npz"
MODEL_PATH = MODELS_DIR / "lstm_demand_model.keras"
SCALER_PATH = MODELS_DIR / "feature_scaler.joblib"
PREDICTIONS_PATH = DATA_DIR / "predictions.json"


# =============================================================================
# NGO CONFIGURATION
# =============================================================================

@dataclass
class NGOConfig:
    """Configuration for a single NGO's demand characteristics."""
    ngo_id: str
    name: str
    base_demand: float  # Average daily food demand (kg)
    volatility: float   # Standard deviation as fraction of base
    weekly_pattern: List[float]  # Multipliers for Mon-Sun
    trend: float  # Long-term trend (positive = increasing demand)
    
    
# Define 5 NGOs with distinct characteristics
# These profiles are designed to simulate realistic NGO behavior patterns

NGO_CONFIGS: List[NGOConfig] = [
    NGOConfig(
        ngo_id="NGO_1",
        name="Hope Foundation",
        base_demand=150.0,  # kg/day
        volatility=0.25,
        weekly_pattern=[1.0, 0.9, 0.85, 0.9, 1.1, 1.3, 1.2],  # Higher weekends
        trend=0.0005  # Slight upward trend
    ),
    NGOConfig(
        ngo_id="NGO_2", 
        name="Food For All",
        base_demand=200.0,
        volatility=0.30,
        weekly_pattern=[1.2, 1.1, 1.0, 0.95, 0.9, 0.85, 0.9],  # Higher early week
        trend=-0.0002  # Slight downward (improving efficiency)
    ),
    NGOConfig(
        ngo_id="NGO_3",
        name="Annapurna Trust",
        base_demand=100.0,
        volatility=0.20,
        weekly_pattern=[0.9, 0.95, 1.0, 1.0, 1.05, 1.1, 1.0],  # Relatively stable
        trend=0.0008  # Growing organization
    ),
    NGOConfig(
        ngo_id="NGO_4",
        name="Community Kitchen",
        base_demand=250.0,
        volatility=0.35,
        weekly_pattern=[0.8, 0.85, 0.9, 1.0, 1.2, 1.4, 1.35],  # Strong weekend spike
        trend=0.0003
    ),
    NGOConfig(
        ngo_id="NGO_5",
        name="Rural Aid Network",
        base_demand=80.0,
        volatility=0.40,  # Higher volatility (rural logistics)
        weekly_pattern=[1.1, 1.0, 0.9, 0.85, 0.9, 1.1, 1.15],
        trend=0.0010  # Rapid expansion
    ),
]

# NGO ID to index mapping for model
NGO_ID_MAP: Dict[str, int] = {cfg.ngo_id: idx for idx, cfg in enumerate(NGO_CONFIGS)}
INDEX_TO_NGO: Dict[int, str] = {idx: cfg.ngo_id for idx, cfg in enumerate(NGO_CONFIGS)}


# =============================================================================
# DATA GENERATION CONFIGURATION
# =============================================================================

@dataclass
class DataGenerationConfig:
    """Parameters for synthetic data generation."""
    
    # Time range
    start_date: str = "2024-01-01"
    end_date: str = "2025-01-15"  # ~12.5 months of data
    
    # Seasonal factors (monthly multipliers)
    # Higher in winter months (more demand), lower in summer
    seasonal_factors: List[float] = field(default_factory=lambda: [
        1.15,  # January - Winter peak
        1.10,  # February
        1.00,  # March - Transition
        0.95,  # April
        0.90,  # May - Summer low
        0.85,  # June - Monsoon start
        0.90,  # July - Monsoon
        0.95,  # August
        1.00,  # September - Post monsoon
        1.10,  # October - Festival season
        1.20,  # November - Diwali period
        1.25,  # December - Winter peak
    ])
    
    # Special event probability (festivals, emergencies)
    special_event_probability: float = 0.05
    special_event_multiplier_range: tuple = (1.5, 2.5)
    
    # Random seed for reproducibility
    random_seed: int = 42


DATA_GEN_CONFIG = DataGenerationConfig()


# =============================================================================
# MODEL CONFIGURATION
# =============================================================================

@dataclass
class LSTMModelConfig:
    """
    Hyperparameters for the LSTM model.
    
    Academic Note:
        These parameters are chosen based on common practices for
        time-series forecasting with moderate-sized datasets:
        
        - sequence_length: 14-30 days captures weekly patterns
        - lstm_units: 64-128 is sufficient for simple patterns
        - dropout: 0.2-0.3 prevents overfitting
        - learning_rate: 0.001 is Adam's default, works well
    """
    
    # Input/Output dimensions
    sequence_length: int = 21  # Days of history to consider
    forecast_horizon: int = 7  # Days to predict ahead
    
    # Feature configuration
    # Features: total_food_requested, number_of_requests, urgency_score,
    #           day_of_week (7 one-hot), month (12 one-hot), is_weekend
    num_features: int = 23  # 3 base + 7 day + 12 month + 1 weekend
    
    # LSTM Architecture
    lstm_units_1: int = 64   # First LSTM layer units
    lstm_units_2: int = 32   # Second LSTM layer units
    dense_units: int = 16    # Dense layer before output
    dropout_rate: float = 0.2
    
    # Training parameters
    batch_size: int = 32
    epochs: int = 100
    learning_rate: float = 0.001
    early_stopping_patience: int = 15
    reduce_lr_patience: int = 5
    
    # Validation split
    validation_split: float = 0.2
    test_split: float = 0.1
    
    # Loss function
    loss: str = "mse"  # Mean Squared Error for regression
    
    # Metrics
    metrics: List[str] = field(default_factory=lambda: ["mae", "mape"])


MODEL_CONFIG = LSTMModelConfig()


# =============================================================================
# PREDICTION & RISK CONFIGURATION
# =============================================================================

@dataclass
class PredictionConfig:
    """Configuration for prediction output and risk assessment."""
    
    # Risk level thresholds (based on predicted demand percentile)
    high_risk_percentile: float = 75.0
    medium_risk_percentile: float = 50.0
    
    # Confidence scoring based on prediction variance
    high_confidence_threshold: float = 0.15  # CV < 15%
    medium_confidence_threshold: float = 0.30  # CV < 30%
    
    # Output formatting
    decimal_places: int = 2
    
    # Cache validity (hours)
    prediction_cache_hours: int = 6


PREDICTION_CONFIG = PredictionConfig()


# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_LEVEL = "INFO"


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_ngo_config(ngo_id: str) -> NGOConfig:
    """Get configuration for a specific NGO."""
    for cfg in NGO_CONFIGS:
        if cfg.ngo_id == ngo_id:
            return cfg
    raise ValueError(f"Unknown NGO ID: {ngo_id}")


def print_config_summary():
    """Print a summary of current configuration."""
    print("=" * 60)
    print("FoodBridge AI - ML Configuration Summary")
    print("=" * 60)
    print(f"\nData Generation:")
    print(f"  Date Range: {DATA_GEN_CONFIG.start_date} to {DATA_GEN_CONFIG.end_date}")
    print(f"  Random Seed: {DATA_GEN_CONFIG.random_seed}")
    
    print(f"\nNGO Profiles:")
    for cfg in NGO_CONFIGS:
        print(f"  {cfg.ngo_id}: {cfg.name}")
        print(f"    Base Demand: {cfg.base_demand} kg/day")
        print(f"    Volatility: {cfg.volatility*100:.0f}%")
    
    print(f"\nModel Architecture:")
    print(f"  Sequence Length: {MODEL_CONFIG.sequence_length} days")
    print(f"  Forecast Horizon: {MODEL_CONFIG.forecast_horizon} days")
    print(f"  LSTM Layers: {MODEL_CONFIG.lstm_units_1} → {MODEL_CONFIG.lstm_units_2}")
    print(f"  Dropout: {MODEL_CONFIG.dropout_rate}")
    
    print(f"\nTraining:")
    print(f"  Batch Size: {MODEL_CONFIG.batch_size}")
    print(f"  Max Epochs: {MODEL_CONFIG.epochs}")
    print(f"  Learning Rate: {MODEL_CONFIG.learning_rate}")
    print("=" * 60)


if __name__ == "__main__":
    print_config_summary()
