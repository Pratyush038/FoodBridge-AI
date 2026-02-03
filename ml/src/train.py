"""
=============================================================================
FoodBridge AI - Model Training Pipeline (PyTorch)
=============================================================================

This module implements the complete training pipeline for the LSTM model.
It handles data loading, model training, logging, and model saving.

Training Process:
-----------------
1. Load and preprocess data
2. Build model architecture
3. Configure callbacks (EarlyStopping, LR scheduling, etc.)
4. Train model with validation
5. Save best model and training history
6. Generate training report

Academic Considerations:
-----------------------
1. Batch Size Selection:
   - Smaller batches: More noise, but better generalization
   - Larger batches: Faster training, but may converge to sharp minima
   - We use 32 as a balanced default

2. Learning Rate:
   - Start with 0.001 (Adam default)
   - Reduce on plateau for fine-tuning
   
3. Early Stopping:
   - Prevents overfitting
   - Monitors validation loss
   - Restores best weights

Author: FoodBridge AI Team
Version: 2.0.0 (PyTorch)
=============================================================================
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple, List
import logging

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from config import (
    MODEL_CONFIG,
    MODELS_DIR,
    LOGS_DIR,
    DATA_DIR,
    SYNTHETIC_DATA_PATH,
    PROCESSED_DATA_PATH,
    TRAINING_HISTORY_PATH
)
from generate_synthetic_data import generate_synthetic_dataset
from data_preprocessing import preprocess_pipeline, load_processed_data, FeatureScaler
from lstm_model import (
    LSTMModel,
    BidirectionalLSTMModel,
    AttentionLSTMModel,
    build_lstm_model,
    build_bidirectional_lstm_model,
    build_attention_lstm_model,
    EarlyStopping,
    ReduceLROnPlateau,
    save_model,
    print_model_summary,
    get_device
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# TRAINING CONFIGURATION
# =============================================================================

class TrainingConfig:
    """Configuration for training run."""
    
    def __init__(
        self,
        model_type: str = 'standard',  # 'standard', 'bidirectional', 'attention'
        epochs: int = None,
        batch_size: int = None,
        learning_rate: float = None,
        early_stopping_patience: int = 15,
        reduce_lr_patience: int = 5,
        use_gpu: bool = True,
        seed: int = 42
    ):
        self.model_type = model_type
        self.epochs = epochs or MODEL_CONFIG.epochs
        self.batch_size = batch_size or MODEL_CONFIG.batch_size
        self.learning_rate = learning_rate or MODEL_CONFIG.learning_rate
        self.early_stopping_patience = early_stopping_patience
        self.reduce_lr_patience = reduce_lr_patience
        self.use_gpu = use_gpu
        self.seed = seed
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
    def to_dict(self) -> Dict:
        return {
            'model_type': self.model_type,
            'epochs': self.epochs,
            'batch_size': self.batch_size,
            'learning_rate': self.learning_rate,
            'early_stopping_patience': self.early_stopping_patience,
            'reduce_lr_patience': self.reduce_lr_patience,
            'use_gpu': self.use_gpu,
            'seed': self.seed,
            'timestamp': self.timestamp
        }


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def set_seeds(seed: int = 42):
    """Set random seeds for reproducibility."""
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    logger.info(f"Random seeds set to {seed}")


def ensure_data_exists() -> bool:
    """
    Ensure synthetic data exists, generate if not.
    
    Returns:
        True if data exists or was generated successfully
    """
    if not SYNTHETIC_DATA_PATH.exists():
        logger.info("Synthetic data not found, generating...")
        try:
            generate_synthetic_dataset()
            return True
        except Exception as e:
            logger.error(f"Failed to generate data: {e}")
            return False
    return True


def create_data_loaders(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    batch_size: int,
    device: torch.device
) -> Tuple[DataLoader, DataLoader]:
    """
    Create PyTorch DataLoaders for training and validation.
    
    Args:
        X_train, y_train: Training data
        X_val, y_val: Validation data
        batch_size: Batch size
        device: Device to move tensors to
        
    Returns:
        Tuple of (train_loader, val_loader)
    """
    # Convert to tensors
    X_train_t = torch.FloatTensor(X_train)
    y_train_t = torch.FloatTensor(y_train)
    X_val_t = torch.FloatTensor(X_val)
    y_val_t = torch.FloatTensor(y_val)
    
    # Create datasets
    train_dataset = TensorDataset(X_train_t, y_train_t)
    val_dataset = TensorDataset(X_val_t, y_val_t)
    
    # Create data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False
    )
    
    return train_loader, val_loader


# =============================================================================
# TRAINING FUNCTIONS
# =============================================================================

def train_epoch(
    model: nn.Module,
    train_loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device
) -> Tuple[float, float]:
    """
    Train for one epoch.
    
    Args:
        model: PyTorch model
        train_loader: Training data loader
        criterion: Loss function
        optimizer: Optimizer
        device: Device
        
    Returns:
        Tuple of (average_loss, average_mae)
    """
    model.train()
    total_loss = 0.0
    total_mae = 0.0
    num_batches = 0
    
    for X_batch, y_batch in train_loader:
        X_batch = X_batch.to(device)
        y_batch = y_batch.to(device)
        
        # Forward pass
        optimizer.zero_grad()
        outputs = model(X_batch)
        loss = criterion(outputs, y_batch)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        # Track metrics
        total_loss += loss.item()
        total_mae += torch.mean(torch.abs(outputs - y_batch)).item()
        num_batches += 1
    
    return total_loss / num_batches, total_mae / num_batches


def validate_epoch(
    model: nn.Module,
    val_loader: DataLoader,
    criterion: nn.Module,
    device: torch.device
) -> Tuple[float, float]:
    """
    Validate for one epoch.
    
    Args:
        model: PyTorch model
        val_loader: Validation data loader
        criterion: Loss function
        device: Device
        
    Returns:
        Tuple of (average_loss, average_mae)
    """
    model.eval()
    total_loss = 0.0
    total_mae = 0.0
    num_batches = 0
    
    with torch.no_grad():
        for X_batch, y_batch in val_loader:
            X_batch = X_batch.to(device)
            y_batch = y_batch.to(device)
            
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            
            total_loss += loss.item()
            total_mae += torch.mean(torch.abs(outputs - y_batch)).item()
            num_batches += 1
    
    return total_loss / num_batches, total_mae / num_batches


def train_model(
    config: TrainingConfig,
    force_regenerate_data: bool = False
) -> Tuple[nn.Module, Dict]:
    """
    Main training function.
    
    Args:
        config: Training configuration
        force_regenerate_data: Whether to regenerate synthetic data
        
    Returns:
        Tuple of (trained model, training history)
    """
    logger.info("=" * 70)
    logger.info("Starting Model Training")
    logger.info("=" * 70)
    
    # Set seeds
    set_seeds(config.seed)
    
    # Get device
    device = get_device() if config.use_gpu else torch.device('cpu')
    logger.info(f"Using device: {device}")
    
    # Generate data if needed
    if force_regenerate_data or not SYNTHETIC_DATA_PATH.exists():
        logger.info("Generating synthetic data...")
        generate_synthetic_dataset()
    
    # Preprocess data
    if force_regenerate_data or not PROCESSED_DATA_PATH.exists():
        logger.info("Preprocessing data...")
        result = preprocess_pipeline()
        splits = result['splits']
        scaler = result['scaler']
    else:
        logger.info("Loading preprocessed data...")
        splits, scaler = load_processed_data()
    
    # Extract data
    X_train, y_train = splits['X_train'], splits['y_train']
    X_val, y_val = splits['X_val'], splits['y_val']
    
    logger.info(f"\nTraining data shape: {X_train.shape}")
    logger.info(f"Validation data shape: {X_val.shape}")
    
    # Create data loaders
    train_loader, val_loader = create_data_loaders(
        X_train, y_train, X_val, y_val,
        config.batch_size, device
    )
    
    # Build model
    input_size = X_train.shape[2]  # Number of features
    forecast_horizon = y_train.shape[1]
    
    if config.model_type == 'bidirectional':
        model = build_bidirectional_lstm_model(input_size, forecast_horizon)
    elif config.model_type == 'attention':
        model = build_attention_lstm_model(input_size, forecast_horizon)
    else:
        model = build_lstm_model(
            input_size=input_size,
            forecast_horizon=forecast_horizon
        )
    
    model.to(device)
    
    # Print model summary
    print_model_summary(model, (X_train.shape[1], X_train.shape[2]))
    
    # Setup training components
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)
    
    # Setup callbacks
    early_stopping = EarlyStopping(
        patience=config.early_stopping_patience,
        restore_best_weights=True,
        verbose=True
    )
    lr_scheduler = ReduceLROnPlateau(
        optimizer,
        factor=0.5,
        patience=config.reduce_lr_patience,
        min_lr=1e-6,
        verbose=True
    )
    
    # Training history
    history = {
        'loss': [],
        'val_loss': [],
        'mae': [],
        'val_mae': []
    }
    
    # Train
    logger.info("\n" + "=" * 70)
    logger.info("Training Started")
    logger.info("=" * 70)
    
    for epoch in range(config.epochs):
        # Train
        train_loss, train_mae = train_epoch(
            model, train_loader, criterion, optimizer, device
        )
        
        # Validate
        val_loss, val_mae = validate_epoch(
            model, val_loader, criterion, device
        )
        
        # Record history
        history['loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['mae'].append(train_mae)
        history['val_mae'].append(val_mae)
        
        # Print progress
        logger.info(
            f"Epoch {epoch + 1}/{config.epochs} - "
            f"loss: {train_loss:.4f} - mae: {train_mae:.4f} - "
            f"val_loss: {val_loss:.4f} - val_mae: {val_mae:.4f}"
        )
        
        # Callbacks
        lr_scheduler(val_loss)
        if early_stopping(val_loss, model):
            logger.info(f"Early stopping triggered at epoch {epoch + 1}")
            break
    
    # Save model
    model_name = f'lstm_{config.model_type}_{config.timestamp}'
    save_model(model, model_name)
    
    # Also save as 'latest' for easy loading
    save_model(model, 'lstm_model_latest')
    
    # Save training history
    history_dict = {
        'loss': [float(x) for x in history['loss']],
        'val_loss': [float(x) for x in history['val_loss']],
        'mae': [float(x) for x in history['mae']],
        'val_mae': [float(x) for x in history['val_mae']],
        'config': config.to_dict(),
        'final_metrics': {
            'train_loss': float(history['loss'][-1]),
            'val_loss': float(history['val_loss'][-1]),
            'train_mae': float(history['mae'][-1]),
            'val_mae': float(history['val_mae'][-1]),
            'epochs_trained': len(history['loss'])
        }
    }
    
    with open(TRAINING_HISTORY_PATH, 'w') as f:
        json.dump(history_dict, f, indent=2)
    logger.info(f"Saved training history to {TRAINING_HISTORY_PATH}")
    
    return model, history_dict


def plot_training_history(history: Dict, save_path: Optional[Path] = None):
    """
    Plot training history curves.
    
    Args:
        history: Training history dictionary
        save_path: Path to save plot (optional)
    """
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss plot
    axes[0].plot(history['loss'], label='Training Loss', linewidth=2)
    axes[0].plot(history['val_loss'], label='Validation Loss', linewidth=2)
    axes[0].set_xlabel('Epoch', fontsize=12)
    axes[0].set_ylabel('Loss (MSE)', fontsize=12)
    axes[0].set_title('Model Loss Over Training', fontsize=14)
    axes[0].legend(fontsize=10)
    axes[0].grid(True, alpha=0.3)
    
    # MAE plot
    axes[1].plot(history['mae'], label='Training MAE', linewidth=2)
    axes[1].plot(history['val_mae'], label='Validation MAE', linewidth=2)
    axes[1].set_xlabel('Epoch', fontsize=12)
    axes[1].set_ylabel('Mean Absolute Error', fontsize=12)
    axes[1].set_title('Model MAE Over Training', fontsize=14)
    axes[1].legend(fontsize=10)
    axes[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        logger.info(f"Saved training plot to {save_path}")
    
    plt.show()


def generate_training_report(history: Dict, model: nn.Module) -> str:
    """
    Generate a comprehensive training report.
    
    Args:
        history: Training history
        model: Trained model
        
    Returns:
        Report as string
    """
    config = history.get('config', {})
    metrics = history.get('final_metrics', {})
    
    total_params = sum(p.numel() for p in model.parameters())
    
    report = f"""
