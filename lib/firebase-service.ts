import { 
  ref, 
  push, 
  set, 
  get, 
  onValue, 
  off, 
  update,
  query,
  orderByChild,
  equalTo,
  limitToLast
} from 'firebase/database';
import { database } from './firebase';

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

// Mock data for when database is not available - reduced initial load
const mockDonations: FoodDonation[] = [
  {
    id: '1',
    donorId: 'current-user',
    donorName: 'Local Restaurant',
    foodType: 'Fresh Vegetables',
    quantity: '50',
    unit: 'kg',
    description: 'Fresh organic vegetables from our garden',
    location: {
      address: '123 Main St, Downtown',
      lat: 37.7749,
      lng: -122.4194
    },
    pickupTime: '2024-01-15T18:00:00Z',
    expiryDate: '2024-01-20T00:00:00Z',
    status: 'pending',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z'
  },
  {
    id: '2',
    donorId: 'donor2',
    donorName: 'Community Bakery',
    foodType: 'Bread and Pastries',
    quantity: '100',
    unit: 'pieces',
    description: 'Freshly baked bread and pastries',
    location: {
      address: '456 Oak Ave, Midtown',
      lat: 37.7849,
      lng: -122.4094
    },
    pickupTime: '2024-01-16T19:00:00Z',
    expiryDate: '2024-01-17T00:00:00Z',
    status: 'pending',
    createdAt: '2024-01-11T08:00:00Z',
    updatedAt: '2024-01-11T08:00:00Z'
  }
];

const mockRequirements: FoodRequirement[] = [
  {
    id: '1',
    receiverId: 'current-user',
    receiverName: 'John Smith',
    organizationName: 'Community Shelter',
    title: 'Daily Meal Program',
    foodType: 'Vegetables and Grains',
    quantity: '30',
    unit: 'kg',
    urgency: 'high',
    description: 'Need fresh vegetables for our daily meal program',
    location: {
      address: '789 Pine St, Uptown',
      lat: 37.7649,
      lng: -122.4294
    },
    neededBy: '2024-01-18T00:00:00Z',
    servingSize: '150',
    status: 'active',
    createdAt: '2024-01-12T09:00:00Z',
    updatedAt: '2024-01-12T09:00:00Z'
  },
  {
    id: '2',
    receiverId: 'receiver2',
    receiverName: 'Jane Doe',
    organizationName: 'Food Bank',
    title: 'Weekly Food Distribution',
    foodType: 'Any Food Type',
    quantity: '100',
    unit: 'portions',
    urgency: 'medium',
    description: 'Weekly food distribution for families in need',
    location: {
      address: '321 Elm St, Downtown',
      lat: 37.7749,
      lng: -122.4194
    },
    neededBy: '2024-01-20T00:00:00Z',
    servingSize: '100',
    status: 'active',
    createdAt: '2024-01-13T10:00:00Z',
    updatedAt: '2024-01-13T10:00:00Z'
  }
];

const mockMatches: Match[] = [
  {
    id: '1',
    donationId: '1',
    requirementId: '1',
    donorId: 'donor1',
    receiverId: 'receiver1',
    status: 'confirmed',
    distance: 2.5,
    matchScore: 95,
    createdAt: '2024-01-13T14:00:00Z',
    updatedAt: '2024-01-13T14:00:00Z'
  }
];

// --- Mock Data Pub/Sub System ---
type Listener<T> = (data: T[]) => void;

let donationsListeners: Listener<FoodDonation>[] = [];
let requirementsListeners: Listener<FoodRequirement>[] = [];

const subscribe = <T>(listeners: Listener<T>[], callback: Listener<T>) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

const notify = <T>(listeners: Listener<T>[], data: T[]) => {
  console.log(`🔔 Notifying ${listeners.length} listeners with ${data.length} items`);
  listeners.forEach(listener => {
    try {
      listener(data);
    } catch (error) {
      console.error('Error in listener callback:', error);
    }
  });
};
// --------------------------------

