"""
=============================================================================
FoodBridge AI - Data Preprocessing Module
=============================================================================

This module handles all data preprocessing steps required to transform
raw synthetic data into sequences suitable for LSTM training.

Academic Note:
    LSTM models require data in a specific format:
    - Input: 3D tensor of shape (samples, timesteps, features)
    - Output: Depends on task (we use shape (samples, forecast_horizon))
    
    Key preprocessing steps:
    1. Feature engineering (one-hot encoding, scaling)
    2. Sequence creation (sliding window approach)
    3. Train/validation/test splitting
    4. Normalization/standardization

Why Sliding Window?
    LSTMs learn temporal patterns by seeing sequences of past observations.
    A sliding window of N days means:
    - Input: [day_t-N, day_t-N+1, ..., day_t-1]
    - Output: [day_t, day_t+1, ..., day_t+K-1] (K = forecast horizon)

Author: FoodBridge AI Team
Version: 1.0.0
=============================================================================
"""

import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Optional
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import joblib
import logging

from config import (
    MODEL_CONFIG,
    SYNTHETIC_DATA_PATH,
    PROCESSED_DATA_PATH,
    SCALER_PATH,
    NGO_CONFIGS,
    NGO_ID_MAP
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# FEATURE ENGINEERING
# =============================================================================

def create_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create temporal features from the date column.
    
    Academic Note:
        Temporal features help the model learn:
        - Cyclical patterns (weekly, monthly)
        - Seasonal trends
        - Day-specific behaviors
    
    Args:
        df: DataFrame with 'date' column
        
    Returns:
        DataFrame with additional temporal features
    """
    df = df.copy()
    
    # Ensure date is datetime
    df['date'] = pd.to_datetime(df['date'])
    
    # Already have day_of_week and month from generation
    # Add any missing features
    if 'is_weekend' not in df.columns:
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    
    # One-hot encode day of week (7 features)
    for i in range(7):
        df[f'dow_{i}'] = (df['day_of_week'] == i).astype(int)
    
    # One-hot encode month (12 features)
    for i in range(1, 13):
        df[f'month_{i}'] = (df['month'] == i).astype(int)
    
    logger.info("Created temporal features")
    return df


def get_feature_columns() -> List[str]:
    """
    Get the list of feature columns for the LSTM input.
    
    Returns:
        List of column names
    """
    features = [
        # Core features
        'total_food_requested',
        'number_of_requests',
        'urgency_score',
        # Day of week one-hot (7)
        'dow_0', 'dow_1', 'dow_2', 'dow_3', 'dow_4', 'dow_5', 'dow_6',
        # Month one-hot (12)
        'month_1', 'month_2', 'month_3', 'month_4', 'month_5', 'month_6',
        'month_7', 'month_8', 'month_9', 'month_10', 'month_11', 'month_12',
        # Binary
        'is_weekend'
    ]
    return features


def get_target_column() -> str:
    """Get the target column name."""
    return 'total_food_requested'


# =============================================================================
# NORMALIZATION / SCALING
# =============================================================================

class FeatureScaler:
    """
    Handles feature scaling for LSTM input.
    
    Academic Note:
        Scaling is crucial for neural networks because:
        1. Prevents features with large values from dominating
        2. Helps gradient descent converge faster
        3. Prevents numerical instability
        
        We use StandardScaler (z-score normalization) for most features
        and MinMaxScaler for bounded features like urgency_score.
    """
    
    def __init__(self):
        self.scalers: Dict[str, StandardScaler] = {}
        self.target_scaler: StandardScaler = StandardScaler()
        self.fitted = False
        
    def fit(self, df: pd.DataFrame, feature_cols: List[str], target_col: str):
        """
        Fit scalers on training data.
        
        Args:
            df: Training DataFrame
            feature_cols: List of feature column names
            target_col: Target column name
        """
        # Scale each feature independently
        for col in feature_cols:
            if col in df.columns:
                self.scalers[col] = StandardScaler()
                self.scalers[col].fit(df[[col]].values)
        
        # Scale target separately (for inverse transform later)
        self.target_scaler.fit(df[[target_col]].values)
        
        self.fitted = True
        logger.info(f"Fitted scalers for {len(self.scalers)} features")
        
    def transform(self, df: pd.DataFrame, feature_cols: List[str]) -> np.ndarray:
        """
        Transform features using fitted scalers.
        
        Args:
            df: DataFrame to transform
            feature_cols: List of feature column names
            
        Returns:
            Scaled feature array
        """
        if not self.fitted:
            raise RuntimeError("Scaler not fitted. Call fit() first.")
            
        scaled_features = []
        for col in feature_cols:
            if col in self.scalers:
                scaled = self.scalers[col].transform(df[[col]].values)
                scaled_features.append(scaled)
            else:
                # For one-hot encoded columns, no scaling needed
                scaled_features.append(df[[col]].values)
        
        return np.hstack(scaled_features)
    
    def transform_target(self, values: np.ndarray) -> np.ndarray:
        """Scale target values."""
        return self.target_scaler.transform(values.reshape(-1, 1)).flatten()
    
    def inverse_transform_target(self, values: np.ndarray) -> np.ndarray:
        """Inverse transform target values back to original scale."""
        return self.target_scaler.inverse_transform(
            values.reshape(-1, 1)
        ).flatten()
    
    def save(self, filepath: str):
        """Save scaler to disk."""
        joblib.dump({
            'scalers': self.scalers,
            'target_scaler': self.target_scaler,
            'fitted': self.fitted
        }, filepath)
        logger.info(f"Saved scaler to {filepath}")
        
    @classmethod
    def load(cls, filepath: str) -> 'FeatureScaler':
        """Load scaler from disk."""
        data = joblib.load(filepath)
        scaler = cls()
        scaler.scalers = data['scalers']
        scaler.target_scaler = data['target_scaler']
        scaler.fitted = data['fitted']
        logger.info(f"Loaded scaler from {filepath}")
        return scaler


# =============================================================================
# SEQUENCE CREATION
# =============================================================================

def create_sequences(
    data: np.ndarray,
    targets: np.ndarray,
    sequence_length: int,
    forecast_horizon: int
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create input-output sequence pairs for LSTM training.
    
    Academic Note:
        This implements a sliding window approach:
        
        For each valid starting position i:
        - X[i] = data[i : i + sequence_length]       (input sequence)
        - y[i] = targets[i + sequence_length : i + sequence_length + forecast_horizon]
        
        Example with sequence_length=3, forecast_horizon=2:
        Data:    [d0, d1, d2, d3, d4, d5, d6, d7]
        
        Sample 0: X = [d0, d1, d2], y = [d3, d4]
        Sample 1: X = [d1, d2, d3], y = [d4, d5]
        Sample 2: X = [d2, d3, d4], y = [d5, d6]
        ...
    
    Args:
        data: Feature array of shape (num_days, num_features)
        targets: Target array of shape (num_days,)
        sequence_length: Number of days in input sequence
        forecast_horizon: Number of days to predict
        
    Returns:
        Tuple of (X, y) arrays
        - X shape: (num_samples, sequence_length, num_features)
        - y shape: (num_samples, forecast_horizon)
    """
    X, y = [], []
    
    # Calculate valid range
    max_start = len(data) - sequence_length - forecast_horizon + 1
    
    for i in range(max_start):
        # Input sequence
        X.append(data[i : i + sequence_length])
        
        # Target sequence (next forecast_horizon days)
        y.append(targets[i + sequence_length : i + sequence_length + forecast_horizon])
    
    return np.array(X), np.array(y)


def create_sequences_per_ngo(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str,
    scaler: FeatureScaler,
    sequence_length: int,
    forecast_horizon: int
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Create sequences for all NGOs.
    
    Args:
        df: Full DataFrame
        feature_cols: Feature column names
        target_col: Target column name
        scaler: Fitted FeatureScaler
        sequence_length: Input sequence length
        forecast_horizon: Output forecast horizon
        
    Returns:
        Tuple of (X, y, ngo_ids)
        - X: Input sequences
        - y: Target sequences
        - ngo_ids: NGO ID for each sample
    """
    all_X, all_y, all_ngo_ids = [], [], []
    
    for ngo_id in df['ngo_id'].unique():
        ngo_data = df[df['ngo_id'] == ngo_id].sort_values('date').reset_index(drop=True)
        
        # Scale features
        scaled_features = scaler.transform(ngo_data, feature_cols)
        
        # Scale target
        scaled_target = scaler.transform_target(ngo_data[target_col].values)
        
        # Create sequences
        X, y = create_sequences(
            scaled_features,
            scaled_target,
            sequence_length,
            forecast_horizon
        )
        
        all_X.append(X)
        all_y.append(y)
        all_ngo_ids.extend([ngo_id] * len(X))
        
        logger.info(f"Created {len(X)} sequences for {ngo_id}")
    
    return np.vstack(all_X), np.vstack(all_y), all_ngo_ids


# =============================================================================
# TRAIN/VAL/TEST SPLIT
# =============================================================================

def temporal_train_test_split(
    X: np.ndarray,
    y: np.ndarray,
    ngo_ids: List[str],
    val_ratio: float = 0.2,
    test_ratio: float = 0.1
) -> Dict[str, np.ndarray]:
    """
    Split data temporally (not randomly) for time-series.
    
    Academic Note:
        For time-series data, we MUST use temporal splitting:
        - Training data: earliest portion
        - Validation data: middle portion
        - Test data: latest portion
        
        Random splitting would cause data leakage (future data in training).
    
    Args:
        X: Input sequences
        y: Target sequences
        ngo_ids: NGO ID for each sample
        val_ratio: Validation set ratio
        test_ratio: Test set ratio
        
    Returns:
        Dictionary with train/val/test splits
    """
    # Group by NGO and split each NGO's data temporally
    unique_ngos = sorted(set(ngo_ids))
    ngo_indices = {ngo: [] for ngo in unique_ngos}
    
    for idx, ngo in enumerate(ngo_ids):
        ngo_indices[ngo].append(idx)
    
    train_idx, val_idx, test_idx = [], [], []
    
    for ngo in unique_ngos:
        indices = ngo_indices[ngo]
        n = len(indices)
        
        # Calculate split points
        train_end = int(n * (1 - val_ratio - test_ratio))
        val_end = int(n * (1 - test_ratio))
        
        train_idx.extend(indices[:train_end])
        val_idx.extend(indices[train_end:val_end])
        test_idx.extend(indices[val_end:])
    
    logger.info(f"Split sizes - Train: {len(train_idx)}, Val: {len(val_idx)}, Test: {len(test_idx)}")
    
    return {
        'X_train': X[train_idx],
        'y_train': y[train_idx],
        'X_val': X[val_idx],
        'y_val': y[val_idx],
        'X_test': X[test_idx],
        'y_test': y[test_idx],
        'train_idx': train_idx,
        'val_idx': val_idx,
        'test_idx': test_idx,
        'ngo_ids_train': [ngo_ids[i] for i in train_idx],
        'ngo_ids_val': [ngo_ids[i] for i in val_idx],
        'ngo_ids_test': [ngo_ids[i] for i in test_idx],
    }


# =============================================================================
# MAIN PREPROCESSING PIPELINE
# =============================================================================

def preprocess_pipeline(
    data_path: Optional[str] = None,
    save_processed: bool = True
) -> Dict:
    """
    Run the complete preprocessing pipeline.
    
    Args:
        data_path: Path to raw data CSV
        save_processed: Whether to save processed data
        
    Returns:
        Dictionary with processed data and metadata
    """
    logger.info("=" * 60)
    logger.info("Starting Preprocessing Pipeline")
    logger.info("=" * 60)
    
    # Load data
    data_path = data_path or SYNTHETIC_DATA_PATH
    df = pd.read_csv(data_path, parse_dates=['date'])
    logger.info(f"Loaded {len(df)} records from {data_path}")
    
    # Create temporal features
    df = create_temporal_features(df)
    
    # Get feature and target columns
    feature_cols = get_feature_columns()
    target_col = get_target_column()
    
    logger.info(f"Using {len(feature_cols)} features")
    
    # Initialize and fit scaler
    scaler = FeatureScaler()
    scaler.fit(df, feature_cols, target_col)
    
    # Create sequences
    X, y, ngo_ids = create_sequences_per_ngo(
        df,
        feature_cols,
        target_col,
        scaler,
        MODEL_CONFIG.sequence_length,
        MODEL_CONFIG.forecast_horizon
    )
    
    logger.info(f"Total sequences created: {len(X)}")
    logger.info(f"Input shape: {X.shape}")
    logger.info(f"Output shape: {y.shape}")
    
    # Split data
    splits = temporal_train_test_split(
        X, y, ngo_ids,
        val_ratio=MODEL_CONFIG.validation_split,
        test_ratio=MODEL_CONFIG.test_split
    )
    
    # Save if requested
    if save_processed:
        # Save processed arrays
        np.savez(
            PROCESSED_DATA_PATH,
            X_train=splits['X_train'],
            y_train=splits['y_train'],
            X_val=splits['X_val'],
            y_val=splits['y_val'],
            X_test=splits['X_test'],
            y_test=splits['y_test']
        )
        logger.info(f"Saved processed data to {PROCESSED_DATA_PATH}")
        
        # Save scaler
        scaler.save(str(SCALER_PATH))
    
    # Prepare return value
    result = {
        'splits': splits,
        'scaler': scaler,
        'feature_cols': feature_cols,
        'target_col': target_col,
        'df': df,
        'metadata': {
            'num_samples': len(X),
            'sequence_length': MODEL_CONFIG.sequence_length,
            'forecast_horizon': MODEL_CONFIG.forecast_horizon,
            'num_features': X.shape[2],
            'num_ngos': len(NGO_CONFIGS)
        }
    }
    
    logger.info("\nPreprocessing complete!")
    logger.info(f"  Train samples: {len(splits['X_train'])}")
    logger.info(f"  Val samples: {len(splits['X_val'])}")
    logger.info(f"  Test samples: {len(splits['X_test'])}")
    
    return result


def load_processed_data() -> Tuple[Dict[str, np.ndarray], FeatureScaler]:
    """
    Load preprocessed data from disk.
    
    Returns:
        Tuple of (data_dict, scaler)
    """
    # Load arrays
    data = np.load(PROCESSED_DATA_PATH)
    splits = {key: data[key] for key in data.files}
    
    # Load scaler
    scaler = FeatureScaler.load(str(SCALER_PATH))
    
    logger.info("Loaded preprocessed data and scaler")
    
    return splits, scaler


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("FoodBridge AI - Data Preprocessing")
    print("=" * 70)
    
    # Run pipeline
    result = preprocess_pipeline()
    
    # Print summary
    print("\n" + "=" * 70)
    print("Preprocessing Summary")
    print("=" * 70)
    for key, value in result['metadata'].items():
        print(f"  {key}: {value}")
    
    print("\nData shapes:")
    print(f"  X_train: {result['splits']['X_train'].shape}")
    print(f"  y_train: {result['splits']['y_train'].shape}")
    print(f"  X_val: {result['splits']['X_val'].shape}")
    print(f"  y_val: {result['splits']['y_val'].shape}")
    print(f"  X_test: {result['splits']['X_test'].shape}")
    print(f"  y_test: {result['splits']['y_test'].shape}")
    
    print("\n✓ Data preprocessing complete!")
