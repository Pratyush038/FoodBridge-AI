"""
=============================================================================
FoodBridge AI - Synthetic Data Generation Module
=============================================================================

This module generates realistic synthetic time-series data representing
historical food demand for 5 NGOs. The data is designed to train an LSTM
model for demand forecasting.

Academic Note:
    Synthetic data generation is a common practice when:
    1. Real data is insufficient for training deep learning models
    2. Privacy concerns prevent using actual data
    3. Controlled experiments require known ground truth
    
    Our synthetic data incorporates:
    - Weekly seasonality (day-of-week patterns)
    - Monthly/annual seasonality (weather, festivals)
    - NGO-specific demand profiles
    - Random noise and occasional spikes (events/emergencies)
    - Long-term trends

Data Generation Methodology:
    For each NGO i and day t:
    
    demand(i,t) = base_demand(i) 
                  × weekly_factor(day_of_week)
                  × seasonal_factor(month)
                  × (1 + trend(i) × t)
                  × (1 + noise)
                  × special_event_multiplier (if event)
    
    Where noise ~ N(0, volatility²)

Author: FoodBridge AI Team
Version: 1.0.0
=============================================================================
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Tuple, Optional
import logging

# Import configuration
from config import (
    NGO_CONFIGS,
    DATA_GEN_CONFIG,
    SYNTHETIC_DATA_PATH,
    NGOConfig
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# =============================================================================
# SYNTHETIC DATA GENERATION FUNCTIONS
# =============================================================================

def generate_date_range(start_date: str, end_date: str) -> pd.DatetimeIndex:
    """
    Generate a date range for the synthetic dataset.
    
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        
    Returns:
        DatetimeIndex with daily frequency
    """
    return pd.date_range(start=start_date, end=end_date, freq='D')


def get_weekly_factor(day_of_week: int, ngo_config: NGOConfig) -> float:
    """
    Get the weekly seasonality factor for a specific day.
    
    Args:
        day_of_week: Integer 0-6 (Monday=0, Sunday=6)
        ngo_config: NGO configuration with weekly patterns
        
    Returns:
        Multiplier for the day
    """
    return ngo_config.weekly_pattern[day_of_week]


def get_seasonal_factor(month: int) -> float:
    """
    Get the seasonal (monthly) factor.
    
    Academic Note:
        Seasonal patterns in food demand are influenced by:
        - Weather (winter increases outdoor feeding needs)
        - Festivals (Diwali, Christmas increase charitable giving)
        - School schedules (mid-day meal programs)
        - Agricultural cycles
    
    Args:
        month: Integer 1-12
        
    Returns:
        Seasonal multiplier
    """
    return DATA_GEN_CONFIG.seasonal_factors[month - 1]


def generate_special_event_multiplier(rng: np.random.Generator) -> float:
    """
    Generate a multiplier for special events (festivals, emergencies).
    
    Args:
        rng: Random number generator
        
    Returns:
        Multiplier (1.0 if no event, higher if event)
    """
    if rng.random() < DATA_GEN_CONFIG.special_event_probability:
        return rng.uniform(*DATA_GEN_CONFIG.special_event_multiplier_range)
    return 1.0


def generate_urgency_score(
    demand_ratio: float,
    day_of_week: int,
    rng: np.random.Generator
) -> float:
    """
    Generate an urgency score based on demand level.
    
    Academic Note:
        Urgency is modeled as a function of:
        - Current demand relative to capacity
        - Day of week (weekends may have different urgency)
        - Random component for unexpected situations
    
    Args:
        demand_ratio: Ratio of demand to base demand
        day_of_week: Integer 0-6
        rng: Random number generator
        
    Returns:
        Urgency score between 0 and 1
    """
    # Base urgency from demand ratio
    base_urgency = min(1.0, max(0.0, (demand_ratio - 0.7) / 0.6))
    
    # Weekend adjustment (slightly higher urgency due to skeleton staff)
    weekend_factor = 1.1 if day_of_week >= 5 else 1.0
    
    # Add noise
    noise = rng.normal(0, 0.1)
    
    urgency = base_urgency * weekend_factor + noise
    return min(1.0, max(0.0, urgency))


def generate_number_of_requests(
    total_demand: float,
    base_demand: float,
    rng: np.random.Generator
) -> int:
    """
    Generate the number of individual requests for a day.
    
    Academic Note:
        We assume each request is for ~20-50 kg on average.
        Higher demand days have more requests.
    
    Args:
        total_demand: Total food demand for the day
        base_demand: NGO's base daily demand
        rng: Random number generator
        
    Returns:
        Number of requests (integer)
    """
    avg_request_size = rng.uniform(20, 50)
    base_requests = total_demand / avg_request_size
    # Add some randomness
    return max(1, int(base_requests + rng.normal(0, base_requests * 0.2)))


def generate_ngo_daily_data(
    date: pd.Timestamp,
    ngo_config: NGOConfig,
    day_index: int,
    rng: np.random.Generator
) -> dict:
    """
    Generate one day's data for a single NGO.
    
    Args:
        date: The date for this data point
        ngo_config: NGO configuration
        day_index: Days since start (for trend calculation)
        rng: Random number generator
        
    Returns:
        Dictionary with day's data
    """
    # Extract date components
    day_of_week = date.dayofweek
    month = date.month
    
    # Calculate demand multipliers
    weekly_factor = get_weekly_factor(day_of_week, ngo_config)
    seasonal_factor = get_seasonal_factor(month)
    trend_factor = 1 + (ngo_config.trend * day_index)
    event_multiplier = generate_special_event_multiplier(rng)
    
    # Generate noise
    noise = rng.normal(0, ngo_config.volatility)
    
    # Calculate total food requested
    total_demand = (
        ngo_config.base_demand
        * weekly_factor
        * seasonal_factor
        * trend_factor
        * (1 + noise)
        * event_multiplier
    )
    total_demand = max(0, total_demand)  # Ensure non-negative
    
    # Generate derived features
    demand_ratio = total_demand / ngo_config.base_demand
    urgency_score = generate_urgency_score(demand_ratio, day_of_week, rng)
    num_requests = generate_number_of_requests(
        total_demand, ngo_config.base_demand, rng
    )
    
    return {
        'date': date,
        'ngo_id': ngo_config.ngo_id,
        'ngo_name': ngo_config.name,
        'total_food_requested': round(total_demand, 2),
        'number_of_requests': num_requests,
        'urgency_score': round(urgency_score, 4),
        'day_of_week': day_of_week,
        'day_name': date.day_name(),
        'month': month,
        'is_weekend': int(day_of_week >= 5),
        'seasonal_factor': seasonal_factor,
        'weekly_factor': weekly_factor,
        'has_special_event': int(event_multiplier > 1.0)
    }


def generate_synthetic_dataset() -> pd.DataFrame:
    """
    Generate the complete synthetic dataset for all NGOs.
    
    Returns:
        DataFrame with synthetic demand data
    """
    logger.info("Starting synthetic data generation...")
    
    # Set random seed for reproducibility
    rng = np.random.default_rng(DATA_GEN_CONFIG.random_seed)
    
    # Generate date range
    dates = generate_date_range(
        DATA_GEN_CONFIG.start_date,
        DATA_GEN_CONFIG.end_date
    )
    logger.info(f"Date range: {dates[0]} to {dates[-1]} ({len(dates)} days)")
    
    # Generate data for each NGO
    all_data = []
    
    for ngo_config in NGO_CONFIGS:
        logger.info(f"Generating data for {ngo_config.ngo_id}: {ngo_config.name}")
        
        for day_index, date in enumerate(dates):
            daily_data = generate_ngo_daily_data(
                date, ngo_config, day_index, rng
            )
            all_data.append(daily_data)
    
    # Create DataFrame
    df = pd.DataFrame(all_data)
    
    # Sort by date and NGO
    df = df.sort_values(['date', 'ngo_id']).reset_index(drop=True)
    
    logger.info(f"Generated {len(df)} total records")
    logger.info(f"Records per NGO: {len(df) // len(NGO_CONFIGS)}")
    
    return df


def validate_synthetic_data(df: pd.DataFrame) -> bool:
    """
    Validate the generated synthetic data.
    
    Args:
        df: Generated DataFrame
        
    Returns:
        True if validation passes
    """
    logger.info("Validating synthetic data...")
    
    # Check for missing values
    if df.isnull().any().any():
        logger.error("Found missing values in data")
        return False
    
    # Check for negative demands
    if (df['total_food_requested'] < 0).any():
        logger.error("Found negative demand values")
        return False
    
    # Check urgency score range
    if not ((df['urgency_score'] >= 0) & (df['urgency_score'] <= 1)).all():
        logger.error("Urgency scores outside [0, 1] range")
        return False
    
    # Check all NGOs present
    if len(df['ngo_id'].unique()) != len(NGO_CONFIGS):
        logger.error("Missing NGO data")
        return False
    
    # Print summary statistics
    logger.info("\nData Summary:")
    for ngo_id in df['ngo_id'].unique():
        ngo_data = df[df['ngo_id'] == ngo_id]
        logger.info(f"\n{ngo_id}:")
        logger.info(f"  Total Food Requested:")
        logger.info(f"    Mean: {ngo_data['total_food_requested'].mean():.2f}")
        logger.info(f"    Std:  {ngo_data['total_food_requested'].std():.2f}")
        logger.info(f"    Min:  {ngo_data['total_food_requested'].min():.2f}")
        logger.info(f"    Max:  {ngo_data['total_food_requested'].max():.2f}")
        logger.info(f"  Avg Requests/Day: {ngo_data['number_of_requests'].mean():.1f}")
        logger.info(f"  Avg Urgency: {ngo_data['urgency_score'].mean():.3f}")
    
    logger.info("\nValidation passed!")
    return True


def save_synthetic_data(df: pd.DataFrame, filepath: Optional[str] = None):
    """
    Save the synthetic dataset to CSV.
    
    Args:
        df: DataFrame to save
        filepath: Optional custom filepath
    """
    save_path = filepath or SYNTHETIC_DATA_PATH
    df.to_csv(save_path, index=False)
    logger.info(f"Saved synthetic data to {save_path}")


def load_synthetic_data(filepath: Optional[str] = None) -> pd.DataFrame:
    """
    Load synthetic dataset from CSV.
    
    Args:
        filepath: Optional custom filepath
        
    Returns:
        DataFrame with synthetic data
    """
    load_path = filepath or SYNTHETIC_DATA_PATH
    df = pd.read_csv(load_path, parse_dates=['date'])
    logger.info(f"Loaded {len(df)} records from {load_path}")
    return df


# =============================================================================
# VISUALIZATION FUNCTIONS (for analysis)
# =============================================================================

def plot_demand_overview(df: pd.DataFrame, save_path: Optional[str] = None):
    """
    Create overview plots of the synthetic data.
    
    Args:
        df: Synthetic data DataFrame
        save_path: Optional path to save the figure
    """
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        fig, axes = plt.subplots(3, 2, figsize=(14, 12))
        
        # 1. Time series for each NGO
        ax1 = axes[0, 0]
        for ngo_id in df['ngo_id'].unique():
            ngo_data = df[df['ngo_id'] == ngo_id]
            ax1.plot(ngo_data['date'], ngo_data['total_food_requested'], 
                    label=ngo_id, alpha=0.7)
        ax1.set_title('Food Demand Over Time by NGO')
        ax1.set_xlabel('Date')
        ax1.set_ylabel('Food Requested (kg)')
        ax1.legend()
        
        # 2. Weekly pattern
        ax2 = axes[0, 1]
        weekly_avg = df.groupby(['ngo_id', 'day_of_week'])['total_food_requested'].mean().unstack()
        weekly_avg.plot(kind='bar', ax=ax2)
        ax2.set_title('Average Demand by Day of Week')
        ax2.set_xlabel('NGO')
        ax2.set_ylabel('Avg Food Requested (kg)')
        ax2.set_xticklabels(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
        
        # 3. Monthly pattern
        ax3 = axes[1, 0]
        monthly_avg = df.groupby('month')['total_food_requested'].mean()
        monthly_avg.plot(kind='bar', ax=ax3, color='steelblue')
        ax3.set_title('Average Demand by Month (All NGOs)')
        ax3.set_xlabel('Month')
        ax3.set_ylabel('Avg Food Requested (kg)')
        
        # 4. Distribution of demand
        ax4 = axes[1, 1]
        for ngo_id in df['ngo_id'].unique():
            ngo_data = df[df['ngo_id'] == ngo_id]
            ax4.hist(ngo_data['total_food_requested'], bins=30, 
                    alpha=0.5, label=ngo_id)
        ax4.set_title('Demand Distribution by NGO')
        ax4.set_xlabel('Food Requested (kg)')
        ax4.set_ylabel('Frequency')
        ax4.legend()
        
        # 5. Urgency vs Demand scatter
        ax5 = axes[2, 0]
        sample = df.sample(min(1000, len(df)))
        ax5.scatter(sample['total_food_requested'], sample['urgency_score'], 
                   alpha=0.3, c='steelblue')
        ax5.set_title('Urgency Score vs Food Demand')
        ax5.set_xlabel('Food Requested (kg)')
        ax5.set_ylabel('Urgency Score')
        
        # 6. Correlation heatmap
        ax6 = axes[2, 1]
        corr_cols = ['total_food_requested', 'number_of_requests', 
                    'urgency_score', 'day_of_week', 'month']
        corr_matrix = df[corr_cols].corr()
        sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', ax=ax6, 
                   vmin=-1, vmax=1)
        ax6.set_title('Feature Correlation Matrix')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150)
            logger.info(f"Saved visualization to {save_path}")
        
        plt.show()
        
    except ImportError:
        logger.warning("Matplotlib/Seaborn not available for visualization")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("FoodBridge AI - Synthetic Data Generation")
    print("=" * 70)
    
    # Generate data
    df = generate_synthetic_dataset()
    
    # Validate
    if validate_synthetic_data(df):
        # Save
        save_synthetic_data(df)
        
        # Show sample
        print("\nSample data (first 10 rows):")
        print(df.head(10).to_string())
        
        # Create visualization if possible
        try:
            viz_path = DATA_GEN_CONFIG.random_seed  # Just to trigger import check
            plot_demand_overview(df, str(SYNTHETIC_DATA_PATH).replace('.csv', '_viz.png'))
        except Exception as e:
            print(f"\nVisualization skipped: {e}")
    else:
        print("\nData validation failed!")
        exit(1)
    
    print("\n✓ Synthetic data generation complete!")
