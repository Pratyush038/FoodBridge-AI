/**
 * Food Safety & Trust Scoring Engine
 * 
 * This is a NEW, ISOLATED module that computes real-time Food Trust Scores (0-100)
 * to help NGOs evaluate donation safety without altering existing matching logic.
 * 
 * DESIGN PRINCIPLES:
 * - Read-only access to existing data (does not modify any tables)
 * - Computed at read-time/transaction-time
 * - Explainable rule-based scoring
 * - Non-blocking (informational only)
 * 
 * @module food-trust-engine
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { Database } from './database.types';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type TrustLabel = 'SAFE' | 'CAUTION' | 'HIGH_RISK';

export interface FoodTrustScore {
  /** Overall trust score (0-100) */
  score: number;
  /** Categorical label based on score threshold */
  label: TrustLabel;
  /** Breakdown of individual scoring components */
  breakdown: TrustScoreBreakdown;
  /** Human-readable explanations for the score */
  explanations: string[];
  /** Timestamp when the score was computed */
  computedAt: string;
}

export interface TrustScoreBreakdown {
  /** Score based on donor's past successful donations and feedback (0-25) */
  donorReliability: number;
  /** Risk factor based on food type (0-20) - lower risk = higher score */
  foodTypeRisk: number;
  /** Score based on time since food preparation (0-20) */
  freshnessScore: number;
  /** Score based on time remaining until expiry (0-25) */
  expiryScore: number;
  /** Estimated transport/pickup risk score (0-10) */
  transportRisk: number;
}

export interface FoodItemInput {
  id: string;
  donor_id: string;
  food_type: string;
  /** ISO timestamp when food was prepared/created */
  pickup_time: string;
  /** ISO timestamp for expiry */
  expiry_date: string;
  pickup_address?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  created_at: string;
}

