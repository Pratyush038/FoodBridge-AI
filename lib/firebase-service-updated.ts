// Updated Firebase service to work with the new backend
import { apiService } from './api-service';

export interface FoodDonation {
  id?: string;
  donorId: string;
  donorName: string;
  foodType: string;
  quantity: string;
  unit: string;
  description: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  pickupTime: string;
  expiryDate: string;
  imageUrl?: string;
  status: 'pending' | 'matched' | 'completed' | 'expired';
  matchedWith?: string;
  matchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodRequirement {
  id?: string;
  receiverId: string;
  receiverName: string;
  organizationName: string;
  title: string;
  foodType: string;
  quantity: string;
  unit: string;
  urgency: 'high' | 'medium' | 'low';
  description: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  neededBy: string;
  servingSize: string;
  status: 'active' | 'matched' | 'fulfilled';
  matchedWith?: string;
  matchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id?: string;
  donationId: string;
  requirementId: string;
  donorId: string;
  receiverId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  distance: number;
  matchScore: number;
  createdAt: string;
  updatedAt: string;
}

// Real-time listeners using polling (can be upgraded to WebSockets later)
class RealtimeService {
  private listeners: Map<string, { callback: Function; interval: NodeJS.Timeout }> = new Map();

  subscribe(key: string, callback: Function, pollInterval: number = 5000) {
    // Clear existing listener
    this.unsubscribe(key);

    // Set up polling
    const interval = setInterval(async () => {
      try {
        let data;
        switch (key) {
          case 'availableDonations':
            data = await apiService.getAvailableDonations();
            break;
          case 'activeRequirements':
            data = await apiService.getActiveRequirements();
            break;
          case 'myDonations':
            data = await apiService.getMyDonations();
            break;
          case 'myRequirements':
            data = await apiService.getMyRequirements();
            break;
          default:
            return;
        }
        callback(data);
      } catch (error) {
        console.error(`Error polling ${key}:`, error);
      }
    }, pollInterval);

    this.listeners.set(key, { callback, interval });

    // Initial call
    this.triggerCallback(key);

    // Return unsubscribe function
    return () => this.unsubscribe(key);
  }

  private async triggerCallback(key: string) {
    const listener = this.listeners.get(key);
    if (!listener) return;

    try {
      let data;
      switch (key) {
        case 'availableDonations':
          data = await apiService.getAvailableDonations();
          break;
        case 'activeRequirements':
          data = await apiService.getActiveRequirements();
          break;
        case 'myDonations':
          data = await apiService.getMyDonations();
          break;
        case 'myRequirements':
          data = await apiService.getMyRequirements();
          break;
        default:
          return;
      }
      listener.callback(data);
    } catch (error) {
      console.error(`Error in initial ${key} call:`, error);
    }
  }

  unsubscribe(key: string) {
    const listener = this.listeners.get(key);
    if (listener) {
      clearInterval(listener.interval);
      this.listeners.delete(key);
    }
  }

  unsubscribeAll() {
    this.listeners.forEach((listener, key) => {
      clearInterval(listener.interval);
    });
    this.listeners.clear();
  }
}

const realtimeService = new RealtimeService();

// Updated functions to use the new backend
export const createDonation = async (donation: Omit<FoodDonation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const response = await apiService.createDonation(donation);
    return response.donation.id;
  } catch (error) {
    console.error('Error creating donation:', error);
    throw error;
  }
};

export const updateDonationStatus = async (donationId: string, status: FoodDonation['status'], matchedWith?: string): Promise<void> => {
  try {
    await apiService.updateDonationStatus(donationId, status, matchedWith);
  } catch (error) {
    console.error('Error updating donation status:', error);
    throw error;
  }
};

export const getDonationsByDonor = (donorId: string, callback: (donations: FoodDonation[]) => void) => {
  return realtimeService.subscribe('myDonations', callback);
};

export const createRequirement = async (requirement: Omit<FoodRequirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const response = await apiService.createRequirement(requirement);
    return response.requirement.id;
  } catch (error) {
    console.error('Error creating requirement:', error);
    throw error;
  }
};

export const getRequirementsByReceiver = (receiverId: string, callback: (requirements: FoodRequirement[]) => void) => {
  return realtimeService.subscribe('myRequirements', callback);
};

export const createMatch = async (match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const response = await apiService.createMatch(match);
    return response.match.id;
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
};

export const updateMatchStatus = async (matchId: string, status: Match['status']): Promise<void> => {
  try {
    await apiService.updateMatchStatus(matchId, status);
  } catch (error) {
    console.error('Error updating match status:', error);
    throw error;
  }
};

export const listenToAvailableDonations = (callback: (donations: FoodDonation[]) => void) => {
  return realtimeService.subscribe('availableDonations', callback);
};

export const listenToActiveRequirements = (callback: (requirements: FoodRequirement[]) => void) => {
  return realtimeService.subscribe('activeRequirements', callback);
};

export const getAnalyticsData = async () => {
  try {
    const analytics = await apiService.getAnalytics();
    return {
      donations: analytics.donations || [],
      requirements: analytics.requirements || [],
      matches: analytics.matches || []
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return {
      donations: [],
      requirements: [],
      matches: []
    };
  }
};

export const removeListener = (unsubscribe: Function) => {
  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }
};

export const updateUserRole = async (userId: string, role: string): Promise<void> => {
  // This will be handled through the user profile update
  console.log(`Role update for user ${userId} to ${role} - handled via profile update`);
};

// Cleanup function for when components unmount
export const cleanup = () => {
  realtimeService.unsubscribeAll();
};