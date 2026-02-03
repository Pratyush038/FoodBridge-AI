import { NextRequest, NextResponse } from 'next/server';

/**
 * =============================================================================
 * FoodBridge AI - ML Predictions API Route
 * =============================================================================
 * 
 * This API endpoint serves LSTM model predictions for food demand forecasting.
 * It provides a bridge between the Python ML backend and the Next.js frontend.
 * 
 * IMPORTANT NOTE:
 * ---------------
 * This is a SEPARATE, OPTIONAL prediction layer that does NOT modify any
 * existing production code, APIs, or database schemas. It reads prediction
 * results from the ML module's output files.
 * 
 * In a production environment, you would either:
 * 1. Run the Python prediction script via a subprocess
 * 2. Use a Python microservice (Flask/FastAPI) alongside Next.js
 * 3. Pre-compute predictions on a schedule and serve from cache/database
 * 
 * For this demo, we serve pre-computed predictions from JSON files.
 * 
 * Endpoints:
 * - GET /api/ml-predictions - Get latest predictions for all NGOs
 * - GET /api/ml-predictions?ngo=NGO_1 - Get predictions for specific NGO
 * 
 * @author FoodBridge AI Team
 * @version 1.0.0
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface DailyForecast {
  date: string;
  day_index: number;
  predicted_demand: number;
  lower_bound_95: number;
  upper_bound_95: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface NGOPrediction {
  ngo_name: string;
  daily_forecasts: DailyForecast[];
  summary: {
    average_daily_demand: number;
    max_daily_demand: number;
    total_7day_demand: number;
    overall_risk_score: number;
    overall_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

interface PredictionsResponse {
  generated_at: string;
  forecast_start: string;
  forecast_horizon_days: number;
  model_version: string;
  ngos: Record<string, NGOPrediction>;
}

// =============================================================================
// MOCK PREDICTIONS DATA
// =============================================================================

/**
 * Generate mock predictions data for demonstration.
 * 
 * In production, this would read from:
 * 1. Pre-computed JSON files from ML pipeline
 * 2. A database table with cached predictions
 * 3. A real-time prediction service
 */
function generateMockPredictions(): PredictionsResponse {
  const today = new Date();
  const forecastStart = today.toISOString().split('T')[0];
  
  // NGO configurations (matching Python config)
  const ngoConfigs = [
    { id: 'NGO_1', name: 'Community Food Bank', baseDemand: 150, volatility: 0.15 },
    { id: 'NGO_2', name: 'Urban Shelter Network', baseDemand: 200, volatility: 0.25 },
    { id: 'NGO_3', name: 'Children\'s Nutrition Center', baseDemand: 80, volatility: 0.10 },
    { id: 'NGO_4', name: 'Senior Care Foundation', baseDemand: 120, volatility: 0.12 },
    { id: 'NGO_5', name: 'Emergency Relief Hub', baseDemand: 100, volatility: 0.30 },
  ];
  
  const ngos: Record<string, NGOPrediction> = {};
  
  for (const ngo of ngoConfigs) {
    const dailyForecasts: DailyForecast[] = [];
    let totalDemand = 0;
    let maxDemand = 0;
    
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + dayIdx + 1);
      
      // Generate realistic demand with some randomness
      const dayOfWeek = forecastDate.getDay();
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.85 : 1.0;
      const randomFactor = 1 + (Math.random() - 0.5) * ngo.volatility * 2;
      
      const predictedDemand = Math.round(
        ngo.baseDemand * weekendFactor * randomFactor * 10
      ) / 10;
      
      const lowerBound = Math.round(predictedDemand * 0.85 * 10) / 10;
      const upperBound = Math.round(predictedDemand * 1.15 * 10) / 10;
      
      // Calculate risk score
      const ratio = predictedDemand / ngo.baseDemand;
      let riskScore: number;
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      
      if (ratio <= 0.8) {
        riskScore = ratio * 25;
        riskLevel = 'LOW';
      } else if (ratio <= 1.0) {
        riskScore = 20 + (ratio - 0.8) * 75;
        riskLevel = 'MEDIUM';
      } else if (ratio <= 1.2) {
        riskScore = 35 + (ratio - 1.0) * 125;
        riskLevel = 'MEDIUM';
      } else if (ratio <= 1.5) {
        riskScore = 60 + (ratio - 1.2) * 100;
        riskLevel = 'HIGH';
      } else {
        riskScore = Math.min(100, 90 + (ratio - 1.5) * 20);
        riskLevel = 'CRITICAL';
      }
      
      dailyForecasts.push({
        date: forecastDate.toISOString().split('T')[0],
        day_index: dayIdx + 1,
        predicted_demand: predictedDemand,
        lower_bound_95: lowerBound,
        upper_bound_95: upperBound,
        risk_score: Math.round(riskScore * 10) / 10,
        risk_level: riskLevel,
      });
      
      totalDemand += predictedDemand;
      maxDemand = Math.max(maxDemand, predictedDemand);
    }
    
    const avgDemand = totalDemand / 7;
    const avgRatio = avgDemand / ngo.baseDemand;
    let overallRiskScore: number;
    let overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    
    if (avgRatio <= 0.8) {
      overallRiskScore = avgRatio * 25;
      overallRiskLevel = 'LOW';
    } else if (avgRatio <= 1.0) {
      overallRiskScore = 20 + (avgRatio - 0.8) * 75;
      overallRiskLevel = 'MEDIUM';
    } else if (avgRatio <= 1.2) {
      overallRiskScore = 35 + (avgRatio - 1.0) * 125;
      overallRiskLevel = 'MEDIUM';
    } else if (avgRatio <= 1.5) {
      overallRiskScore = 60 + (avgRatio - 1.2) * 100;
      overallRiskLevel = 'HIGH';
    } else {
      overallRiskScore = Math.min(100, 90 + (avgRatio - 1.5) * 20);
      overallRiskLevel = 'CRITICAL';
    }
    
    ngos[ngo.id] = {
      ngo_name: ngo.name,
      daily_forecasts: dailyForecasts,
      summary: {
        average_daily_demand: Math.round(avgDemand * 10) / 10,
        max_daily_demand: Math.round(maxDemand * 10) / 10,
        total_7day_demand: Math.round(totalDemand * 10) / 10,
        overall_risk_score: Math.round(overallRiskScore * 10) / 10,
        overall_risk_level: overallRiskLevel,
      },
    };
  }
  
  return {
    generated_at: new Date().toISOString(),
    forecast_start: forecastStart,
    forecast_horizon_days: 7,
    model_version: '1.0.0-demo',
    ngos,
  };
}