export interface DonorHistoryStats {
  totalDonations: number;
  completedDonations: number;
  averageFeedbackRating: number;
  reliabilityScore: number;
  tier: string;
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

/**
 * Food type risk categories (higher value = higher risk = lower score)
 * Scale: 0 (safest) to 1 (highest risk)
 */
const FOOD_TYPE_RISK_FACTORS: Record<string, number> = {
  // Low risk - dry, packaged, long shelf life
  'packaged-food': 0.1,
  'dry-goods': 0.1,
  'canned-food': 0.1,
  'grains': 0.15,
  'rice': 0.15,
  'pulses': 0.15,
  
  // Medium-low risk - baked goods, bread
  'baked-goods': 0.3,
  'bread': 0.3,
  'snacks': 0.25,
  
  // Medium risk - fresh produce, fruits, vegetables
  'fresh-produce': 0.4,
  'fruits': 0.4,
  'vegetables': 0.4,
  
  // Medium-high risk - cooked meals, prepared food
  'cooked-meals': 0.6,
  'prepared-food': 0.6,
  'hot-meals': 0.65,
  
  // High risk - dairy, meat, seafood
  'dairy': 0.8,
  'milk-products': 0.8,
  'meat': 0.9,
  'seafood': 0.95,
  'eggs': 0.75,
  
  // Default for unknown types
  'other': 0.5,
};

/**
 * Thresholds for trust labels
 */
const TRUST_THRESHOLDS = {
  SAFE: 80,
  CAUTION: 50,
  // Below 50 is HIGH_RISK
};

/**
 * Maximum weights for each scoring component (must sum to 100)
 */
const SCORE_WEIGHTS = {
  donorReliability: 25,  // Max 25 points
  foodTypeRisk: 20,      // Max 20 points
  freshnessScore: 20,    // Max 20 points
  expiryScore: 25,       // Max 25 points
  transportRisk: 10,     // Max 10 points
};

// =============================================================================
// CORE SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate donor reliability score based on historical data
 * 
 * Factors considered:
 * - Total donation count (experience)
 * - Completion rate (reliability)
 * - Average feedback rating from NGOs
 * - Existing reliability_score from database
 * 
 * @param stats - Donor's historical statistics
 * @returns Score from 0 to SCORE_WEIGHTS.donorReliability (25)
 */
function calculateDonorReliabilityScore(stats: DonorHistoryStats | null): {
  score: number;
  explanation: string;
} {
  const maxScore = SCORE_WEIGHTS.donorReliability;
  
  if (!stats) {
    // New donor with no history - give benefit of doubt with moderate score
    return {
      score: maxScore * 0.5,
      explanation: 'New donor - limited history available',
    };
  }

  let score = 0;
  const explanations: string[] = [];

  // Component 1: Experience factor (up to 8 points)
  // More donations = more experience = more trust
  const experiencePoints = Math.min(8, stats.totalDonations * 0.8);
  score += experiencePoints;
  
  // Component 2: Completion rate (up to 8 points)
  if (stats.totalDonations > 0) {
    const completionRate = stats.completedDonations / stats.totalDonations;
    score += completionRate * 8;
    if (completionRate < 0.7) {
      explanations.push(`Completion rate: ${(completionRate * 100).toFixed(0)}%`);
    }
  }

  // Component 3: Feedback rating (up to 6 points)
  // Rating is 1-5, normalize to 0-6
  if (stats.averageFeedbackRating > 0) {
    score += (stats.averageFeedbackRating / 5) * 6;
  } else {
    score += 3; // Neutral if no feedback
  }

  // Component 4: Tier bonus (up to 3 points)
  const tierBonus: Record<string, number> = {
    platinum: 3,
    gold: 2,
    silver: 1,
    bronze: 0,
  };
  score += tierBonus[stats.tier] || 0;

  const finalScore = Math.min(maxScore, Math.round(score));
  
  let explanation = `Donor reliability: ${finalScore}/${maxScore}`;
  if (stats.tier === 'platinum' || stats.tier === 'gold') {
    explanation += ` (${stats.tier} tier donor)`;
  }
  if (explanations.length > 0) {
    explanation += ` - ${explanations.join(', ')}`;
  }

  return { score: finalScore, explanation };
}

/**
 * Calculate food type risk score
 * Lower risk food types get higher scores
 * 
 * @param foodType - Type of food being donated
 * @returns Score from 0 to SCORE_WEIGHTS.foodTypeRisk (20)
 */
function calculateFoodTypeScore(foodType: string): {
  score: number;
  explanation: string;
} {
  const maxScore = SCORE_WEIGHTS.foodTypeRisk;
  const normalizedType = foodType.toLowerCase().replace(/[^a-z-]/g, '-');
  
  // Find best matching risk factor
  let riskFactor = FOOD_TYPE_RISK_FACTORS['other'];
  for (const [key, value] of Object.entries(FOOD_TYPE_RISK_FACTORS)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      riskFactor = value;
      break;
    }
  }

  // Invert risk factor to get score (lower risk = higher score)
  const score = Math.round(maxScore * (1 - riskFactor));
  
  let riskLevel = 'medium';
  if (riskFactor <= 0.3) riskLevel = 'low';
  else if (riskFactor >= 0.7) riskLevel = 'high';

  return {
    score,
    explanation: `Food type (${foodType}): ${riskLevel} risk category`,
  };
}

/**
 * Calculate freshness score based on time since preparation
 * More recent preparation = higher score
 * 
 * @param pickupTime - ISO timestamp of when food is ready for pickup
 * @param createdAt - ISO timestamp of when donation was created
 * @returns Score from 0 to SCORE_WEIGHTS.freshnessScore (20)
 */