// Check if database is available
const isDatabaseAvailable = () => {
  try {
    // Check if we have valid Firebase configuration
    const hasValidConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                          process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key' &&
                          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
                          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-project';
    
    if (!hasValidConfig) {
      console.log('📊 Firebase not configured, using mock data mode');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('📊 Error checking database availability:', error);
    return false;
  }
};

// Cache for database availability check
let databaseAvailableCache: boolean | null = null;

const getDatabaseAvailability = async () => {
  try {
    // Test database connection by trying to read a test node
    const testRef = ref(database, '.info/connected');
    const snapshot = await get(testRef);
    console.log('🔥 Firebase database connection test:', snapshot.exists());
    return snapshot.exists();
  } catch (error) {
    console.log('📦 Firebase database not available, using mock data:', error);
    return false;
  }
};

// Synchronous version for functions that need it
const getDatabaseAvailabilitySync = () => {
  try {
    // Simple check if database is initialized
    return database && database.app;
  } catch (error) {
    console.log('📦 Firebase database not available (sync check):', error);
    return false;
  }
};

// Donation functions
export const createDonation = async (donation: Omit<FoodDonation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  console.log('📝 Creating donation:', donation);
  
  try {
    const isAvailable = await getDatabaseAvailability();
    
    if (!isAvailable) {
      console.log('📦 Using mock data for donation creation');
      const newDonation: FoodDonation = {
        ...donation,
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to beginning of array to show newest first
      mockDonations.unshift(newDonation);
      console.log('📦 Added donation to mock data:', newDonation.id);
      console.log('📦 Total mock donations:', mockDonations.length);
      
      // Notify all listeners immediately with the updated data
      notify(donationsListeners, [...mockDonations]);
      
      return Promise.resolve(newDonation.id!);
    }

    console.log('🔥 Using real Firebase database for donation creation');
    const donationsRef = ref(database, 'donations');
    const newDonationRef = push(donationsRef);
    
    const key = newDonationRef.key;
    if (!key) {
      throw new Error('Failed to generate donation ID');
    }
    
    const donationWithId: FoodDonation = {
      ...donation,
      id: key!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(newDonationRef, donationWithId);
    console.log('✅ Donation saved to Firebase with ID:', key);
    return key;
  } catch (error) {
    console.error('❌ Error creating donation:', error);
    // Fallback to mock data if Firebase fails
    console.log('📦 Falling back to mock data due to Firebase error');
    const newDonation: FoodDonation = {
      ...donation,
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockDonations.unshift(newDonation);
    notify(donationsListeners, [...mockDonations]);
    
    return Promise.resolve(newDonation.id!);
  }
};

export const updateDonationStatus = async (donationId: string, status: FoodDonation['status'], matchedWith?: string): Promise<void> => {
  if (!getDatabaseAvailabilitySync()) {
    const donation = mockDonations.find(d => d.id === donationId);
    if (donation) {
      donation.status = status;
      donation.updatedAt = new Date().toISOString();
      if (matchedWith) {
        donation.matchedWith = matchedWith;
        donation.matchedAt = new Date().toISOString();
      }
      console.log('Mock donation updated:', donation);
    }
    return;
  }

  const donationRef = ref(database, `donations/${donationId}`);
  const updates: Partial<FoodDonation> = {
    status,
    updatedAt: new Date().toISOString()
  };
  
  if (matchedWith) {
    updates.matchedWith = matchedWith;
    updates.matchedAt = new Date().toISOString();
  }
  
  await update(donationRef, updates);
};

export const getDonationsByDonor = (donorId: string, callback: (donations: FoodDonation[]) => void) => {
  console.log(`👂 Setting up listener for donations by donor: ${donorId}`);
  
  if (!getDatabaseAvailabilitySync()) {
    const getMockDonations = () => {
      console.log('📦 Getting mock donations for donor:', donorId);
      const filteredDonations = mockDonations.filter(d => d.donorId === donorId || d.donorId === 'current-user');
      console.log(`📦 Found ${filteredDonations.length} mock donations for this donor`);
      // Return in reverse order to show newest first (since we're adding to beginning of array)
      callback(filteredDonations);
    };

    getMockDonations();
    const unsubscribe = subscribe(donationsListeners, getMockDonations);
    return unsubscribe;
  }

  console.log('🔥 Using real Firebase database for donations');
  const donationsRef = query(ref(database, 'donations'), orderByChild('donorId'), equalTo(donorId));
  
  return onValue(donationsRef, (snapshot) => {
    const donations: FoodDonation[] = [];
    snapshot.forEach((child) => {
      donations.push(child.val());
    });
    console.log(`🔥 Found ${donations.length} donations from Firebase for donor: ${donorId}`);
    // Return in reverse order to show newest first
    callback(donations.reverse());
  });
};

// Requirement functions
export const createRequirement = async (requirement: Omit<FoodRequirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  console.log('📋 Creating requirement:', requirement);
  
  try {
    const isAvailable = await getDatabaseAvailability();
    
    if (!isAvailable) {
      console.log('📋 Using mock data for requirement creation');
      const newRequirement: FoodRequirement = {
        ...requirement,
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to beginning of array to show newest first
      mockRequirements.unshift(newRequirement);
      console.log('📋 Added requirement to mock data:', newRequirement.id);
      console.log('📋 Total mock requirements:', mockRequirements.length);
      
      // Notify all listeners immediately with the updated data
      notify(requirementsListeners, [...mockRequirements]);
      
      return Promise.resolve(newRequirement.id!);
    }

    console.log('🔥 Using real Firebase database for requirement creation');
    const requirementsRef = ref(database, 'requirements');
    const newRequirementRef = push(requirementsRef);
    
    const key = newRequirementRef.key;
    if (!key) {
      throw new Error('Failed to generate requirement ID');
    }

    const requirementWithId: FoodRequirement = {
      ...requirement,
      id: key!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(newRequirementRef, requirementWithId);
    console.log('✅ Requirement saved to Firebase with ID:', key);
    return key;
  } catch (error) {
    console.error('❌ Error creating requirement:', error);
    // Fallback to mock data if Firebase fails
    console.log('📋 Falling back to mock data due to Firebase error');
    const newRequirement: FoodRequirement = {
      ...requirement,
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockRequirements.unshift(newRequirement);
    notify(requirementsListeners, [...mockRequirements]);
    
    return Promise.resolve(newRequirement.id!);
  }
};

export const getRequirementsByReceiver = (receiverId: string, callback: (requirements: FoodRequirement[]) => void) => {
  console.log(`👂 Setting up listener for requirements by receiver: ${receiverId}`);

  if (!getDatabaseAvailabilitySync()) {
    const getMockRequirements = () => {
      console.log('📦 Getting mock requirements for receiver:', receiverId);
      const filteredRequirements = mockRequirements.filter(r => r.receiverId === receiverId || r.receiverId === 'current-user');
      console.log(`📦 Found ${filteredRequirements.length} mock requirements for this receiver`);
      // Return in reverse order to show newest first (since we're adding to beginning of array)
      callback(filteredRequirements);
    };

    getMockRequirements();
    const unsubscribe = subscribe(requirementsListeners, getMockRequirements);
    return unsubscribe;
  }

  console.log('🔥 Using real Firebase database for requirements');
  const requirementsRef = query(ref(database, 'requirements'), orderByChild('receiverId'), equalTo(receiverId));
  const listener = onValue(requirementsRef, (snapshot) => {
    const requirements: FoodRequirement[] = [];
    snapshot.forEach((child) => {
      requirements.push(child.val());
    });
    console.log(`🔥 Found ${requirements.length} requirements from Firebase for receiver: ${receiverId}`);
    // Return in reverse order to show newest first
    callback(requirements.reverse());
  });
  return () => {
    off(requirementsRef, 'value', listener);
  };
};

// Match functions
export const createMatch = async (match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const isAvailable = await getDatabaseAvailability();
  if (!isAvailable) {
    const newId = Date.now().toString();
    const matchData: Match = {
      ...match,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockMatches.push(matchData);
    console.log('Mock match created:', matchData);
    return newId;
  }

  const matchesRef = ref(database, 'matches');
  const newMatchRef = push(matchesRef);
  
  const matchData: Match = {
    ...match,
    id: newMatchRef.key!,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await set(newMatchRef, matchData);
  return newMatchRef.key!;
};

export const updateMatchStatus = async (matchId: string, status: Match['status']): Promise<void> => {
  if (!getDatabaseAvailabilitySync()) {
    const match = mockMatches.find(m => m.id === matchId);
    if (match) {
      match.status = status;
      match.updatedAt = new Date().toISOString();
      console.log('Mock match updated:', match);
    }
    return;
  }

  const matchRef = ref(database, `matches/${matchId}`);
  await update(matchRef, {
    status,
    updatedAt: new Date().toISOString()
  });
};

// Real-time listeners with debouncing
let donationsListenerTimeout: NodeJS.Timeout | null = null;
let requirementsListenerTimeout: NodeJS.Timeout | null = null;

export const listenToAvailableDonations = (callback: (donations: FoodDonation[]) => void) => {
  if (!getDatabaseAvailabilitySync()) {
    console.log('📦 Using mock data for available donations');
    const getMockDonations = () => {
      const donations = mockDonations.filter(d => d.status === 'pending');
      console.log('📦 Mock available donations found:', donations.length);
      callback(donations);
    };

    getMockDonations();
    return subscribe(donationsListeners, getMockDonations);
  }

  const availableDonationsRef = query(
    ref(database, 'donations'), 
    orderByChild('status'), 
    equalTo('pending')
  );
  
  return onValue(availableDonationsRef, (snapshot) => {
    // Debounce rapid updates
    if (donationsListenerTimeout) {
      clearTimeout(donationsListenerTimeout);
    }
    
    donationsListenerTimeout = setTimeout(() => {
      const donations: FoodDonation[] = [];
      snapshot.forEach((child) => {
        donations.push(child.val());
      });
      callback(donations);
    }, 100);
  });
};

export const listenToActiveRequirements = (callback: (requirements: FoodRequirement[]) => void) => {
  console.log('👂 listenToActiveRequirements called');
  
  if (!getDatabaseAvailabilitySync()) {
    console.log('📋 Using mock data for requirements');
    const getMockRequirements = () => {
      const requirements = mockRequirements.filter(r => r.status === 'active');
      console.log('📋 Mock requirements found:', requirements.length);
      callback(requirements);
    };

    getMockRequirements(); // Initial call
    return subscribe(requirementsListeners, getMockRequirements); // Subscribe to future changes
  }

  console.log('🔥 Using real Firebase for active requirements');
  const activeRequirementsRef = query(
    ref(database, 'requirements'), 
    orderByChild('status'), 
    equalTo('active')
  );
  
  return onValue(activeRequirementsRef, (snapshot) => {
    // Debounce rapid updates
    if (requirementsListenerTimeout) {
      clearTimeout(requirementsListenerTimeout);
    }
    
    requirementsListenerTimeout = setTimeout(() => {
      const requirements: FoodRequirement[] = [];
      snapshot.forEach((child) => {
        requirements.push(child.val());
      });
      console.log(`🔥 Found ${requirements.length} active requirements from Firebase`);
      callback(requirements);
    }, 100);
  });
};

// Analytics function with caching
let analyticsCache: any = null;
let analyticsCacheTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const getAnalyticsData = async () => {
  // Return cached data if still valid
  if (analyticsCache && Date.now() - analyticsCacheTime < CACHE_DURATION) {
    return analyticsCache;
  }

  const isAvailable = await getDatabaseAvailability();
  if (!isAvailable) {
    const data = {
      donations: mockDonations,
      requirements: mockRequirements,
      matches: mockMatches
    };
    analyticsCache = data;
    analyticsCacheTime = Date.now();
    return data;
  }

  try {
    const [donationsSnapshot, requirementsSnapshot, matchesSnapshot] = await Promise.all([
      get(ref(database, 'donations')),
      get(ref(database, 'requirements')),
      get(ref(database, 'matches'))
    ]);

    const donations: FoodDonation[] = [];
    const requirements: FoodRequirement[] = [];
    const matches: Match[] = [];

    donationsSnapshot.forEach((child) => {
      donations.push(child.val());
    });

    requirementsSnapshot.forEach((child) => {
      requirements.push(child.val());
    });

    matchesSnapshot.forEach((child) => {
      matches.push(child.val());
    });

    const data = { donations, requirements, matches };
    analyticsCache = data;
    analyticsCacheTime = Date.now();
    return data;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    const data = {
      donations: mockDonations,
      requirements: mockRequirements,
      matches: mockMatches
    };
    analyticsCache = data;
    analyticsCacheTime = Date.now();
    return data;
  }
};

export const removeListener = (ref: any, callback: any) => {
  if (ref && callback) {
    off(ref, 'value', callback);
  }
};

// User functions
export const updateUserRole = async (userId: string, role: string): Promise<void> => {
  console.log(`👤 Updating role for user ${userId} to ${role}`);
  
  if (!getDatabaseAvailabilitySync()) {
    console.log('📦 Mock user role updated in concept (no mock user store yet)');
    return;
  }

  const userRef = ref(database, `users/${userId}`);
  await update(userRef, { role });
  console.log(`✅ Role updated for user ${userId}`);
};