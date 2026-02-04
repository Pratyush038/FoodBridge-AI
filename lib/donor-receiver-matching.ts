/**
 * Lightweight AI-style Donor-Receiver Matching Service
 * 
 * This module provides rule-based scoring that simulates AI matching
 * for connecting food donors with nearby receivers (NGOs/organizations).
 * 
 * Matching Criteria (Weighted Score 0-100):
 * - Distance proximity: 40%
 * - Food category match: 30%  
 * - Quantity compatibility: 20%
 * - Time window/freshness: 10%
 * 
 * Designed to be modular and easily replaceable with real ML later.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MatchableUser {
  id: string;
  name: string;
  organizationName?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  foodType?: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string;  // For donations
  neededBy?: string;    // For requirements
  urgency?: 'high' | 'medium' | 'low';
  servingCapacity?: number;
}

export interface MatchResult {
  id: string;
  name: string;
  organizationName?: string;
  distance: number;        // in km
  matchScore: number;      // 0-100
  foodType: string;
  quantity: number;
  unit: string;
  phone?: string;
  matchBreakdown: {
    distanceScore: number;
    categoryScore: number;
    quantityScore: number;
    timeScore: number;
  };
}

export interface DonationInput {
  foodType: string;
  quantity: number;
  unit: string;
  latitude: number;
  longitude: number;
  expiryDate?: string;
  pickupTime?: string;
}

export interface RequirementInput {
  foodType: string;
  quantity: number;
  unit: string;
  latitude: number;
  longitude: number;
  neededBy?: string;
  urgency?: 'high' | 'medium' | 'low';
}

// ============================================================================
// Mock Data: Users near South Bangalore (RV College area)
// ============================================================================

// South Bangalore Locations Reference:
// RV College of Engineering: 12.9237° N, 77.4986° E
// BTM Layout: 12.9166° N, 77.6101° E
// Banashankari: 12.9255° N, 77.5468° E
// Jayanagar: 12.9250° N, 77.5833° E
// JP Nagar: 12.9081° N, 77.5858° E

export const mockReceiversNearRVCE: MatchableUser[] = [
  // Very close to RV College (< 3km)
  {
    id: 'rcvr-rv-001',
    name: 'Annapurna Seva Foundation',
    organizationName: 'Annapurna Seva Foundation',
    latitude: 12.9280,
    longitude: 77.5020,
    phone: '+91 98450 11001',
    foodType: 'cooked-meals',
    quantity: 100,
    unit: 'portions',
    urgency: 'high',
    servingCapacity: 200,
  },
  {
    id: 'rcvr-rv-002',
    name: 'RV College Community Kitchen',
    organizationName: 'RVCE Outreach Program',
    latitude: 12.9200,
    longitude: 77.4950,
    phone: '+91 98450 11002',
    foodType: 'fresh-produce',
    quantity: 50,
    unit: 'kg',
    urgency: 'medium',
    servingCapacity: 150,
  },
  {
    id: 'rcvr-rv-003',
    name: 'Mysore Road Shelter',
    organizationName: 'Hope For All Trust',
    latitude: 12.9350,
    longitude: 77.5100,
    phone: '+91 98450 11003',
    foodType: 'packaged-food',
    quantity: 30,
    unit: 'kg',
    urgency: 'low',
    servingCapacity: 80,
  },
  
  // BTM Layout area (4-6km from RV College)
  {
    id: 'rcvr-btm-001',
    name: 'BTM Food Bank',
    organizationName: 'Feeding Bangalore Trust',
    latitude: 12.9166,
    longitude: 77.6101,
    phone: '+91 98450 22001',
    foodType: 'any',
    quantity: 200,
    unit: 'portions',
    urgency: 'high',
    servingCapacity: 400,
  },
  {
    id: 'rcvr-btm-002',
    name: 'Madiwala Community Center',
    organizationName: 'South Bangalore Seva',
    latitude: 12.9220,
    longitude: 77.6180,
    phone: '+91 98450 22002',
    foodType: 'cooked-meals',
    quantity: 80,
    unit: 'portions',
    urgency: 'medium',
    servingCapacity: 120,
  },
  {
    id: 'rcvr-btm-003',
    name: 'BTM Layout Orphanage',
    organizationName: 'Little Stars Foundation',
    latitude: 12.9100,
    longitude: 77.6050,
    phone: '+91 98450 22003',
    foodType: 'dairy',
    quantity: 20,
    unit: 'kg',
    urgency: 'high',
    servingCapacity: 50,
  },
  
  // Banashankari area (3-5km from RV College)
  {
    id: 'rcvr-bsk-001',
    name: 'Banashankari Temple Kitchen',
    organizationName: 'Temple Trust',
    latitude: 12.9255,
    longitude: 77.5468,
    phone: '+91 98450 33001',
    foodType: 'fresh-produce',
    quantity: 100,
    unit: 'kg',
    urgency: 'medium',
    servingCapacity: 500,
  },
  {
    id: 'rcvr-bsk-002',
    name: 'BSK Annadana Samithi',
    organizationName: 'Annadana Charitable Trust',
    latitude: 12.9300,
    longitude: 77.5550,
    phone: '+91 98450 33002',
    foodType: 'cooked-meals',
    quantity: 150,
    unit: 'portions',
    urgency: 'high',
    servingCapacity: 300,
  },
  {
    id: 'rcvr-bsk-003',
    name: 'Banashankari Old Age Home',
    organizationName: 'Senior Care Foundation',
    latitude: 12.9180,
    longitude: 77.5400,
    phone: '+91 98450 33003',
    foodType: 'cooked-meals',
    quantity: 40,
    unit: 'portions',
    urgency: 'medium',
    servingCapacity: 60,
  },
  
  // Jayanagar area (5-7km from RV College)
  {
    id: 'rcvr-jnr-001',
    name: 'Jayanagar Food Relief',
    organizationName: 'JNR Welfare Association',
    latitude: 12.9250,
    longitude: 77.5833,
    phone: '+91 98450 44001',
    foodType: 'baked-goods',
    quantity: 25,
    unit: 'kg',
    urgency: 'low',
    servingCapacity: 100,
  },
  {
    id: 'rcvr-jnr-002',
    name: 'Jayanagar Community Hall',
    organizationName: 'Civic Welfare Board',
    latitude: 12.9300,
    longitude: 77.5900,
    phone: '+91 98450 44002',
    foodType: 'any',
    quantity: 120,
    unit: 'portions',
    urgency: 'medium',
    servingCapacity: 200,
  },
  
  // JP Nagar area (6-8km from RV College)
  {
    id: 'rcvr-jpn-001',
    name: 'JP Nagar Night Shelter',
    organizationName: 'Urban Homeless Initiative',
    latitude: 12.9081,
    longitude: 77.5858,
    phone: '+91 98450 55001',
    foodType: 'cooked-meals',
    quantity: 75,
    unit: 'portions',
    urgency: 'high',
    servingCapacity: 150,
  },
  {
    id: 'rcvr-jpn-002',
    name: 'JP Nagar Midday Meal Program',
    organizationName: 'Education & Nutrition Trust',
    latitude: 12.9000,
    longitude: 77.5800,
    phone: '+91 98450 55002',
    foodType: 'fresh-produce',
    quantity: 60,
    unit: 'kg',
    urgency: 'medium',
    servingCapacity: 250,
  },
  {
    id: 'rcvr-jpn-003',
    name: 'JP Nagar Children Home',
    organizationName: 'Bal Vikas Samithi',
    latitude: 12.9150,
    longitude: 77.5950,
    phone: '+91 98450 55003',
    foodType: 'dairy',
    quantity: 15,
    unit: 'kg',
    urgency: 'high',
    servingCapacity: 40,
  },
];

export const mockDonorsNearRVCE: MatchableUser[] = [
  // Very close to RV College (< 3km)
  {
    id: 'donor-rv-001',
    name: 'RVCE Mess & Canteen',
    organizationName: 'RV College Hospitality',
    latitude: 12.9237,
    longitude: 77.4986,
    phone: '+91 98451 11001',
    foodType: 'cooked-meals',
    quantity: 50,
    unit: 'portions',
    expiryDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
  },
  {
    id: 'donor-rv-002',
    name: 'Mysore Road Bakery',
    organizationName: 'Fresh Bakes Daily',
    latitude: 12.9300,
    longitude: 77.5050,
    phone: '+91 98451 11002',
    foodType: 'baked-goods',
    quantity: 30,
    unit: 'kg',
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  },
  {
    id: 'donor-rv-003',
    name: 'Rajarajeshwari Nagar Restaurant',
    organizationName: 'South Indian Delights RR Nagar',
    latitude: 12.9180,
    longitude: 77.5100,
    phone: '+91 98451 11003',
    foodType: 'cooked-meals',
    quantity: 80,
    unit: 'portions',
    expiryDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
  },
  
  // BTM Layout area
  {
    id: 'donor-btm-001',
    name: 'BTM 2nd Stage Caterers',
    organizationName: 'Royal Events Catering',
    latitude: 12.9150,
    longitude: 77.6120,
    phone: '+91 98451 22001',
    foodType: 'cooked-meals',
    quantity: 200,
    unit: 'portions',
    expiryDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
  },
  {
    id: 'donor-btm-002',
    name: 'Udupi Garden BTM',
    organizationName: 'Udupi Garden Restaurant',
    latitude: 12.9200,
    longitude: 77.6080,
    phone: '+91 98451 22002',
    foodType: 'cooked-meals',
    quantity: 45,
    unit: 'portions',
    expiryDate: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours
  },
  {
    id: 'donor-btm-003',
    name: 'Fresh Mart BTM',
    organizationName: 'Fresh Mart Supermarket',
    latitude: 12.9180,
    longitude: 77.6150,
    phone: '+91 98451 22003',
    foodType: 'fresh-produce',
    quantity: 40,
    unit: 'kg',
    expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
  },
  
  // Banashankari area
  {
    id: 'donor-bsk-001',
    name: 'BSK Wedding Hall',
    organizationName: 'Kalyana Mantapa BSK',
    latitude: 12.9280,
    longitude: 77.5500,
    phone: '+91 98451 33001',
    foodType: 'cooked-meals',
    quantity: 300,
    unit: 'portions',
    expiryDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours - urgent!
  },
  {
    id: 'donor-bsk-002',
    name: 'Banashankari Dairy',
    organizationName: 'Nandini Milk Parlour BSK',
    latitude: 12.9220,
    longitude: 77.5450,
    phone: '+91 98451 33002',
    foodType: 'dairy',
    quantity: 25,
    unit: 'kg',
    expiryDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
  },
  {
    id: 'donor-bsk-003',
    name: 'BSK Fruit Market',
    organizationName: 'Fresh Fruits BSK',
    latitude: 12.9300,
    longitude: 77.5520,
    phone: '+91 98451 33003',
    foodType: 'fresh-produce',
    quantity: 60,
    unit: 'kg',
    expiryDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(), // 36 hours
  },
  
  // Jayanagar area
  {
    id: 'donor-jnr-001',
    name: 'Jayanagar 4th Block Hotel',
    organizationName: 'Grand Jayanagar Hotel',
    latitude: 12.9260,
    longitude: 77.5850,
    phone: '+91 98451 44001',
    foodType: 'cooked-meals',
    quantity: 100,
    unit: 'portions',
    expiryDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
  },
  {
    id: 'donor-jnr-002',
    name: 'JC Road Bakery',
    organizationName: 'Sweet Corner JC Road',
    latitude: 12.9350,
    longitude: 77.5880,
    phone: '+91 98451 44002',
    foodType: 'baked-goods',
    quantity: 20,
    unit: 'kg',
    expiryDate: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours
  },
  
  // JP Nagar area
  {
    id: 'donor-jpn-001',
    name: 'JP Nagar Corporate Cafeteria',
    organizationName: 'Tech Park Food Court',
    latitude: 12.9100,
    longitude: 77.5900,
    phone: '+91 98451 55001',
    foodType: 'cooked-meals',
    quantity: 150,
    unit: 'portions',
    expiryDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
  },
  {
    id: 'donor-jpn-002',
    name: 'JP Nagar Vegetable Market',
    organizationName: 'Organic Greens JP Nagar',
    latitude: 12.9050,
    longitude: 77.5820,
    phone: '+91 98451 55002',
    foodType: 'fresh-produce',
    quantity: 80,
    unit: 'kg',
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  },
  {
    id: 'donor-jpn-003',
    name: 'JP Nagar Sweets Shop',
    organizationName: 'Traditional Sweets JPNagar',
    latitude: 12.9020,
    longitude: 77.5780,
    phone: '+91 98451 55003',
    foodType: 'baked-goods',
    quantity: 15,
    unit: 'kg',
    expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
  },
];

// ============================================================================
// Matching Algorithm
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance score (0-100)
 * Closer = higher score
 * Weight: 40%
 */