function calculateFreshnessScore(pickupTime: string, createdAt: string): {
  score: number;
  explanation: string;
} {
  const maxScore = SCORE_WEIGHTS.freshnessScore;
  const now = new Date();
  
  // Use pickup time if available and in past, otherwise use created_at
  const referenceTime = new Date(pickupTime);
  const foodAge = referenceTime > now 
    ? new Date(createdAt)  // If pickup is in future, use creation time
    : referenceTime;
  
  const hoursElapsed = Math.max(0, (now.getTime() - foodAge.getTime()) / (1000 * 60 * 60));
  
  // Decay function: Full score within 2 hours, degrades over 24 hours
  let score: number;
  let explanation: string;

  if (hoursElapsed <= 2) {
    score = maxScore;
    explanation = 'Very fresh (prepared within 2 hours)';
  } else if (hoursElapsed <= 6) {
    score = Math.round(maxScore * 0.85);
    explanation = 'Fresh (prepared within 6 hours)';
  } else if (hoursElapsed <= 12) {
    score = Math.round(maxScore * 0.65);
    explanation = 'Moderate freshness (6-12 hours old)';
  } else if (hoursElapsed <= 24) {
    score = Math.round(maxScore * 0.4);
    explanation = 'Consider urgency (12-24 hours old)';
  } else if (hoursElapsed <= 48) {
    score = Math.round(maxScore * 0.2);
    explanation = 'Aged (over 24 hours old)';
  } else {
    score = Math.round(maxScore * 0.1);
    explanation = 'Extended age - verify condition before accepting';
  }

  return { score, explanation };
}

/**
 * Calculate expiry score based on time remaining until expiry
 * More time remaining = higher score
 * 
 * @param expiryDate - ISO timestamp of expiry
 * @returns Score from 0 to SCORE_WEIGHTS.expiryScore (25)
 */
function calculateExpiryScore(expiryDate: string): {
  score: number;
  explanation: string;
} {
  const maxScore = SCORE_WEIGHTS.expiryScore;
  const now = new Date();
  const expiry = new Date(expiryDate);
  
  const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  let score: number;
  let explanation: string;

  if (hoursRemaining <= 0) {
    score = 0;
    explanation = '⚠️ EXPIRED - Do not accept';
  } else if (hoursRemaining <= 2) {
    score = Math.round(maxScore * 0.15);
    explanation = 'Critical: Less than 2 hours until expiry';
  } else if (hoursRemaining <= 6) {
    score = Math.round(maxScore * 0.35);
    explanation = 'Urgent: 2-6 hours until expiry';
  } else if (hoursRemaining <= 12) {
    score = Math.round(maxScore * 0.55);
    explanation = 'Time sensitive: 6-12 hours until expiry';
  } else if (hoursRemaining <= 24) {
    score = Math.round(maxScore * 0.75);
    explanation = 'Good: 12-24 hours until expiry';
  } else if (hoursRemaining <= 48) {
    score = Math.round(maxScore * 0.9);
    explanation = 'Excellent: 1-2 days until expiry';
  } else {
    score = maxScore;
    explanation = 'Optimal: More than 2 days until expiry';
  }

  return { score, explanation };
}

/**
 * Calculate transport risk score
 * Considers estimated pickup delay and distance factors
 * 
 * @param pickupTime - Scheduled pickup time
 * @param foodType - Type of food (affects transport sensitivity)
 * @returns Score from 0 to SCORE_WEIGHTS.transportRisk (10)
 */
function calculateTransportRiskScore(pickupTime: string, foodType: string): {
  score: number;
  explanation: string;
} {
  const maxScore = SCORE_WEIGHTS.transportRisk;
  const now = new Date();
  const pickup = new Date(pickupTime);
  
  // Calculate hours until pickup (negative if pickup time has passed)
  const hoursUntilPickup = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Check if food type is transport-sensitive
  const normalizedType = foodType.toLowerCase();
  const isHighRiskTransport = ['dairy', 'meat', 'seafood', 'cooked', 'hot'].some(
    t => normalizedType.includes(t)
  );
  
  let score: number;
  let explanation: string;

  if (hoursUntilPickup > 0 && hoursUntilPickup <= 2) {
    // Pickup is soon - best case
    score = maxScore;
    explanation = 'Pickup scheduled soon - minimal transport risk';
  } else if (hoursUntilPickup <= 0 && hoursUntilPickup > -2) {
    // Pickup time just passed - still good
    score = Math.round(maxScore * 0.85);
    explanation = 'Pickup window active';
  } else if (hoursUntilPickup > 2 && hoursUntilPickup <= 6) {
    score = Math.round(maxScore * (isHighRiskTransport ? 0.6 : 0.8));
    explanation = 'Moderate wait time for pickup';
  } else if (hoursUntilPickup > 6) {
    score = Math.round(maxScore * (isHighRiskTransport ? 0.4 : 0.6));
    explanation = 'Extended wait time - coordinate pickup carefully';
  } else {
    // Pickup significantly overdue
    score = Math.round(maxScore * 0.3);
    explanation = 'Pickup may be delayed - verify status';
  }

  return { score, explanation };
}

