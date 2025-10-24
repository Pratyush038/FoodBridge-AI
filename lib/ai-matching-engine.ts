import { FoodDonation, FoodRequirement } from './firebase-service';
import { supabaseService } from './supabase-service';
import { database } from './firebase';
import { ref, set, push, get } from 'firebase/database';

export interface MatchPrediction {
  donationId: string;
  requirementId: string;
  matchScore: number;
  confidence: number;
  factors: {
    foodTypeMatch: number;
    locationProximity: number;
    quantityMatch: number;
    urgencyFactor: number;
    donorHistory: number;
    receiverHistory: number;
  };
  timestamp?: string;
}

export interface DonorProfile {
  id: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalDonations: number;
  consistencyScore: number;
  preferredFoodTypes: string[];
  averageQuantity: number;
  responseTime: number;
  reliabilityScore: number;
}

export interface ImageClassification {
  foodType: string;
  confidence: number;
  freshness: 'excellent' | 'good' | 'fair' | 'poor';
  estimatedQuantity: number;
  allergens: string[];
}

class AIMatchingEngine {
  private foodTypeWeights: Record<string, number> = {
    'fresh-produce': 1.0,
    'cooked-meals': 0.9,
    'baked-goods': 0.8,
    'packaged-food': 0.7,
    'dairy': 0.85,
    'other': 0.6
  };

  private urgencyMultipliers: Record<string, number> = {
    'high': 1.5,
    'medium': 1.2,
    'low': 1.0
  };

  // Simulate ML model for food type matching
  calculateFoodTypeMatch(donationFoodType: string, requirementFoodType: string): number {
    if (requirementFoodType === 'any') return 1.0;
    if (donationFoodType === requirementFoodType) return 1.0;
    
    // Similar food types get partial matches
    const similarTypes: Record<string, string[]> = {
      'fresh-produce': ['packaged-food'],
      'cooked-meals': ['baked-goods'],
      'dairy': ['packaged-food'],
      'baked-goods': ['cooked-meals', 'packaged-food']
    };

    if (similarTypes[donationFoodType]?.includes(requirementFoodType)) {
      return 0.7;
    }

    return 0.3;
  }

