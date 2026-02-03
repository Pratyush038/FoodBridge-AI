/**
 * =============================================================================
 * FoodBridge AI - ML Integration Service
 * =============================================================================
 * 
 * This service provides a clean interface for integrating LSTM predictions
 * into the existing FoodBridge AI application. It serves as the bridge
 * between the ML backend and the frontend components.
 * 
 * IMPORTANT: This is a SEPARATE, OPTIONAL layer that:
 * - Does NOT modify any existing production code
 * - Does NOT alter database schemas
 * - Provides read-only access to ML predictions
 * - Can be enabled/disabled without affecting core functionality
 * 
 * @author FoodBridge AI Team
 * @version 1.0.0
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface DailyForecast {
  date: string;
  dayIndex: number;
  predictedDemand: number;
  lowerBound95: number;
  upperBound95: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface NGOForecastSummary {
  averageDailyDemand: number;
  maxDailyDemand: number;
  total7DayDemand: number;
  overallRiskScore: number;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface NGOPrediction {
  ngoId: string;
  ngoName: string;
  dailyForecasts: DailyForecast[];
  summary: NGOForecastSummary;
}

export interface MLPredictionsResponse {
  generatedAt: string;
  forecastStart: string;
  forecastHorizonDays: number;
  modelVersion: string;
  predictions: NGOPrediction[];
  status: 'success' | 'error' | 'stale';
  message?: string;
}

export interface HungerHotspot {
  ngoId: string;
  ngoName: string;
  location?: {
    lat: number;
    lng: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  predictedDemand: number;
  forecastDate: string;
  confidence: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const ML_API_BASE_URL = '/api/ml-predictions';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// NGO Location data (for mapping predictions to locations)
const NGO_LOCATIONS: Record<string, { lat: number; lng: number; city: string }> = {
  'NGO_1': { lat: 19.0760, lng: 72.8777, city: 'Mumbai' },
  'NGO_2': { lat: 28.7041, lng: 77.1025, city: 'Delhi' },
  'NGO_3': { lat: 13.0827, lng: 80.2707, city: 'Chennai' },
  'NGO_4': { lat: 22.5726, lng: 88.3639, city: 'Kolkata' },
  'NGO_5': { lat: 12.9716, lng: 77.5946, city: 'Bangalore' },
};

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class PredictionCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    // Check if cache is stale
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const predictionCache = new PredictionCache();

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch ML predictions from the API.
 * 
 * @param ngoId - Optional NGO ID to filter predictions
 * @returns Promise with predictions response
 */
