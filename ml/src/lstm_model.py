"""
=============================================================================
FoodBridge AI - LSTM Model Architecture (PyTorch)
=============================================================================

This module defines the LSTM neural network architecture for food demand
forecasting. The model is designed to predict food demand for NGOs over
a 7-day forecast horizon.

Academic Background:
--------------------
Long Short-Term Memory (LSTM) networks are a type of Recurrent Neural Network
(RNN) specifically designed to learn long-term dependencies in sequential data.

Key LSTM Concepts:
1. Cell State (C_t): The "memory" that flows through the network
2. Hidden State (h_t): The output at each timestep
3. Gates:
   - Forget Gate: Decides what to discard from cell state
   - Input Gate: Decides what new information to store
   - Output Gate: Decides what to output

Why LSTM for Time-Series Forecasting?
- Captures temporal dependencies
- Handles variable-length sequences
- Learns both short and long-term patterns
- Mitigates vanishing gradient problem

Model Architecture:
------------------
Input (21 days × 23 features)
    ↓
LSTM Layer 1 (64 units)
    ↓
Dropout (0.2)
    ↓
LSTM Layer 2 (32 units)
    ↓
Dropout (0.2)
    ↓
Dense Layer (16 units, ReLU)
    ↓
Output Dense Layer (7 units, linear)
    ↓
Output (7-day forecast)

Author: FoodBridge AI Team
Version: 2.0.0 (PyTorch)
References:
    - Hochreiter & Schmidhuber (1997) "Long Short-Term Memory"
    - Goodfellow et al. (2016) "Deep Learning", Chapter 10
=============================================================================
"""

import torch
import torch.nn as nn
from typing import Tuple, List, Optional, Dict
import numpy as np
import os
import logging
from pathlib import Path

from config import MODEL_CONFIG, MODELS_DIR, LOGS_DIR

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# DEVICE CONFIGURATION
# =============================================================================

def get_device() -> torch.device:
    """Get the best available device for PyTorch."""
    if torch.cuda.is_available():
        return torch.device('cuda')
    elif torch.backends.mps.is_available():
        return torch.device('mps')
    else:
        return torch.device('cpu')


# =============================================================================
# LSTM MODEL CLASS
# =============================================================================

