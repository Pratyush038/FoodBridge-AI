/**
 * Hunger Hotspot Prediction Engine
 * 
 * This is an INDEPENDENT, READ-ONLY analytics module that predicts geographic areas
 * likely to experience food shortages in the next 3-7 days.
 * 
 * DESIGN PRINCIPLES:
 * - Completely isolated from matching engine
 * - Read-only access to historical data
 * - Simple, explainable prediction method (no heavy ML)
 * - Safe caching in Firebase
 * - Non-invasive to existing request/donation flows
 * 
 * @module hunger-hotspot-engine
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { database } from './firebase';
import { ref, set, get } from 'firebase/database';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface HotspotPrediction {
  /** Unique identifier for the region/area */
  regionId: string;
  /** Human-readable region name */
  regionName: string;
  /** Central coordinates of the region */
  center: {
    lat: number;
    lng: number;
  };
  /** Approximate radius in kilometers */
  radiusKm: number;
  /** Predicted demand score (0-100) */
  predictedDemandScore: number;
  /** Categorical risk level */
  riskLevel: RiskLevel;
  /** Confidence in the prediction (0-1) */
  confidenceScore: number;
  /** Prediction factors breakdown */
  factors: HotspotFactors;
  /** ISO timestamp when prediction was generated */
  predictedAt: string;
  /** ISO timestamp for when this prediction is valid until */
  validUntil: string;
}

export interface HotspotFactors {
  /** Weighted moving average of recent requests */
  recentDemandTrend: number;
  /** How demand has changed week-over-week */
  weekOverWeekGrowth: number;
  /** Ratio of unfulfilled to total requests */
  unfulfilledRatio: number;
  /** Average request urgency in the area */
  averageUrgency: number;
  /** NGO capacity relative to demand */
  capacityGap: number;
}

export interface RegionStats {
  regionId: string;
  regionName: string;
  center: { lat: number; lng: number };
  totalRequests: number;
  fulfilledRequests: number;
  pendingRequests: number;
  avgQuantity: number;
  urgencyBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  weeklyTrend: number[];
  ngoCapacity: number;
}