function calculateDistanceScore(distanceKm: number): number {
  // Perfect score for < 2km, decreasing as distance increases
  if (distanceKm <= 2) return 100;
  if (distanceKm <= 5) return 90 - (distanceKm - 2) * 5;  // 90-75
  if (distanceKm <= 10) return 75 - (distanceKm - 5) * 5; // 75-50
  if (distanceKm <= 20) return 50 - (distanceKm - 10) * 3; // 50-20
  if (distanceKm <= 50) return 20 - (distanceKm - 20) * 0.5; // 20-5
  return 5; // Minimum score for very far distances
}

/**
 * Calculate food category match score (0-100)
 * Weight: 30%
 */
function calculateCategoryScore(
  sourceFoodType: string,
  targetFoodType: string
): number {
  // Exact match
  if (sourceFoodType === targetFoodType) return 100;
  
  // "any" type accepts everything
  if (targetFoodType === 'any' || sourceFoodType === 'any') return 85;
  
  // Partial matches (similar categories)
  const similarCategories: Record<string, string[]> = {
    'cooked-meals': ['packaged-food'],
    'fresh-produce': ['packaged-food'],
    'baked-goods': ['packaged-food', 'dairy'],
    'dairy': ['packaged-food', 'fresh-produce'],
    'packaged-food': ['cooked-meals', 'baked-goods', 'fresh-produce'],
    'other': ['packaged-food'],
  };
  
  if (similarCategories[sourceFoodType]?.includes(targetFoodType)) {
    return 60; // Partial match
  }
  
  return 30; // No match but still usable
}