  // Calculate distance-based proximity score
  calculateLocationProximity(
    donationLat: number, 
    donationLng: number, 
    requirementLat: number, 
    requirementLng: number
  ): number {
    const distance = this.calculateDistance(donationLat, donationLng, requirementLat, requirementLng);
    
    // Exponential decay for distance penalty
    if (distance <= 5) return 1.0;
    if (distance <= 10) return 0.8;
    if (distance <= 20) return 0.6;
    if (distance <= 50) return 0.4;
    return 0.2;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Calculate quantity compatibility
  calculateQuantityMatch(donationQty: number, requirementQty: number): number {
    const ratio = Math.min(donationQty, requirementQty) / Math.max(donationQty, requirementQty);
    return Math.pow(ratio, 0.5); // Square root to be less harsh on quantity differences
  }

  // Simulate donor history analysis
  calculateDonorHistory(donorId: string): number {
    // In a real implementation, this would analyze past donation patterns
    // For now, return a simulated score based on donor ID hash
    const hash = this.simpleHash(donorId);
    return 0.5 + (hash % 50) / 100; // Score between 0.5 and 1.0
  }

  // Simulate receiver history analysis
  calculateReceiverHistory(receiverId: string): number {
    const hash = this.simpleHash(receiverId);
    return 0.6 + (hash % 40) / 100; // Score between 0.6 and 1.0
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Main matching algorithm - uses hybrid storage
  // Fetches structured data from Supabase, stores predictions in Firebase
  async predictMatches(
    donations?: FoodDonation[], 
    requirements?: FoodRequirement[]
  ): Promise<MatchPrediction[]> {
    const predictions: MatchPrediction[] = [];

    try {
      // If not provided, fetch from Supabase
      let foodItems = donations;
      let requests = requirements;

      if (!foodItems) {
        const availableItems = await supabaseService.foodItem.getAvailable();
        // Convert Supabase format to FoodDonation format
        foodItems = availableItems.map(item => ({
          id: item.id,
          donorId: item.donor_id,
          donorName: '', // Will be enriched if needed
          foodType: item.food_type,
          quantity: item.quantity.toString(),
          unit: item.unit,
          description: item.description,
          location: {
            address: item.pickup_address,
            lat: item.pickup_latitude,
            lng: item.pickup_longitude,
          },
          pickupTime: item.pickup_time,
          expiryDate: item.expiry_date,
          imageUrl: item.image_url || undefined,
          status: 'pending',
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
      }

      if (!requests) {
        const activeRequests = await supabaseService.request.getActive();
        // Convert Supabase format to FoodRequirement format
        requests = activeRequests.map(req => ({
          id: req.id,
          receiverId: req.ngo_id,
          receiverName: '', // Will be enriched if needed
          organizationName: '',
          title: req.title,
          foodType: req.food_type,
          quantity: req.quantity.toString(),
          unit: req.unit,
          urgency: req.urgency as 'high' | 'medium' | 'low',
          description: req.description,
          location: {
            address: req.delivery_address,
            lat: req.delivery_latitude,
            lng: req.delivery_longitude,
          },
          neededBy: req.needed_by,
          servingSize: req.serving_size.toString(),
          status: 'active',
          createdAt: req.created_at,
          updatedAt: req.updated_at,
        }));
      }

      for (const donation of foodItems) {
        // Skip non-available donations
        const donationStatus = donation.status || 'pending';
        if (donationStatus !== 'pending') continue;

        for (const requirement of requests) {
          if (requirement.status !== 'active') continue;

          const factors = {
            foodTypeMatch: this.calculateFoodTypeMatch(donation.foodType, requirement.foodType),
            locationProximity: this.calculateLocationProximity(
              donation.location.lat,
              donation.location.lng,
              requirement.location.lat,
              requirement.location.lng
            ),
            quantityMatch: this.calculateQuantityMatch(
              parseFloat(donation.quantity),
              parseFloat(requirement.quantity)
            ),
            urgencyFactor: this.urgencyMultipliers[requirement.urgency] || 1.0,
            donorHistory: this.calculateDonorHistory(donation.donorId),
            receiverHistory: this.calculateReceiverHistory(requirement.receiverId)
          };

          // Weighted score calculation
          const matchScore = (
            factors.foodTypeMatch * 0.25 +
            factors.locationProximity * 0.30 +
            factors.quantityMatch * 0.20 +
            factors.donorHistory * 0.15 +
            factors.receiverHistory * 0.10
          ) * factors.urgencyFactor;

          // Confidence based on data quality and consistency
          const confidence = Math.min(
            (factors.foodTypeMatch + factors.locationProximity + factors.quantityMatch) / 3,
            0.95
          );

          if (matchScore > 0.4) { // Only include viable matches
            const prediction: MatchPrediction = {
              donationId: donation.id!,
              requirementId: requirement.id!,
              matchScore,
              confidence,
              factors,
              timestamp: new Date().toISOString(),
            };
            predictions.push(prediction);
          }
        }
      }

      // Sort by match score descending
      const sortedPredictions = predictions.sort((a, b) => b.matchScore - a.matchScore);

      // Store predictions in Firebase for real-time access
      await this.storePredictionsInFirebase(sortedPredictions);

      return sortedPredictions;
    } catch (error) {
      console.error('Error in predictMatches:', error);
      // Fallback to empty predictions
      return [];
    }
  }

  // Store AI predictions in Firebase (NoSQL) for real-time access
  private async storePredictionsInFirebase(predictions: MatchPrediction[]): Promise<void> {
    try {
      const predictionsRef = ref(database, 'ai_predictions');
      const timestamp = new Date().toISOString();
      
      // Store the latest prediction batch
      await set(predictionsRef, {
        predictions: predictions.slice(0, 50), // Store top 50 matches
        generatedAt: timestamp,
        count: predictions.length,
      });

      console.log(`✅ Stored ${predictions.length} AI predictions in Firebase`);
    } catch (error) {
      console.error('Error storing predictions in Firebase:', error);
    }
  }

  // Retrieve predictions from Firebase
  async getPredictionsFromFirebase(): Promise<{
    predictions: MatchPrediction[];
    generatedAt: string;
    count: number;
  } | null> {
    try {
      const predictionsRef = ref(database, 'ai_predictions');
      const snapshot = await get(predictionsRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error('Error retrieving predictions from Firebase:', error);
      return null;
    }
  }

  // Image recognition simulation
  async classifyFoodImage(imageData: string): Promise<ImageClassification> {
    // Simulate AI image processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate classification results
    const foodTypes = ['fresh-produce', 'cooked-meals', 'baked-goods', 'packaged-food', 'dairy'];
    const randomType = foodTypes[Math.floor(Math.random() * foodTypes.length)];
    
    return {
      foodType: randomType,
      confidence: 0.85 + Math.random() * 0.1,
      freshness: ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)] as any,
      estimatedQuantity: Math.floor(Math.random() * 50) + 10,
      allergens: this.detectAllergens(randomType)
    };
  }

  private detectAllergens(foodType: string): string[] {
    const allergenMap: Record<string, string[]> = {
      'baked-goods': ['gluten', 'eggs', 'dairy'],
      'dairy': ['dairy', 'lactose'],
      'cooked-meals': ['gluten', 'soy'],
      'packaged-food': ['preservatives', 'artificial-colors'],
      'fresh-produce': []
    };

    return allergenMap[foodType] || [];
  }

  // Calculate donor tier based on activity
  calculateDonorTier(totalDonations: number, consistencyScore: number): DonorProfile['tier'] {
    const score = totalDonations * 0.7 + consistencyScore * 0.3;
    
    if (score >= 80) return 'platinum';
    if (score >= 60) return 'gold';
    if (score >= 30) return 'silver';
    return 'bronze';
  }
}

export const aiMatchingEngine = new AIMatchingEngine();