export interface HotspotCacheData {
  predictions: HotspotPrediction[];
  generatedAt: string;
  validUntil: string;
  version: string;
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

/**
 * Default grid regions for hotspot analysis
 * Based on major Indian cities where the platform operates
 */
const DEFAULT_REGIONS = [
  { id: 'bangalore-central', name: 'Bangalore Central', lat: 12.9716, lng: 77.5946, radius: 8 },
  { id: 'bangalore-east', name: 'Bangalore East (Whitefield)', lat: 12.9698, lng: 77.7499, radius: 6 },
  { id: 'bangalore-south', name: 'Bangalore South (Koramangala)', lat: 12.9352, lng: 77.6245, radius: 5 },
  { id: 'bangalore-north', name: 'Bangalore North (Yelahanka)', lat: 13.1007, lng: 77.5963, radius: 6 },
  { id: 'mumbai-central', name: 'Mumbai Central', lat: 19.0760, lng: 72.8777, radius: 8 },
  { id: 'mumbai-west', name: 'Mumbai West (Bandra)', lat: 19.0596, lng: 72.8295, radius: 5 },
  { id: 'mumbai-east', name: 'Mumbai East (Kurla)', lat: 19.0726, lng: 72.8845, radius: 5 },
  { id: 'delhi-central', name: 'Delhi Central', lat: 28.6139, lng: 77.2090, radius: 10 },
  { id: 'delhi-south', name: 'Delhi South', lat: 28.5245, lng: 77.1855, radius: 7 },
  { id: 'delhi-east', name: 'Delhi East (Noida)', lat: 28.5355, lng: 77.3910, radius: 6 },
  { id: 'chennai-central', name: 'Chennai Central', lat: 13.0827, lng: 80.2707, radius: 8 },
  { id: 'hyderabad-central', name: 'Hyderabad Central', lat: 17.3850, lng: 78.4867, radius: 8 },
  { id: 'kolkata-central', name: 'Kolkata Central', lat: 22.5726, lng: 88.3639, radius: 8 },
  { id: 'pune-central', name: 'Pune Central', lat: 18.5204, lng: 73.8567, radius: 7 },
];

/**
 * Prediction configuration
 */
const PREDICTION_CONFIG = {
  /** How many days of history to analyze */
  historyDays: 30,
  /** Prediction horizon in days */
  predictionDays: 7,
  /** Cache validity in hours */
  cacheValidityHours: 6,
  /** Minimum requests needed for reliable prediction */
  minRequestsForConfidence: 5,
};

/**
 * Risk level thresholds for demand score
 */
const RISK_THRESHOLDS = {
  HIGH: 70,
  MEDIUM: 40,
  // Below 40 is LOW
};

/**
 * Weights for demand score calculation
 */
const DEMAND_WEIGHTS = {
  recentDemandTrend: 0.30,
  weekOverWeekGrowth: 0.20,
  unfulfilledRatio: 0.25,
  averageUrgency: 0.15,
  capacityGap: 0.10,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a point falls within a region
 */
function isPointInRegion(
  lat: number, lng: number,
  regionLat: number, regionLng: number,
  radiusKm: number
): boolean {
  return calculateDistance(lat, lng, regionLat, regionLng) <= radiusKm;
}

/**
 * Convert urgency string to numeric value
 */
function urgencyToNumeric(urgency: string): number {
  const mapping: Record<string, number> = {
    high: 1.0,
    medium: 0.6,
    low: 0.3,
  };
  return mapping[urgency.toLowerCase()] || 0.5;
}

/**
 * Calculate risk level from demand score
 */
function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculate weighted moving average
 * More recent values get higher weights
 */
function calculateWeightedMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  
  let weightedSum = 0;
  let weightSum = 0;
  
  for (let i = 0; i < values.length; i++) {
    // More recent = higher weight (exponential decay)
    const weight = Math.pow(0.9, values.length - 1 - i);
    weightedSum += values[i] * weight;
    weightSum += weight;
  }
  
  return weightSum > 0 ? weightedSum / weightSum : 0;
}

// =============================================================================
// DATA FETCHING (READ-ONLY)
// =============================================================================

/**
 * Fetch historical request data from Supabase
 * This is a READ-ONLY operation
 */
async function fetchHistoricalRequests(): Promise<any[]> {
  if (!isSupabaseConfigured()) {
    console.warn('[HotspotEngine] Supabase not configured, using empty data');
    return [];
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - PREDICTION_CONFIG.historyDays);

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[HotspotEngine] Error fetching requests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[HotspotEngine] Exception fetching requests:', error);
    return [];
  }
}

/**
 * Fetch NGO data for capacity analysis
 */
async function fetchNGOCapacities(): Promise<Map<string, number>> {
  const capacityMap = new Map<string, number>();

  if (!isSupabaseConfigured()) {
    return capacityMap;
  }

  try {
    // @ts-ignore - Supabase type inference issue with environment variables
    const { data, error } = await supabase
      .from('ngos')
      .select('id, latitude, longitude, serving_capacity');

    if (error || !data) {
      return capacityMap;
    }

    // Aggregate capacity by region
    const ngoList = data as { id: string; latitude: number; longitude: number; serving_capacity: number }[];
    for (const ngo of ngoList) {
      if (!ngo.latitude || !ngo.longitude) continue;

      for (const region of DEFAULT_REGIONS) {
        if (isPointInRegion(ngo.latitude, ngo.longitude, region.lat, region.lng, region.radius)) {
          const currentCapacity = capacityMap.get(region.id) || 0;
          capacityMap.set(region.id, currentCapacity + (ngo.serving_capacity || 100));
        }
      }
    }

    return capacityMap;
  } catch (error) {
    console.error('[HotspotEngine] Error fetching NGO capacities:', error);
    return capacityMap;
  }
}

// =============================================================================
// PREDICTION LOGIC
// =============================================================================

/**
 * Aggregate request data by region
 */
