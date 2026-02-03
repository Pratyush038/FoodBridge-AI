#!/usr/bin/env python3
"""
=============================================================================
FoodBridge AI - ML Pipeline Runner
=============================================================================

This script provides a convenient way to run the complete ML pipeline
or individual steps.

Usage:
    python run_pipeline.py [command]
    
Commands:
    all         - Run entire pipeline (generate → preprocess → train → evaluate → predict)
    generate    - Generate synthetic data only
    preprocess  - Preprocess data for training
    train       - Train the LSTM model
    evaluate    - Evaluate the trained model
    predict     - Generate predictions
    
Examples:
    python run_pipeline.py all      # Run everything
    python run_pipeline.py train    # Just train (requires data to exist)
    python run_pipeline.py predict  # Just generate predictions (requires trained model)

Author: FoodBridge AI Team
Version: 2.0.0 (PyTorch)
=============================================================================
"""

import sys
import os
import argparse
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))


def run_generate():
    """Generate synthetic data."""
    print("\n" + "=" * 70)
    print("Step 1: Generating Synthetic Data")
    print("=" * 70)
    from src.generate_synthetic_data import generate_synthetic_dataset
    generate_synthetic_dataset()
    print("✓ Synthetic data generated")


def run_preprocess():
    """Preprocess data for training."""
    print("\n" + "=" * 70)
    print("Step 2: Preprocessing Data")
    print("=" * 70)
    from src.data_preprocessing import preprocess_pipeline
    preprocess_pipeline()
    print("✓ Data preprocessing complete")


def run_train():
    """Train the LSTM model."""
    print("\n" + "=" * 70)
    print("Step 3: Training LSTM Model")
    print("=" * 70)
    from src.train import main as train_main
    train_main()
    print("✓ Model training complete")


def run_evaluate():
    """Evaluate the trained model."""
    print("\n" + "=" * 70)
    print("Step 4: Evaluating Model")
    print("=" * 70)
    from src.evaluate import run_full_evaluation, generate_evaluation_report
    results = run_full_evaluation(save_plots=True)
    report = generate_evaluation_report(results)
    print(report)
    print("✓ Model evaluation complete")


def run_predict():
    """Generate predictions."""
    print("\n" + "=" * 70)
    print("Step 5: Generating Predictions")
    print("=" * 70)
    from src.predict import run_prediction_pipeline
    run_prediction_pipeline()
    print("✓ Predictions generated")


def run_all():
    """Run the complete pipeline."""
    print("=" * 70)
    print("FoodBridge AI - Complete ML Pipeline")
    print("=" * 70)
    
    run_generate()
    run_preprocess()
    run_train()
    run_evaluate()
    run_predict()
    
    print("\n" + "=" * 70)
    print("✓ PIPELINE COMPLETE")
    print("=" * 70)
    print("\nNext steps:")
    print("  1. Check ml/logs/ for training plots and reports")
    print("  2. Check ml/outputs/predictions.json for predictions")
    print("  3. Access predictions via API: GET /api/ml-predictions")
    print("  4. View predictions in demo: /demo → LSTM Forecasts tab")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='FoodBridge AI ML Pipeline Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run_pipeline.py all       # Run complete pipeline
    python run_pipeline.py train     # Train model only
    python run_pipeline.py predict   # Generate predictions only
        """
    )
    
    parser.add_argument(
        'command',
        choices=['all', 'generate', 'preprocess', 'train', 'evaluate', 'predict'],
        default='all',
        nargs='?',
        help='Command to run (default: all)'
    )
    
    args = parser.parse_args()
    
    commands = {
        'all': run_all,
        'generate': run_generate,
        'preprocess': run_preprocess,
        'train': run_train,
        'evaluate': run_evaluate,
        'predict': run_predict,
    }
    
    try:
        commands[args.command]()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