// =============================================================================
// API HANDLERS
// =============================================================================

/**
 * GET /api/ml-predictions
 * 
 * Returns LSTM model predictions for food demand forecasting.
 * 
 * Query Parameters:
 * - ngo: (optional) Filter to specific NGO ID
 * - format: (optional) 'summary' for condensed response
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ngoFilter = searchParams.get('ngo');
    const format = searchParams.get('format');
    
    // Generate predictions (in production, load from cache/file)
    const predictions = generateMockPredictions();
    
    // Filter by NGO if requested
    if (ngoFilter) {
      if (!predictions.ngos[ngoFilter]) {
        return NextResponse.json(
          { 
            error: 'NGO not found',
            message: `No predictions available for ${ngoFilter}`,
            available_ngos: Object.keys(predictions.ngos)
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        generated_at: predictions.generated_at,
        forecast_start: predictions.forecast_start,
        forecast_horizon_days: predictions.forecast_horizon_days,
        model_version: predictions.model_version,
        ngo_id: ngoFilter,
        ...predictions.ngos[ngoFilter]
      });
    }
    
    // Return summary format if requested
    if (format === 'summary') {
      const summary = Object.entries(predictions.ngos).map(([id, data]) => ({
        ngo_id: id,
        ngo_name: data.ngo_name,
        ...data.summary
      }));
      
      return NextResponse.json({
        generated_at: predictions.generated_at,
        forecast_start: predictions.forecast_start,
        forecast_horizon_days: predictions.forecast_horizon_days,
        model_version: predictions.model_version,
        predictions: summary
      });
    }
    
    // Return full predictions
    return NextResponse.json(predictions);
    
  } catch (error) {
    console.error('ML Predictions API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to generate predictions'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ml-predictions
 * 
 * Trigger a new prediction run (for future implementation).
 * In production, this would:
 * 1. Queue a prediction job
 * 2. Run the Python ML pipeline
 * 3. Store results in cache/database
 */
export async function POST(request: NextRequest) {
  try {
    // For demo, just return fresh predictions
    const predictions = generateMockPredictions();
    
    return NextResponse.json({
      status: 'success',
      message: 'Predictions generated successfully',
      predictions
    });
    
  } catch (error) {
    console.error('ML Predictions API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to generate predictions'
      },
      { status: 500 }
    );
  }
}