function aggregateByRegion(requests: any[]): Map<string, RegionStats> {
  const regionStats = new Map<string, RegionStats>();

  // Initialize all regions
  for (const region of DEFAULT_REGIONS) {
    regionStats.set(region.id, {
      regionId: region.id,
      regionName: region.name,
      center: { lat: region.lat, lng: region.lng },
      totalRequests: 0,
      fulfilledRequests: 0,
      pendingRequests: 0,
      avgQuantity: 0,
      urgencyBreakdown: { high: 0, medium: 0, low: 0 },
      weeklyTrend: [0, 0, 0, 0], // Last 4 weeks
      ngoCapacity: 0,
    });
  }

  const now = new Date();
  const quantities: Map<string, number[]> = new Map();

  // Process each request
  for (const request of requests) {
    const lat = request.delivery_latitude;
    const lng = request.delivery_longitude;

    if (!lat || !lng) continue;

    // Find which region this request belongs to
    for (const region of DEFAULT_REGIONS) {
      if (isPointInRegion(lat, lng, region.lat, region.lng, region.radius)) {
        const stats = regionStats.get(region.id)!;
        
        stats.totalRequests++;
        
        if (request.status === 'fulfilled') {
          stats.fulfilledRequests++;
        } else if (request.status === 'active') {
          stats.pendingRequests++;
        }

        // Track urgency
        const urgency = (request.urgency || 'medium').toLowerCase();
        if (urgency === 'high') stats.urgencyBreakdown.high++;
        else if (urgency === 'medium') stats.urgencyBreakdown.medium++;
        else stats.urgencyBreakdown.low++;

        // Track quantity
        if (!quantities.has(region.id)) {
          quantities.set(region.id, []);
        }
        quantities.get(region.id)!.push(request.quantity || 10);

        // Calculate which week this request is from
        const requestDate = new Date(request.created_at);
        const weeksAgo = Math.floor((now.getTime() - requestDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weeksAgo < 4) {
          stats.weeklyTrend[3 - weeksAgo]++;
        }

        break; // Request belongs to only one region
      }
    }
  }

  // Calculate averages
  for (const [regionId, stats] of regionStats) {
    const regionQuantities = quantities.get(regionId) || [];
    stats.avgQuantity = regionQuantities.length > 0
      ? regionQuantities.reduce((a, b) => a + b, 0) / regionQuantities.length
      : 0;
  }

  return regionStats;
}

/**
 * Calculate prediction factors for a region
 */
function calculateFactors(
  stats: RegionStats,
  ngoCapacity: number
): HotspotFactors {
  // Recent demand trend (weighted average of weekly counts)
  const recentDemandTrend = calculateWeightedMovingAverage(stats.weeklyTrend);
  
  // Week-over-week growth
  const lastWeek = stats.weeklyTrend[3] || 0;
  const prevWeek = stats.weeklyTrend[2] || 0;
  const weekOverWeekGrowth = prevWeek > 0
    ? ((lastWeek - prevWeek) / prevWeek) * 100
    : (lastWeek > 0 ? 100 : 0);

  // Unfulfilled ratio
  const unfulfilledRatio = stats.totalRequests > 0
    ? (stats.totalRequests - stats.fulfilledRequests) / stats.totalRequests
    : 0;

  // Average urgency (weighted by count)
  const totalUrgencyItems = stats.urgencyBreakdown.high + stats.urgencyBreakdown.medium + stats.urgencyBreakdown.low;
  const averageUrgency = totalUrgencyItems > 0
    ? (stats.urgencyBreakdown.high * 1.0 + stats.urgencyBreakdown.medium * 0.6 + stats.urgencyBreakdown.low * 0.3) / totalUrgencyItems
    : 0.5;

  // Capacity gap (demand vs supply)
  const estimatedDailyDemand = stats.avgQuantity * (stats.totalRequests / PREDICTION_CONFIG.historyDays);
  const capacityGap = ngoCapacity > 0
    ? Math.max(0, (estimatedDailyDemand - ngoCapacity) / ngoCapacity)
    : 0;

  return {
    recentDemandTrend: Math.min(100, recentDemandTrend),
    weekOverWeekGrowth: Math.max(-100, Math.min(100, weekOverWeekGrowth)),
    unfulfilledRatio: Math.min(1, unfulfilledRatio),
    averageUrgency,
    capacityGap: Math.min(1, capacityGap),
  };
}

/**
 * Calculate demand score from factors
 */
function calculateDemandScore(factors: HotspotFactors): number {
  // Normalize each factor to 0-100 scale
  const normalizedTrend = Math.min(100, factors.recentDemandTrend * 5);
  const normalizedGrowth = Math.max(0, Math.min(100, (factors.weekOverWeekGrowth + 50)));
  const normalizedUnfulfilled = factors.unfulfilledRatio * 100;
  const normalizedUrgency = factors.averageUrgency * 100;
  const normalizedCapacity = factors.capacityGap * 100;

  // Calculate weighted score
  const score =
    normalizedTrend * DEMAND_WEIGHTS.recentDemandTrend +
    normalizedGrowth * DEMAND_WEIGHTS.weekOverWeekGrowth +
    normalizedUnfulfilled * DEMAND_WEIGHTS.unfulfilledRatio +
    normalizedUrgency * DEMAND_WEIGHTS.averageUrgency +
    normalizedCapacity * DEMAND_WEIGHTS.capacityGap;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidence(stats: RegionStats): number {
  const minRequests = PREDICTION_CONFIG.minRequestsForConfidence;
  
  // Base confidence on request count
  let confidence = Math.min(1, stats.totalRequests / (minRequests * 4));
  
  // Boost confidence if we have recent data
  if (stats.weeklyTrend[3] > 0) {
    confidence = Math.min(1, confidence + 0.2);
  }
  
  // Reduce confidence if data is sparse
  const nonZeroWeeks = stats.weeklyTrend.filter(w => w > 0).length;
  if (nonZeroWeeks < 2) {
    confidence *= 0.7;
  }

  return Math.round(confidence * 100) / 100;
}

// =============================================================================
// CACHING (Firebase)
// =============================================================================

const CACHE_PATH = 'analytics/hotspot_predictions';

/**
 * Save predictions to Firebase cache
 */
async function saveToCache(predictions: HotspotPrediction[]): Promise<void> {
  if (!database) {
    console.warn('[HotspotEngine] Firebase not available for caching');
    return;
  }

  try {
    const cacheData: HotspotCacheData = {
      predictions,
      generatedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + PREDICTION_CONFIG.cacheValidityHours * 60 * 60 * 1000).toISOString(),
      version: '1.0',
    };

    await set(ref(database, CACHE_PATH), cacheData);
    console.log('[HotspotEngine] Predictions cached successfully');
  } catch (error) {
    console.error('[HotspotEngine] Failed to cache predictions:', error);
  }
}

/**
 * Load predictions from Firebase cache if still valid
 */
async function loadFromCache(): Promise<HotspotPrediction[] | null> {
  if (!database) {
    return null;
  }

  try {
    const snapshot = await get(ref(database, CACHE_PATH));
    if (!snapshot.exists()) {
      return null;
    }

    const cacheData = snapshot.val() as HotspotCacheData;
    
    // Check if cache is still valid
    if (new Date(cacheData.validUntil) > new Date()) {
      console.log('[HotspotEngine] Using cached predictions');
      return cacheData.predictions;
    }

    return null;
  } catch (error) {
    console.error('[HotspotEngine] Failed to load cached predictions:', error);
    return null;
  }
}

// =============================================================================
// MAIN PUBLIC API
// =============================================================================

/**
 * Generate hunger hotspot predictions for all regions
 * 
 * This is the main entry point for the prediction engine.
 * It analyzes historical data and predicts future demand.
 * 
 * @param forceRefresh - If true, bypass cache and regenerate predictions
 * @returns Array of hotspot predictions for each region
 * 
 * @example
 * ```typescript
 * const predictions = await generateHotspotPredictions();
 * 
 * const highRiskAreas = predictions.filter(p => p.riskLevel === 'HIGH');
 * console.log(`${highRiskAreas.length} areas at high risk`);
 * ```
 */
export async function generateHotspotPredictions(
  forceRefresh: boolean = false
): Promise<HotspotPrediction[]> {
  // Check cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = await loadFromCache();
    if (cached) {
      return cached;
    }
  }

  console.log('[HotspotEngine] Generating new predictions...');

  // Fetch data
  const [requests, ngoCapacities] = await Promise.all([
    fetchHistoricalRequests(),
    fetchNGOCapacities(),
  ]);

  // Aggregate by region
  const regionStats = aggregateByRegion(requests);

  // Generate predictions
  const predictions: HotspotPrediction[] = [];
  const validUntil = new Date(Date.now() + PREDICTION_CONFIG.predictionDays * 24 * 60 * 60 * 1000);

  for (const [regionId, stats] of regionStats) {
    const region = DEFAULT_REGIONS.find(r => r.id === regionId)!;
    const ngoCapacity = ngoCapacities.get(regionId) || 0;
    
    const factors = calculateFactors(stats, ngoCapacity);
    const demandScore = calculateDemandScore(factors);
    const confidence = calculateConfidence(stats);

    predictions.push({
      regionId,
      regionName: region.name,
      center: stats.center,
      radiusKm: region.radius,
      predictedDemandScore: demandScore,
      riskLevel: getRiskLevel(demandScore),
      confidenceScore: confidence,
      factors,
      predictedAt: new Date().toISOString(),
      validUntil: validUntil.toISOString(),
    });
  }

  // Sort by demand score (highest first)
  predictions.sort((a, b) => b.predictedDemandScore - a.predictedDemandScore);

  // Cache the results
  await saveToCache(predictions);

  return predictions;
}