================================================================================
                        FOODBRIDGE AI - TRAINING REPORT
================================================================================

Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Model Type: {config.get('model_type', 'standard')} LSTM
Framework: PyTorch {torch.__version__}

--------------------------------------------------------------------------------
TRAINING CONFIGURATION
--------------------------------------------------------------------------------
  Epochs (max):          {config.get('epochs', 'N/A')}
  Epochs (actual):       {metrics.get('epochs_trained', 'N/A')}
  Batch Size:            {config.get('batch_size', 'N/A')}
  Learning Rate:         {config.get('learning_rate', 'N/A')}
  Early Stop Patience:   {config.get('early_stopping_patience', 'N/A')}
  Random Seed:           {config.get('seed', 'N/A')}

--------------------------------------------------------------------------------
MODEL ARCHITECTURE
--------------------------------------------------------------------------------
  Sequence Length:       {MODEL_CONFIG.sequence_length} days
  Forecast Horizon:      {MODEL_CONFIG.forecast_horizon} days
  LSTM Layer 1:          {MODEL_CONFIG.lstm_units_1} units
  LSTM Layer 2:          {MODEL_CONFIG.lstm_units_2} units
  Dense Layer:           {MODEL_CONFIG.dense_units} units
  Dropout Rate:          {MODEL_CONFIG.dropout_rate}
  
  Total Parameters:      {total_params:,}