class LSTMModel(nn.Module):
    """
    LSTM model for food demand forecasting.
    
    Academic Note:
        The architecture follows best practices for time-series forecasting:
        
        1. Stacked LSTM layers for hierarchical feature learning
           - First layer learns low-level temporal patterns
           - Second layer learns higher-level abstractions
           
        2. Dropout for regularization
           - Prevents overfitting by randomly dropping neurons
           - Applied after each LSTM layer
           
        3. Dense layers for output transformation
           - Maps LSTM output to forecast horizon
           - ReLU activation for non-linearity (hidden)
           - Linear activation for regression output
    """
    
    def __init__(
        self,
        input_size: int,
        hidden_size_1: int = None,
        hidden_size_2: int = None,
        dense_size: int = None,
        output_size: int = None,
        dropout_rate: float = None
    ):
        """
        Initialize the LSTM model.
        
        Args:
            input_size: Number of input features
            hidden_size_1: Units in first LSTM layer
            hidden_size_2: Units in second LSTM layer
            dense_size: Units in dense layer
            output_size: Forecast horizon (days)
            dropout_rate: Dropout probability
        """
        super(LSTMModel, self).__init__()
        
        # Use config values as defaults
        self.hidden_size_1 = hidden_size_1 or MODEL_CONFIG.lstm_units_1
        self.hidden_size_2 = hidden_size_2 or MODEL_CONFIG.lstm_units_2
        self.dense_size = dense_size or MODEL_CONFIG.dense_units
        self.output_size = output_size or MODEL_CONFIG.forecast_horizon
        self.dropout_rate = dropout_rate or MODEL_CONFIG.dropout_rate
        
        # LSTM layers
        self.lstm1 = nn.LSTM(
            input_size=input_size,
            hidden_size=self.hidden_size_1,
            batch_first=True
        )
        self.dropout1 = nn.Dropout(self.dropout_rate)
        
        self.lstm2 = nn.LSTM(
            input_size=self.hidden_size_1,
            hidden_size=self.hidden_size_2,
            batch_first=True
        )
        self.dropout2 = nn.Dropout(self.dropout_rate)
        
        # Dense layers
        self.fc1 = nn.Linear(self.hidden_size_2, self.dense_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(self.dense_size, self.output_size)
        
        logger.info("=" * 60)
        logger.info("Built LSTM Model")
        logger.info("=" * 60)
        logger.info(f"Input size: {input_size}")
        logger.info(f"LSTM units: {self.hidden_size_1} → {self.hidden_size_2}")
        logger.info(f"Dense units: {self.dense_size}")
        logger.info(f"Output size: {self.output_size}")
        logger.info(f"Dropout rate: {self.dropout_rate}")
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass through the network.
        
        Args:
            x: Input tensor of shape (batch_size, sequence_length, input_size)
            
        Returns:
            Output tensor of shape (batch_size, output_size)
        """
        # First LSTM layer
        lstm_out1, _ = self.lstm1(x)
        lstm_out1 = self.dropout1(lstm_out1)
        
        # Second LSTM layer
        lstm_out2, _ = self.lstm2(lstm_out1)
        lstm_out2 = self.dropout2(lstm_out2)
        
        # Take only the last timestep
        last_output = lstm_out2[:, -1, :]
        
        # Dense layers
        dense_out = self.relu(self.fc1(last_output))
        output = self.fc2(dense_out)
        
        return output


class BidirectionalLSTMModel(nn.Module):
    """
    Bidirectional LSTM model (alternative architecture).
    
    Academic Note:
        Bidirectional LSTMs process sequences in both directions:
        - Forward: Past → Future
        - Backward: Future → Past (within the input sequence)
        
        This can capture dependencies that unidirectional LSTMs might miss.
    """
    
    def __init__(
        self,
        input_size: int,
        hidden_size_1: int = None,
        hidden_size_2: int = None,
        dense_size: int = None,
        output_size: int = None,
        dropout_rate: float = None
    ):
        super(BidirectionalLSTMModel, self).__init__()
        
        self.hidden_size_1 = hidden_size_1 or MODEL_CONFIG.lstm_units_1
        self.hidden_size_2 = hidden_size_2 or MODEL_CONFIG.lstm_units_2
        self.dense_size = dense_size or MODEL_CONFIG.dense_units
        self.output_size = output_size or MODEL_CONFIG.forecast_horizon
        self.dropout_rate = dropout_rate or MODEL_CONFIG.dropout_rate
        
        # Bidirectional LSTM layers
        self.lstm1 = nn.LSTM(
            input_size=input_size,
            hidden_size=self.hidden_size_1,
            batch_first=True,
            bidirectional=True
        )
        self.dropout1 = nn.Dropout(self.dropout_rate)
        
        self.lstm2 = nn.LSTM(
            input_size=self.hidden_size_1 * 2,  # *2 for bidirectional
            hidden_size=self.hidden_size_2,
            batch_first=True,
            bidirectional=True
        )
        self.dropout2 = nn.Dropout(self.dropout_rate)
        
        # Dense layers (*2 for bidirectional)
        self.fc1 = nn.Linear(self.hidden_size_2 * 2, self.dense_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(self.dense_size, self.output_size)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out1, _ = self.lstm1(x)
        lstm_out1 = self.dropout1(lstm_out1)
        
        lstm_out2, _ = self.lstm2(lstm_out1)
        lstm_out2 = self.dropout2(lstm_out2)
        
        last_output = lstm_out2[:, -1, :]
        
        dense_out = self.relu(self.fc1(last_output))
        output = self.fc2(dense_out)
        
        return output


class AttentionLSTMModel(nn.Module):
    """
    LSTM model with attention mechanism (advanced architecture).
    
    Academic Note:
        Attention mechanisms allow the model to focus on different parts
        of the input sequence when making predictions. This is particularly
        useful when certain historical days are more relevant than others.
    """
    
    def __init__(
        self,
        input_size: int,
        hidden_size_1: int = None,
        hidden_size_2: int = None,
        dense_size: int = None,
        output_size: int = None,
        dropout_rate: float = None,
        num_heads: int = 4
    ):
        super(AttentionLSTMModel, self).__init__()
        
        self.hidden_size_1 = hidden_size_1 or MODEL_CONFIG.lstm_units_1
        self.hidden_size_2 = hidden_size_2 or MODEL_CONFIG.lstm_units_2
        self.dense_size = dense_size or MODEL_CONFIG.dense_units
        self.output_size = output_size or MODEL_CONFIG.forecast_horizon
        self.dropout_rate = dropout_rate or MODEL_CONFIG.dropout_rate
        
        # LSTM layer
        self.lstm1 = nn.LSTM(
            input_size=input_size,
            hidden_size=self.hidden_size_1,
            batch_first=True
        )
        self.dropout1 = nn.Dropout(self.dropout_rate)
        
        # Multi-head attention
        self.attention = nn.MultiheadAttention(
            embed_dim=self.hidden_size_1,
            num_heads=num_heads,
            batch_first=True
        )
        self.layer_norm = nn.LayerNorm(self.hidden_size_1)
        
        # Second LSTM
        self.lstm2 = nn.LSTM(
            input_size=self.hidden_size_1,
            hidden_size=self.hidden_size_2,
            batch_first=True
        )
        self.dropout2 = nn.Dropout(self.dropout_rate)
        
        # Dense layers
        self.fc1 = nn.Linear(self.hidden_size_2, self.dense_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(self.dense_size, self.output_size)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out1, _ = self.lstm1(x)
        lstm_out1 = self.dropout1(lstm_out1)
        
        # Self-attention with residual connection
        attn_out, _ = self.attention(lstm_out1, lstm_out1, lstm_out1)
        lstm_out1 = self.layer_norm(lstm_out1 + attn_out)
        
        lstm_out2, _ = self.lstm2(lstm_out1)
        lstm_out2 = self.dropout2(lstm_out2)
        
        last_output = lstm_out2[:, -1, :]
        
        dense_out = self.relu(self.fc1(last_output))
        output = self.fc2(dense_out)
        
        return output


# =============================================================================
# MODEL BUILDING FUNCTIONS
# =============================================================================

def build_lstm_model(
    input_size: int,
    forecast_horizon: int = None,
    lstm_units_1: int = None,
    lstm_units_2: int = None,
    dense_units: int = None,
    dropout_rate: float = None
) -> LSTMModel:
    """
    Build the LSTM model for food demand forecasting.
    
    Args:
        input_size: Number of input features
        forecast_horizon: Number of days to forecast
        lstm_units_1: Units in first LSTM layer
        lstm_units_2: Units in second LSTM layer
        dense_units: Units in dense layer
        dropout_rate: Dropout probability
        
    Returns:
        LSTMModel instance
    """
    model = LSTMModel(
        input_size=input_size,
        hidden_size_1=lstm_units_1,
        hidden_size_2=lstm_units_2,
        dense_size=dense_units,
        output_size=forecast_horizon,
        dropout_rate=dropout_rate
    )
    
    logger.info("Model built successfully")
    return model


def build_bidirectional_lstm_model(
    input_size: int,
    forecast_horizon: int = None
) -> BidirectionalLSTMModel:
    """Build a bidirectional LSTM model."""
    return BidirectionalLSTMModel(
        input_size=input_size,
        output_size=forecast_horizon
    )


def build_attention_lstm_model(
    input_size: int,
    forecast_horizon: int = None
) -> AttentionLSTMModel:
    """Build an LSTM model with attention mechanism."""
    return AttentionLSTMModel(
        input_size=input_size,
        output_size=forecast_horizon
    )


# =============================================================================
# EARLY STOPPING CALLBACK
# =============================================================================

class EarlyStopping:
    """
    Early stopping to stop training when validation loss doesn't improve.
    
    Academic Note:
        Early stopping is a form of regularization that prevents overfitting
        by stopping training when the model starts to overfit on the training data.
    """
    
    def __init__(
        self,
        patience: int = 15,
        min_delta: float = 0.0,
        restore_best_weights: bool = True,
        verbose: bool = True
    ):
        self.patience = patience
        self.min_delta = min_delta
        self.restore_best_weights = restore_best_weights
        self.verbose = verbose
        
        self.best_loss = None
        self.counter = 0
        self.best_weights = None
        self.should_stop = False
    
    def __call__(self, val_loss: float, model: nn.Module) -> bool:
        if self.best_loss is None:
            self.best_loss = val_loss
            self.best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        elif val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            self.counter = 0
        else:
            self.counter += 1
            if self.verbose:
                logger.info(f"EarlyStopping counter: {self.counter}/{self.patience}")
            
            if self.counter >= self.patience:
                self.should_stop = True
                if self.restore_best_weights and self.best_weights is not None:
                    model.load_state_dict(self.best_weights)
                    if self.verbose:
                        logger.info(f"Restored best model with validation loss: {self.best_loss:.4f}")
        
        return self.should_stop


class ReduceLROnPlateau:
    """
    Reduce learning rate when validation loss plateaus.
    """
    
    def __init__(
        self,
        optimizer: torch.optim.Optimizer,
        factor: float = 0.5,
        patience: int = 5,
        min_lr: float = 1e-6,
        verbose: bool = True
    ):
        self.optimizer = optimizer
        self.factor = factor
        self.patience = patience
        self.min_lr = min_lr
        self.verbose = verbose
        
        self.best_loss = None
        self.counter = 0
    
    def __call__(self, val_loss: float):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss < self.best_loss:
            self.best_loss = val_loss
            self.counter = 0
        else:
            self.counter += 1
            
            if self.counter >= self.patience:
                for param_group in self.optimizer.param_groups:
                    old_lr = param_group['lr']
                    new_lr = max(old_lr * self.factor, self.min_lr)
                    param_group['lr'] = new_lr
                    
                    if self.verbose and old_lr != new_lr:
                        logger.info(f"Reduced learning rate: {old_lr:.6f} → {new_lr:.6f}")
                
                self.counter = 0


# =============================================================================
# MODEL UTILITIES
# =============================================================================

def print_model_summary(model: nn.Module, input_shape: Tuple[int, int]):
    """Print detailed model summary."""
    print("\n" + "=" * 70)
    print("MODEL ARCHITECTURE SUMMARY")
    print("=" * 70)
    print(model)
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    
    print("\nParameter Count:")
    print(f"  Trainable: {trainable_params:,}")
    print(f"  Non-trainable: {total_params - trainable_params:,}")
    print(f"  Total: {total_params:,}")


def save_model(model: nn.Module, name: str = 'lstm_model', save_dir: Path = None):
    """
    Save model to disk.
    
    Args:
        model: Trained PyTorch model
        name: Model name
        save_dir: Directory to save to (defaults to MODELS_DIR)
    """
    save_dir = save_dir or MODELS_DIR
    os.makedirs(save_dir, exist_ok=True)
    
    # Save full model state
    model_path = save_dir / f'{name}.pt'
    torch.save({
        'model_state_dict': model.state_dict(),
        'model_class': model.__class__.__name__
    }, model_path)
    logger.info(f"Saved model to {model_path}")


def load_model(
    name: str = 'lstm_model',
    input_size: int = 23,
    model_dir: Path = None,
    device: torch.device = None
) -> nn.Module:
    """
    Load model from disk.
    
    Args:
        name: Model name
        input_size: Number of input features
        model_dir: Directory to load from
        device: Device to load model onto
        
    Returns:
        Loaded PyTorch model
    """
    model_dir = model_dir or MODELS_DIR
    device = device or get_device()
    
    model_path = model_dir / f'{name}.pt'
    checkpoint = torch.load(model_path, map_location=device)
    
    # Create model based on saved class
    model_class = checkpoint.get('model_class', 'LSTMModel')
    
    if model_class == 'BidirectionalLSTMModel':
        model = BidirectionalLSTMModel(input_size=input_size)
    elif model_class == 'AttentionLSTMModel':
        model = AttentionLSTMModel(input_size=input_size)
    else:
        model = LSTMModel(input_size=input_size)
    
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
    logger.info(f"Loaded model from {model_path}")
    return model


def get_model_architecture_diagram() -> str:
    """
    Generate ASCII diagram of model architecture.
    
    Returns:
        ASCII string representation
    """
    diagram = """
    ┌─────────────────────────────────────────────────────────────────┐
    │                    FoodBridge LSTM Architecture                  │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │    Input Layer                                                   │
    │    ┌─────────────────────────────────────────────┐              │
    │    │  Shape: (21 timesteps × 23 features)        │              │
    │    │  - 21 days of historical data               │              │
    │    │  - 23 features per day                      │              │
    │    └───────────────────┬─────────────────────────┘              │
    │                        │                                         │
    │                        ▼                                         │
    │    LSTM Layer 1                                                  │
    │    ┌─────────────────────────────────────────────┐              │
    │    │  Units: 64                                   │              │
    │    │  Output: (batch, seq_len, 64)                │              │
    │    └───────────────────┬─────────────────────────┘              │
    │                        │                                         │
    │                        ▼                                         │
    │    Dropout Layer 1                                               │
    │    ┌─────────────────────────────────────────────┐              │
    │    │  Rate: 0.2 (20% of neurons dropped)         │              │
    │    └───────────────────┬─────────────────────────┘              │
    │                        │                                         │
    │                        ▼                                         │
    │    LSTM Layer 2                                                  │
    │    ┌─────────────────────────────────────────────┐              │
    │    │  Units: 32                                   │              │
    │    │  Output: (batch, seq_len, 32)                │              │
    │    └───────────────────┬─────────────────────────┘              │
    │                        │                                         │
    │                        ▼                                         │
    │    Dropout Layer 2                                               │
    │    ┌─────────────────────────────────────────────┐              │
    │    │  Rate: 0.2                                   │              │
    │    └───────────────────┬─────────────────────────┘              │
    │                        │                                         │
    │                        ▼                                         │
    │    Take Last Timestep                                            │
    │    ┌─────────────────────────────────────────────┐              │
    │    │  Output: (batch, 32)                         │              │
    │    └───────────────────┬─────────────────────────┘              │
    │                        │                                         │
    │                        ▼                                         │
    │    Dense Layer                                                   │
    │    ┌─────────────────────────────────────────────┐              │
    │    │  Units: 16                                   │              │
    │    │  Activation: ReLU                            │              │
    │    └───────────────────┬─────────────────────────┘              │
    │                        │                                         │
    │                        ▼                                         │
    │    Output Layer                                                  │
    │    ┌─────────────────────────────────────────────┐              │
    │    │  Units: 7 (forecast horizon)                 │              │
    │    │  Activation: Linear (regression)             │              │
    │    └───────────────────┬─────────────────────────┘              │
    │                        │                                         │
    │                        ▼                                         │
    │    Output: 7-day food demand forecast                            │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘
    
    Loss Function: Mean Squared Error (MSE)
    Optimizer: Adam (lr=0.001)
    Metrics: Mean Absolute Error (MAE)
    """
    return diagram


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("FoodBridge AI - LSTM Model Architecture (PyTorch)")
    print("=" * 70)
    
    # Print architecture diagram
    print(get_model_architecture_diagram())
    
    # Get device
    device = get_device()
    print(f"\nUsing device: {device}")
    
    # Build model
    input_size = 23  # 23 features
    model = build_lstm_model(
        input_size=input_size,
        forecast_horizon=MODEL_CONFIG.forecast_horizon
    )
    model.to(device)
    
    # Print summary
    print_model_summary(model, (MODEL_CONFIG.sequence_length, input_size))
    
    # Test forward pass
    print("\n" + "=" * 70)
    print("Testing Forward Pass")
    print("=" * 70)
    
    # Create dummy input
    dummy_input = torch.randn(1, MODEL_CONFIG.sequence_length, input_size).to(device)
    model.eval()
    with torch.no_grad():
        output = model(dummy_input)
    
    print(f"Input shape: {dummy_input.shape}")
    print(f"Output shape: {output.shape}")
    print(f"Output: {output.cpu().numpy()[0]}")
    
    print("\n✓ Model architecture validated!")