/**
 * Get predictions for a specific location
 * Finds the nearest region and returns its prediction
 * 
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @returns Nearest region prediction or null
 */
export async function getPredictionForLocation(
  lat: number,
  lng: number
): Promise<HotspotPrediction | null> {
  const predictions = await generateHotspotPredictions();
  
  let nearest: HotspotPrediction | null = null;
  let minDistance = Infinity;

  for (const prediction of predictions) {
    const distance = calculateDistance(lat, lng, prediction.center.lat, prediction.center.lng);
    
    // Check if point is within region
    if (distance <= prediction.radiusKm && distance < minDistance) {
      minDistance = distance;
      nearest = prediction;
    }
  }

  return nearest;
}

/**
 * Get high-risk hotspots only
 * Useful for alerts and prioritization
 * 
 * @returns Array of high-risk predictions
 */
export async function getHighRiskHotspots(): Promise<HotspotPrediction[]> {
  const predictions = await generateHotspotPredictions();
  return predictions.filter(p => p.riskLevel === 'HIGH');
}

/**
 * Get predictions in GeoJSON format for map visualization
 * 
 * @returns GeoJSON FeatureCollection
 */
export async function getHotspotsAsGeoJSON(): Promise<{
  type: 'FeatureCollection';
  features: any[];
}> {
  const predictions = await generateHotspotPredictions();

  const features = predictions.map(p => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [p.center.lng, p.center.lat],
    },
    properties: {
      regionId: p.regionId,
      regionName: p.regionName,
      demandScore: p.predictedDemandScore,
      riskLevel: p.riskLevel,
      confidence: p.confidenceScore,
      radiusKm: p.radiusKm,
      validUntil: p.validUntil,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Get summary statistics for all predictions
 */
export async function getHotspotSummary(): Promise<{
  totalRegions: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageDemandScore: number;
  generatedAt: string;
}> {
  const predictions = await generateHotspotPredictions();

  const highRisk = predictions.filter(p => p.riskLevel === 'HIGH').length;
  const mediumRisk = predictions.filter(p => p.riskLevel === 'MEDIUM').length;
  const lowRisk = predictions.filter(p => p.riskLevel === 'LOW').length;
  const avgScore = predictions.reduce((sum, p) => sum + p.predictedDemandScore, 0) / predictions.length;

  return {
    totalRegions: predictions.length,
    highRiskCount: highRisk,
    mediumRiskCount: mediumRisk,
    lowRiskCount: lowRisk,
    averageDemandScore: Math.round(avgScore),
    generatedAt: predictions[0]?.predictedAt || new Date().toISOString(),
  };
}

// Note: Types RegionStats and HotspotCacheData are already exported via interface declarations above
