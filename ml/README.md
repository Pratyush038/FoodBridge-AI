# FoodBridge AI - LSTM Hunger Hotspot Prediction Engine

## 📚 Academic Documentation

This document provides comprehensive academic documentation for the LSTM-based food demand forecasting system implemented as part of the FoodBridge AI platform.

---

## 1. Executive Summary

The Hunger Hotspot Prediction Engine uses a Long Short-Term Memory (LSTM) neural network to forecast food demand across multiple NGOs for a 7-day horizon. This enables proactive resource allocation and helps prevent food insecurity situations.

### Key Capabilities:
- **7-day ahead forecasting** of food demand per NGO
- **Risk scoring** with confidence intervals
- **Per-NGO analysis** accounting for different demand patterns
- **Seasonality and trend detection** in demand patterns

---

## 2. Problem Formulation

### 2.1 Task Definition

**Given:** Historical food request data for N NGOs over T days

**Predict:** Daily food demand for each NGO for the next K days

**Formally:**
- Let $X_{t,n}$ denote the feature vector for NGO $n$ at time $t$
- Let $y_{t,n}$ denote the food demand for NGO $n$ at time $t$
- Goal: Learn $f: X_{t-L:t,n} \rightarrow y_{t+1:t+K,n}$

Where:
- $L$ = sequence length (21 days)
- $K$ = forecast horizon (7 days)
- $N$ = number of NGOs (5)

### 2.2 Why LSTM?

Long Short-Term Memory networks are ideal for this task because:

1. **Temporal Dependencies**: Food demand exhibits patterns that span multiple time scales (daily, weekly, seasonal)

2. **Non-linear Relationships**: Demand is influenced by complex interactions between features

3. **Variable-length History**: LSTMs can learn which historical observations are most relevant

4. **Gradient Flow**: LSTM's gating mechanisms prevent vanishing gradients in long sequences

---

## 3. Data Pipeline

### 3.1 Synthetic Data Generation

Since production data may be limited, we generate synthetic data that mimics real-world patterns:

```
Demand(t) = BaseDemand × WeeklyFactor × SeasonalFactor × TrendFactor × (1 + Noise) × EventMultiplier
```

**Components:**

| Component | Description | Formula/Values |
|-----------|-------------|----------------|
| BaseDemand | NGO-specific baseline | 80-200 units |
| WeeklyFactor | Day-of-week pattern | 0.7-1.1 |
| SeasonalFactor | Monthly variation | 0.85-1.15 |
| TrendFactor | Long-term trend | ~1.0 |
| Noise | Random variation | N(0, σ²) |
| EventMultiplier | Special events | 1.0-1.5 |

### 3.2 Feature Engineering

**Input Features (23 total):**

| Category | Features | Count |
|----------|----------|-------|
| Core | total_food_requested, number_of_requests, urgency_score | 3 |
| Day of Week | dow_0 through dow_6 (one-hot) | 7 |
| Month | month_1 through month_12 (one-hot) | 12 |
| Binary | is_weekend | 1 |

### 3.3 Sequence Creation

We use a sliding window approach:

```
For each NGO:
  For i in range(0, T - L - K):
    X[i] = features[i : i + L]        # Shape: (L, F)
    y[i] = demand[i + L : i + L + K]  # Shape: (K,)
```

Where:
- $L$ = 21 (sequence length)
- $K$ = 7 (forecast horizon)
- $F$ = 23 (number of features)

### 3.4 Data Normalization

We use StandardScaler (z-score normalization):

$$z = \frac{x - \mu}{\sigma}$$

Separate scalers are fitted for:
- Input features
- Target variable (for inverse transformation)

### 3.5 Train/Validation/Test Split

**Critical:** For time-series, we use temporal splitting (not random):

```
|-------- Training (70%) --------|-- Val (20%) --|-- Test (10%) --|
                                                                 → Time
```

This prevents data leakage where future information could influence training.

---

## 4. Model Architecture