/**
 * Calculate quantity compatibility score (0-100)
 * Weight: 20%
 */
function calculateQuantityScore(
  sourceQuantity: number,
  targetQuantity: number
): number {
  if (sourceQuantity <= 0 || targetQuantity <= 0) return 50;
  
  // Calculate how well quantities match
  const ratio = Math.min(sourceQuantity, targetQuantity) / 
                Math.max(sourceQuantity, targetQuantity);
  
  // If source has more than target needs, that's good
  if (sourceQuantity >= targetQuantity) {
    return 80 + (ratio * 20); // 80-100
  }
  
  // If source has less, score based on how much of need is fulfilled
  const fulfillmentRatio = sourceQuantity / targetQuantity;
  if (fulfillmentRatio >= 0.7) return 70 + (fulfillmentRatio * 10); // 77-80
  if (fulfillmentRatio >= 0.5) return 50 + (fulfillmentRatio * 20); // 60-64
  return 30 + (fulfillmentRatio * 40); // 30-50
}

/**
 * Calculate time window score (0-100)
 * Weight: 10%
 */
function calculateTimeScore(
  expiryDate?: string,
  neededBy?: string,
  urgency?: 'high' | 'medium' | 'low'
): number {
  const now = new Date();
  
  // If we have an expiry date for donations
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Very fresh (> 24 hours) = excellent
    if (hoursUntilExpiry > 24) return 100;
    // Fresh (12-24 hours) = good
    if (hoursUntilExpiry > 12) return 85;
    // Moderate (6-12 hours) = okay
    if (hoursUntilExpiry > 6) return 70;
    // Urgent (2-6 hours) = needs quick pickup
    if (hoursUntilExpiry > 2) return 55;
    // Very urgent (< 2 hours) = critical
    if (hoursUntilExpiry > 0) return 40;
    // Expired
    return 0;
  }
  
  // If we have urgency level for requirements
  if (urgency) {
    switch (urgency) {
      case 'high': return 100; // Prioritize high urgency matches
      case 'medium': return 70;
      case 'low': return 50;
    }
  }
  
  // If we have a needed by date
  if (neededBy) {
    const needed = new Date(neededBy);
    const daysUntilNeeded = (needed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilNeeded < 0) return 20; // Already past due
    if (daysUntilNeeded <= 1) return 100; // Needed today/tomorrow
    if (daysUntilNeeded <= 3) return 80;
    if (daysUntilNeeded <= 7) return 60;
    return 40;
  }
  
  return 60; // Default moderate score
}