/**
 * Convert numeric score to trust label
 */
function getLabel(score: number): TrustLabel {
  if (score >= TRUST_THRESHOLDS.SAFE) return 'SAFE';
  if (score >= TRUST_THRESHOLDS.CAUTION) return 'CAUTION';
  return 'HIGH_RISK';
}

// =============================================================================
// DATA FETCHING (READ-ONLY)
// =============================================================================

/**
 * Fetch donor's historical statistics from Supabase
 * This is a READ-ONLY operation
 */
async function fetchDonorStats(donorId: string): Promise<DonorHistoryStats | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // Fetch donor base info
    // @ts-ignore - Supabase type inference issue with environment variables
    const { data: donor, error: donorError } = await supabase
      .from('donors')
      .select('total_donations, reliability_score, tier')
      .eq('id', donorId)
      .single();

    if (donorError || !donor) {
      console.warn('[FoodTrustEngine] Could not fetch donor stats:', donorError?.message);
      return null;
    }

    // Fetch completed donations count
    // @ts-ignore - Supabase type inference issue
    const { count: completedCount } = await supabase
      .from('food_items')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', donorId)
      .eq('status', 'collected');

    // Fetch average feedback rating for this donor
    // @ts-ignore - Supabase type inference issue
    const { data: feedbackData } = await supabase
      .from('feedback')
      .select('rating')
      .eq('to_user_id', donorId)
      .eq('feedback_type', 'ngo_to_donor');

    const feedbackList = feedbackData as { rating: number }[] | null;
    const averageFeedbackRating = feedbackList && feedbackList.length > 0
      ? feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length
      : 0;

    const donorData = donor as { total_donations?: number; reliability_score?: number; tier?: string };
    return {
      totalDonations: donorData.total_donations || 0,
      completedDonations: completedCount || 0,
      averageFeedbackRating,
      reliabilityScore: donorData.reliability_score || 50,
      tier: donorData.tier || 'bronze',
    };
  } catch (error) {
    console.error('[FoodTrustEngine] Error fetching donor stats:', error);
    return null;
  }
}

// =============================================================================
// MAIN PUBLIC API
// =============================================================================

/**
 * Calculate the Food Trust Score for a given food item
 * 
 * This is the main entry point for the trust scoring engine.
 * It computes a real-time score based on multiple factors.
 * 
 * @param foodItem - The food item to evaluate
 * @returns Complete trust score with breakdown and explanations
 * 
 * @example
 * ```typescript
 * const trustScore = await calculateFoodTrustScore({
 *   id: 'food-123',
 *   donor_id: 'donor-456',
 *   food_type: 'cooked-meals',
 *   pickup_time: '2024-01-15T14:00:00Z',
 *   expiry_date: '2024-01-15T22:00:00Z',
 *   created_at: '2024-01-15T10:00:00Z',
 * });
 * 
 * console.log(trustScore.label); // 'SAFE', 'CAUTION', or 'HIGH_RISK'
 * ```
 */
export async function calculateFoodTrustScore(
  foodItem: FoodItemInput
): Promise<FoodTrustScore> {
  const explanations: string[] = [];

  // Fetch donor history (read-only)
  const donorStats = await fetchDonorStats(foodItem.donor_id);

  // Calculate individual component scores
  const donorReliability = calculateDonorReliabilityScore(donorStats);
  explanations.push(donorReliability.explanation);

  const foodTypeScore = calculateFoodTypeScore(foodItem.food_type);
  explanations.push(foodTypeScore.explanation);

  const freshnessScore = calculateFreshnessScore(
    foodItem.pickup_time,
    foodItem.created_at
  );
  explanations.push(freshnessScore.explanation);

  const expiryScore = calculateExpiryScore(foodItem.expiry_date);
  explanations.push(expiryScore.explanation);

  const transportScore = calculateTransportRiskScore(
    foodItem.pickup_time,
    foodItem.food_type
  );
  explanations.push(transportScore.explanation);

  // Calculate total score
  const totalScore = Math.round(
    donorReliability.score +
    foodTypeScore.score +
    freshnessScore.score +
    expiryScore.score +
    transportScore.score
  );

  // Clamp to 0-100 range
  const finalScore = Math.max(0, Math.min(100, totalScore));

  return {
    score: finalScore,
    label: getLabel(finalScore),
    breakdown: {
      donorReliability: donorReliability.score,
      foodTypeRisk: foodTypeScore.score,
      freshnessScore: freshnessScore.score,
      expiryScore: expiryScore.score,
      transportRisk: transportScore.score,
    },
    explanations: explanations.filter(e => e.length > 0),
    computedAt: new Date().toISOString(),
  };
}