--------------------------------------------------------------------------------
FINAL METRICS
--------------------------------------------------------------------------------
  Training Loss (MSE):   {metrics.get('train_loss', 0):.6f}
  Validation Loss (MSE): {metrics.get('val_loss', 0):.6f}
  Training MAE:          {metrics.get('train_mae', 0):.6f}
  Validation MAE:        {metrics.get('val_mae', 0):.6f}

--------------------------------------------------------------------------------
INTERPRETATION
--------------------------------------------------------------------------------
  - MSE (Mean Squared Error): Penalizes larger errors more heavily
  - MAE (Mean Absolute Error): Average absolute difference from true values
  
  The validation MAE of {metrics.get('val_mae', 0):.2f} indicates that on average,
  predictions are within {metrics.get('val_mae', 0):.2f} units of the actual demand.
  
  Since data is normalized, this translates to roughly 
  {metrics.get('val_mae', 0) * 100:.1f}% prediction error in relative terms.

--------------------------------------------------------------------------------
MODEL FILES
--------------------------------------------------------------------------------
  Model saved to: {MODELS_DIR}/lstm_model_latest.pt
  History saved to: {TRAINING_HISTORY_PATH}

================================================================================
"""
    return report


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main training entry point."""
    print("=" * 70)
    print("FoodBridge AI - LSTM Model Training")
    print("=" * 70)
    print(f"PyTorch version: {torch.__version__}")
    print(f"Device: {get_device()}")
    
    # Create configuration
    config = TrainingConfig(
        model_type='standard',
        epochs=MODEL_CONFIG.epochs,
        batch_size=MODEL_CONFIG.batch_size,
        learning_rate=MODEL_CONFIG.learning_rate
    )
    
    print("\nTraining Configuration:")
    for key, value in config.to_dict().items():
        print(f"  {key}: {value}")
    
    # Train model
    model, history = train_model(config, force_regenerate_data=False)
    
    # Plot training history
    plot_path = LOGS_DIR / 'training_history.png'
    plot_training_history(history, plot_path)
    
    # Generate and print report
    report = generate_training_report(history, model)
    print(report)
    
    # Save report
    report_path = LOGS_DIR / 'training_report.txt'
    with open(report_path, 'w') as f:
        f.write(report)
    print(f"Report saved to {report_path}")
    
    print("\n✓ Training complete!")
    
    return model, history


if __name__ == "__main__":
    model, history = main()