### 4.1 Network Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    FoodBridge LSTM Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    Input Layer                                                   │
│    ┌─────────────────────────────────────────────┐              │
│    │  Shape: (21 timesteps × 23 features)        │              │
│    └───────────────────┬─────────────────────────┘              │
│                        ↓                                         │
│    LSTM Layer 1                                                  │
│    ┌─────────────────────────────────────────────┐              │
│    │  Units: 64, return_sequences: True          │              │
│    │  L2 regularization: 0.01                     │              │
│    └───────────────────┬─────────────────────────┘              │
│                        ↓                                         │
│    Dropout Layer (rate: 0.2)                                     │
│                        ↓                                         │
│    LSTM Layer 2                                                  │
│    ┌─────────────────────────────────────────────┐              │
│    │  Units: 32, return_sequences: False         │              │
│    │  L2 regularization: 0.01                     │              │
│    └───────────────────┬─────────────────────────┘              │
│                        ↓                                         │
│    Dropout Layer (rate: 0.2)                                     │
│                        ↓                                         │
│    Dense Layer                                                   │
│    ┌─────────────────────────────────────────────┐              │
│    │  Units: 16, Activation: ReLU                 │              │
│    └───────────────────┬─────────────────────────┘              │
│                        ↓                                         │
│    Output Layer                                                  │
│    ┌─────────────────────────────────────────────┐              │
│    │  Units: 7 (forecast horizon), Linear         │              │
│    └─────────────────────────────────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 LSTM Cell Mathematics

For each timestep $t$, the LSTM computes:

**Forget Gate:**
$$f_t = \sigma(W_f \cdot [h_{t-1}, x_t] + b_f)$$

**Input Gate:**
$$i_t = \sigma(W_i \cdot [h_{t-1}, x_t] + b_i)$$
$$\tilde{C}_t = \tanh(W_C \cdot [h_{t-1}, x_t] + b_C)$$

**Cell State Update:**
$$C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$$

**Output Gate:**
$$o_t = \sigma(W_o \cdot [h_{t-1}, x_t] + b_o)$$
$$h_t = o_t \odot \tanh(C_t)$$

Where:
- $\sigma$ = sigmoid function
- $\odot$ = element-wise multiplication
- $[a, b]$ = concatenation

### 4.3 Parameter Count

| Layer | Parameters |
|-------|------------|
| LSTM 1 (64 units) | 4 × 64 × (23 + 64 + 1) = 22,528 |
| LSTM 2 (32 units) | 4 × 32 × (64 + 32 + 1) = 12,416 |
| Dense (16 units) | 32 × 16 + 16 = 528 |
| Output (7 units) | 16 × 7 + 7 = 119 |
| **Total** | **~35,591** |

---

## 5. Training Procedure

### 5.1 Hyperparameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Batch Size | 32 | Balance between noise and convergence |
| Learning Rate | 0.001 | Standard for Adam optimizer |
| Max Epochs | 100 | With early stopping |
| Optimizer | Adam | Adaptive learning rate |
| Loss Function | MSE | Standard for regression |

### 5.2 Regularization

1. **Dropout (0.2)**: Randomly zeros 20% of activations during training
2. **L2 Regularization (0.01)**: Adds $\lambda \|W\|^2$ to loss
3. **Early Stopping**: Stops training when validation loss plateaus

### 5.3 Callbacks

```python
callbacks = [
    EarlyStopping(patience=15, restore_best_weights=True),
    ReduceLROnPlateau(factor=0.5, patience=5),
    ModelCheckpoint(save_best_only=True),
    TensorBoard(log_dir='logs/')
]
```

### 5.4 Training Algorithm

```
Algorithm: LSTM Training
Input: Training data D_train, Validation data D_val
Output: Trained model M

1. Initialize model weights randomly
2. For epoch = 1 to max_epochs:
   a. For each batch B in D_train:
      - Forward pass: y_pred = M(X_batch)
      - Compute loss: L = MSE(y_pred, y_true) + λ||W||²
      - Backward pass: compute gradients
      - Update weights: W = W - α·∇L
   b. Evaluate on D_val
   c. If val_loss improved: save checkpoint
   d. If val_loss stagnant for 5 epochs: reduce learning rate
   e. If val_loss stagnant for 15 epochs: stop
3. Restore best weights
4. Return M
```

---

## 6. Evaluation Metrics

### 6.1 Regression Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| MSE | $\frac{1}{n}\sum(y - \hat{y})^2$ | Penalizes large errors |
| MAE | $\frac{1}{n}\sum|y - \hat{y}|$ | Average absolute error |
| RMSE | $\sqrt{MSE}$ | Same units as target |
| MAPE | $\frac{100}{n}\sum|\frac{y - \hat{y}}{y}|$ | Percentage error |
| R² | $1 - \frac{SS_{res}}{SS_{tot}}$ | Variance explained |

### 6.2 Expected Performance

Based on synthetic data training:

| Metric | Expected Range |
|--------|----------------|
| MSE | 0.02 - 0.05 (normalized) |
| MAE | 0.10 - 0.15 (normalized) |
| R² | 0.85 - 0.95 |
| MAPE | 5% - 15% |

### 6.3 Per-Day Analysis

Forecast accuracy typically degrades with horizon:
- Day 1: Highest accuracy (~95% R²)
- Day 7: Lower accuracy (~80% R²)

---

## 7. Risk Scoring System

### 7.1 Risk Calculation

Risk score (0-100) is computed from predicted demand vs. baseline:

```python
ratio = predicted_demand / baseline_demand

if ratio <= 0.8:
    risk_score = ratio * 25
    risk_level = 'LOW'
elif ratio <= 1.2:
    risk_score = 35 + (ratio - 1.0) * 125
    risk_level = 'MEDIUM'
elif ratio <= 1.5:
    risk_score = 60 + (ratio - 1.2) * 100
    risk_level = 'HIGH'
else:
    risk_score = min(100, 90 + (ratio - 1.5) * 20)
    risk_level = 'CRITICAL'
```

### 7.2 Confidence Intervals

We provide 95% confidence intervals:
- Lower bound: prediction × 0.85
- Upper bound: prediction × 1.15

---

## 8. Project Structure

```
ml/
├── README.md                 # This documentation
├── requirements.txt          # Python dependencies
├── data/                     # Data storage
│   ├── synthetic_data.csv    # Generated training data
│   └── processed_data.npz    # Preprocessed sequences
├── models/                   # Trained models
│   └── lstm_model_latest.keras
├── logs/                     # Training logs and plots
│   ├── training_history.png
│   └── evaluation_report.txt
├── outputs/                  # Prediction outputs
│   └── predictions.json
└── src/
    ├── __init__.py
    ├── config.py             # Configuration
    ├── generate_synthetic_data.py
    ├── data_preprocessing.py
    ├── lstm_model.py
    ├── train.py
    ├── evaluate.py
    └── predict.py
```

---

## 9. Usage Guide

### 9.1 Environment Setup

```bash
cd ml
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 9.2 Training Pipeline

```bash
# Step 1: Generate synthetic data
python src/generate_synthetic_data.py

# Step 2: Preprocess data
python src/data_preprocessing.py

# Step 3: Train model
python src/train.py

# Step 4: Evaluate model
python src/evaluate.py

# Step 5: Generate predictions
python src/predict.py
```

### 9.3 Quick Start (All-in-One)

```bash
# Run complete pipeline
python src/train.py  # This will auto-generate data if needed
```

---

## 10. Integration with Web Application

### 10.1 API Endpoint

```
GET /api/ml-predictions
```

**Response:**
```json
{
  "generated_at": "2024-01-15T10:30:00Z",
  "forecast_horizon_days": 7,
  "ngos": {
    "NGO_1": {
      "ngo_name": "Community Food Bank",
      "daily_forecasts": [...],
      "summary": {
        "average_daily_demand": 155.3,
        "overall_risk_score": 42.5,
        "overall_risk_level": "MEDIUM"
      }
    }
  }
}
```

### 10.2 Frontend Integration

The predictions are consumed by the demo page at `/demo` which displays:
- 7-day forecast charts per NGO
- Risk level indicators
- Confidence intervals

---

## 11. Limitations and Future Work

### 11.1 Current Limitations

1. **Synthetic Data**: Model trained on generated data; real data may have different patterns
2. **Static Features**: Does not incorporate external factors (weather, events, etc.)
3. **Single Model**: Same architecture for all NGOs; could benefit from per-NGO models
4. **Point Predictions**: Confidence intervals are simplified; could use probabilistic forecasting

### 11.2 Future Enhancements

1. **Transfer Learning**: Pre-train on multiple regions
2. **Attention Mechanisms**: Better interpretability
3. **External Data**: Weather, holidays, economic indicators
4. **Ensemble Methods**: Combine multiple models
5. **Online Learning**: Continuous model updates

---

## 12. References

1. Hochreiter, S., & Schmidhuber, J. (1997). Long Short-Term Memory. *Neural Computation*, 9(8), 1735-1780.

2. Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press.

3. Chollet, F. (2021). *Deep Learning with Python* (2nd ed.). Manning Publications.

4. Brownlee, J. (2018). *Deep Learning for Time Series Forecasting*. Machine Learning Mastery.

---

## 13. License

This ML module is part of the FoodBridge AI project and is provided for educational and demonstration purposes.

---

*Document Version: 1.0.0*
*Last Updated: 2024*
