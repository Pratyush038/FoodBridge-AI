"""
=============================================================================
FoodBridge AI - ML Module Initialization
=============================================================================

This package contains the LSTM-based Hunger Hotspot Prediction Engine.

Modules:
--------
- config: Configuration and hyperparameters
- generate_synthetic_data: Synthetic dataset generation
- data_preprocessing: Data preparation for LSTM
- lstm_model: Model architecture
- train: Training pipeline
- evaluate: Model evaluation
- predict: Inference and predictions

Usage:
------
    from ml.src import train, predict
    
    # Train model
    model, history = train.main()
    
    # Get predictions
    predictions = predict.get_predictions()

Author: FoodBridge AI Team
Version: 1.0.0
=============================================================================
"""

__version__ = '1.0.0'
__author__ = 'FoodBridge AI Team'