/**
 * Calculate trust scores for multiple food items in batch
 * Useful for dashboard displays
 * 
 * @param foodItems - Array of food items to evaluate
 * @returns Map of food item IDs to their trust scores
 */
export async function calculateBatchTrustScores(
  foodItems: FoodItemInput[]
): Promise<Map<string, FoodTrustScore>> {
  const results = new Map<string, FoodTrustScore>();
  
  // Process in parallel for efficiency
  const promises = foodItems.map(async (item) => {
    const score = await calculateFoodTrustScore(item);
    return { id: item.id, score };
  });

  const scores = await Promise.all(promises);
  
  for (const { id, score } of scores) {
    results.set(id, score);
  }

  return results;
}

/**
 * Get a simplified trust indicator for quick display
 * 
 * @param foodItem - The food item to evaluate
 * @returns Simplified object with score, label, and color hint
 */
export async function getQuickTrustIndicator(
  foodItem: FoodItemInput
): Promise<{ score: number; label: TrustLabel; color: string }> {
  const trustScore = await calculateFoodTrustScore(foodItem);
  
  const colorMap: Record<TrustLabel, string> = {
    SAFE: '#10b981',      // green-500
    CAUTION: '#f59e0b',   // amber-500
    HIGH_RISK: '#ef4444', // red-500
  };

  return {
    score: trustScore.score,
    label: trustScore.label,
    color: colorMap[trustScore.label],
  };
}

/**
 * Synchronous version for when we have pre-fetched donor stats
 * Useful for real-time UI updates where we don't want async calls
 */
export function calculateFoodTrustScoreSync(
  foodItem: FoodItemInput,
  donorStats: DonorHistoryStats | null = null
): FoodTrustScore {
  const explanations: string[] = [];

  // Calculate individual component scores
  const donorReliability = calculateDonorReliabilityScore(donorStats);
  explanations.push(donorReliability.explanation);

  const foodTypeScore = calculateFoodTypeScore(foodItem.food_type);
  explanations.push(foodTypeScore.explanation);

  const freshnessScore = calculateFreshnessScore(
    foodItem.pickup_time,
    foodItem.created_at
  );
  explanations.push(freshnessScore.explanation);

  const expiryScore = calculateExpiryScore(foodItem.expiry_date);
  explanations.push(expiryScore.explanation);

  const transportScore = calculateTransportRiskScore(
    foodItem.pickup_time,
    foodItem.food_type
  );
  explanations.push(transportScore.explanation);

  // Calculate total score
  const totalScore = Math.round(
    donorReliability.score +
    foodTypeScore.score +
    freshnessScore.score +
    expiryScore.score +
    transportScore.score
  );

  // Clamp to 0-100 range
  const finalScore = Math.max(0, Math.min(100, totalScore));

  return {
    score: finalScore,
    label: getLabel(finalScore),
    breakdown: {
      donorReliability: donorReliability.score,
      foodTypeRisk: foodTypeScore.score,
      freshnessScore: freshnessScore.score,
      expiryScore: expiryScore.score,
      transportRisk: transportScore.score,
    },
    explanations: explanations.filter(e => e.length > 0),
    computedAt: new Date().toISOString(),
  };
}

// Note: Types FoodItemInput and DonorHistoryStats are already exported via interface declarations above