/**
 * Find matching receivers for a donation
 * Returns sorted list of matches with scores
 */
export function findMatchingReceivers(
  donation: DonationInput,
  receivers?: MatchableUser[]
): MatchResult[] {
  const availableReceivers = receivers || mockReceiversNearRVCE;
  const matches: MatchResult[] = [];
  
  for (const receiver of availableReceivers) {
    // Calculate distance
    const distance = calculateDistance(
      donation.latitude,
      donation.longitude,
      receiver.latitude,
      receiver.longitude
    );
    
    // Calculate individual scores
    const distanceScore = calculateDistanceScore(distance);
    const categoryScore = calculateCategoryScore(
      donation.foodType,
      receiver.foodType || 'any'
    );
    const quantityScore = calculateQuantityScore(
      donation.quantity,
      receiver.quantity || donation.quantity
    );
    const timeScore = calculateTimeScore(
      donation.expiryDate,
      undefined,
      receiver.urgency
    );
    
    // Calculate weighted total score
    // Distance: 40%, Category: 30%, Quantity: 20%, Time: 10%
    const matchScore = Math.round(
      distanceScore * 0.40 +
      categoryScore * 0.30 +
      quantityScore * 0.20 +
      timeScore * 0.10
    );
    
    matches.push({
      id: receiver.id,
      name: receiver.name,
      organizationName: receiver.organizationName,
      distance: Math.round(distance * 100) / 100,
      matchScore,
      foodType: receiver.foodType || 'any',
      quantity: receiver.quantity || 0,
      unit: receiver.unit || 'portions',
      phone: receiver.phone,
      matchBreakdown: {
        distanceScore: Math.round(distanceScore),
        categoryScore: Math.round(categoryScore),
        quantityScore: Math.round(quantityScore),
        timeScore: Math.round(timeScore),
      },
    });
  }
  
  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Find matching donors for a requirement
 * Returns sorted list of matches with scores
 */
export function findMatchingDonors(
  requirement: RequirementInput,
  donors?: MatchableUser[]
): MatchResult[] {
  const availableDonors = donors || mockDonorsNearRVCE;
  const matches: MatchResult[] = [];
  
  for (const donor of availableDonors) {
    // Calculate distance
    const distance = calculateDistance(
      requirement.latitude,
      requirement.longitude,
      donor.latitude,
      donor.longitude
    );
    
    // Calculate individual scores
    const distanceScore = calculateDistanceScore(distance);
    const categoryScore = calculateCategoryScore(
      donor.foodType || 'other',
      requirement.foodType
    );
    const quantityScore = calculateQuantityScore(
      donor.quantity || 0,
      requirement.quantity
    );
    const timeScore = calculateTimeScore(
      donor.expiryDate,
      requirement.neededBy,
      requirement.urgency
    );
    
    // Calculate weighted total score
    // Distance: 40%, Category: 30%, Quantity: 20%, Time: 10%
    const matchScore = Math.round(
      distanceScore * 0.40 +
      categoryScore * 0.30 +
      quantityScore * 0.20 +
      timeScore * 0.10
    );
    
    matches.push({
      id: donor.id,
      name: donor.name,
      organizationName: donor.organizationName,
      distance: Math.round(distance * 100) / 100,
      matchScore,
      foodType: donor.foodType || 'other',
      quantity: donor.quantity || 0,
      unit: donor.unit || 'portions',
      phone: donor.phone,
      matchBreakdown: {
        distanceScore: Math.round(distanceScore),
        categoryScore: Math.round(categoryScore),
        quantityScore: Math.round(quantityScore),
        timeScore: Math.round(timeScore),
      },
    });
  }
  
  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get top N matches
 */
export function getTopMatches(matches: MatchResult[], count: number = 5): MatchResult[] {
  return matches.slice(0, count);
}

/**
 * Format match score as percentage string with emoji indicator
 */
export function formatMatchScore(score: number): { text: string; emoji: string; color: string } {
  if (score >= 85) {
    return { text: `${score}%`, emoji: '🎯', color: 'text-green-600' };
  } else if (score >= 70) {
    return { text: `${score}%`, emoji: '✨', color: 'text-blue-600' };
  } else if (score >= 55) {
    return { text: `${score}%`, emoji: '👍', color: 'text-yellow-600' };
  } else {
    return { text: `${score}%`, emoji: '📍', color: 'text-gray-600' };
  }
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}