export async function fetchMLPredictions(
  ngoId?: string
): Promise<MLPredictionsResponse> {
  const cacheKey = `predictions_${ngoId || 'all'}`;
  
  // Check cache first
  const cached = predictionCache.get<MLPredictionsResponse>(cacheKey);
  if (cached) {
    return { ...cached, status: 'success' };
  }
  
  try {
    const url = ngoId 
      ? `${ML_API_BASE_URL}?ngo=${ngoId}`
      : ML_API_BASE_URL;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform API response to our interface
    const predictions = transformAPIResponse(data);
    
    // Cache the result
    predictionCache.set(cacheKey, predictions);
    
    return predictions;
    
  } catch (error) {
    console.error('Failed to fetch ML predictions:', error);
    return {
      generatedAt: new Date().toISOString(),
      forecastStart: new Date().toISOString().split('T')[0],
      forecastHorizonDays: 7,
      modelVersion: 'error',
      predictions: [],
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Transform API response to our internal format.
 */
function transformAPIResponse(apiData: Record<string, unknown>): MLPredictionsResponse {
  const ngos = apiData.ngos as Record<string, unknown>;
  
  const predictions: NGOPrediction[] = Object.entries(ngos || {}).map(
    ([ngoId, ngoData]) => {
      const data = ngoData as Record<string, unknown>;
      const dailyForecasts = (data.daily_forecasts as Array<Record<string, unknown>>).map(
        (forecast) => ({
          date: forecast.date as string,
          dayIndex: forecast.day_index as number,
          predictedDemand: forecast.predicted_demand as number,
          lowerBound95: forecast.lower_bound_95 as number,
          upperBound95: forecast.upper_bound_95 as number,
          riskScore: forecast.risk_score as number,
          riskLevel: forecast.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        })
      );
      
      const summary = data.summary as Record<string, unknown>;
      
      return {
        ngoId,
        ngoName: data.ngo_name as string,
        dailyForecasts,
        summary: {
          averageDailyDemand: summary.average_daily_demand as number,
          maxDailyDemand: summary.max_daily_demand as number,
          total7DayDemand: summary.total_7day_demand as number,
          overallRiskScore: summary.overall_risk_score as number,
          overallRiskLevel: summary.overall_risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        },
      };
    }
  );
  
  return {
    generatedAt: apiData.generated_at as string,
    forecastStart: apiData.forecast_start as string,
    forecastHorizonDays: apiData.forecast_horizon_days as number,
    modelVersion: apiData.model_version as string,
    predictions,
    status: 'success',
  };
}

// =============================================================================
// HIGH-LEVEL FUNCTIONS
// =============================================================================

/**
 * Get hunger hotspots based on ML predictions.
 * Returns NGOs sorted by risk level.
 * 
 * @param dayOffset - Which day to get hotspots for (0 = tomorrow, 6 = 7 days out)
 * @returns Array of hunger hotspots
 */
export async function getHungerHotspots(
  dayOffset: number = 0
): Promise<HungerHotspot[]> {
  const response = await fetchMLPredictions();
  
  if (response.status !== 'success' || !response.predictions.length) {
    return [];
  }
  
  const hotspots: HungerHotspot[] = response.predictions.map((prediction) => {
    const dayForecast = prediction.dailyForecasts[dayOffset] || prediction.dailyForecasts[0];
    const location = NGO_LOCATIONS[prediction.ngoId];
    
    return {
      ngoId: prediction.ngoId,
      ngoName: prediction.ngoName,
      location: location ? { lat: location.lat, lng: location.lng } : undefined,
      riskLevel: dayForecast.riskLevel,
      riskScore: dayForecast.riskScore,
      predictedDemand: dayForecast.predictedDemand,
      forecastDate: dayForecast.date,
      confidence: 0.95, // 95% confidence interval
    };
  });
  
  // Sort by risk score (highest first)
  return hotspots.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Get critical hotspots (HIGH or CRITICAL risk).
 * 
 * @returns Array of critical hunger hotspots
 */
export async function getCriticalHotspots(): Promise<HungerHotspot[]> {
  const hotspots = await getHungerHotspots();
  return hotspots.filter(
    (h) => h.riskLevel === 'HIGH' || h.riskLevel === 'CRITICAL'
  );
}

/**
 * Get forecast summary for a specific NGO.
 * 
 * @param ngoId - NGO identifier
 * @returns NGO prediction or null if not found
 */
export async function getNGOForecast(ngoId: string): Promise<NGOPrediction | null> {
  const response = await fetchMLPredictions();
  
  if (response.status !== 'success') {
    return null;
  }
  
  return response.predictions.find((p) => p.ngoId === ngoId) || null;
}

/**
 * Get aggregated demand forecast.
 * 
 * @returns Object with total demand predictions
 */
export async function getAggregatedForecast(): Promise<{
  totalDemand7Days: number;
  averageDailyDemand: number;
  peakDay: { date: string; demand: number };
  criticalNGOCount: number;
}> {
  const response = await fetchMLPredictions();
  
  if (response.status !== 'success' || !response.predictions.length) {
    return {
      totalDemand7Days: 0,
      averageDailyDemand: 0,
      peakDay: { date: '', demand: 0 },
      criticalNGOCount: 0,
    };
  }
  
  let totalDemand = 0;
  let peakDemand = 0;
  let peakDate = '';
  let criticalCount = 0;
  
  // Aggregate across all NGOs and days
  for (const prediction of response.predictions) {
    totalDemand += prediction.summary.total7DayDemand;
    
    if (prediction.summary.overallRiskLevel === 'CRITICAL') {
      criticalCount++;
    }
    
    for (const forecast of prediction.dailyForecasts) {
      if (forecast.predictedDemand > peakDemand) {
        peakDemand = forecast.predictedDemand;
        peakDate = forecast.date;
      }
    }
  }
  
  return {
    totalDemand7Days: Math.round(totalDemand),
    averageDailyDemand: Math.round(totalDemand / 7),
    peakDay: { date: peakDate, demand: Math.round(peakDemand) },
    criticalNGOCount: criticalCount,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get risk level color for UI display.
 */
export function getRiskLevelColor(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
  const colors = {
    LOW: '#10B981',      // Green
    MEDIUM: '#F59E0B',   // Yellow/Amber
    HIGH: '#F97316',     // Orange
    CRITICAL: '#EF4444', // Red
  };
  return colors[level];
}

/**
 * Get risk level background color (lighter variant).
 */
export function getRiskLevelBgColor(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
  const colors = {
    LOW: '#D1FAE5',      // Light green
    MEDIUM: '#FEF3C7',   // Light yellow
    HIGH: '#FFEDD5',     // Light orange
    CRITICAL: '#FEE2E2', // Light red
  };
  return colors[level];
}

/**
 * Format demand value for display.
 */
export function formatDemand(demand: number): string {
  if (demand >= 1000) {
    return `${(demand / 1000).toFixed(1)}K`;
  }
  return demand.toFixed(0);
}

/**
 * Format date for display.
 */
export function formatForecastDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
  fetchMLPredictions,
  getHungerHotspots,
  getCriticalHotspots,
  getNGOForecast,
  getAggregatedForecast,
  getRiskLevelColor,
  getRiskLevelBgColor,
  formatDemand,
  formatForecastDate,
};
