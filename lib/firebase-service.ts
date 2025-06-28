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

// Enhanced mock data with more realistic entries
const mockDonations: FoodDonation[] = [
  {
    id: '1',
    donorId: 'current-user',
    donorName: 'Green Valley Restaurant',
    foodType: 'fresh-produce',
    quantity: '25',
    unit: 'kg',
    description: 'Fresh organic vegetables - carrots, potatoes, onions',
    location: {
      address: '123 Main St, Downtown, City',
      lat: 40.7128,
      lng: -74.0060
    },
    pickupTime: '18:00',
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    donorId: 'donor2',
    donorName: 'City Bakery',
    foodType: 'baked-goods',
    quantity: '50',
    unit: 'items',
    description: 'Fresh bread, pastries, and sandwiches from today',
    location: {
      address: '456 Oak Ave, Midtown, City',
      lat: 40.7589,
      lng: -73.9851
    },
    pickupTime: '19:30',
    expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    donorId: 'current-user',
    donorName: 'Green Valley Restaurant',
    foodType: 'cooked-meals',
    quantity: '30',
    unit: 'portions',
    description: 'Vegetarian curry with rice - ready to serve',
    location: {
      address: '123 Main St, Downtown, City',
      lat: 40.7128,
      lng: -74.0060
    },
    pickupTime: '20:00',
    expiryDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: 'matched',
    matchedWith: 'Hope Shelter',
    matchedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

const mockRequirements: FoodRequirement[] = [
  {
    id: '1',
    receiverId: 'current-user',
    receiverName: 'Sarah Johnson',
    organizationName: 'Community Hope Shelter',
    title: 'Daily Meal Program - Vegetables Needed',
    foodType: 'fresh-produce',
    quantity: '40',
    unit: 'kg',
    urgency: 'high',
    description: 'We need fresh vegetables for our daily meal program serving 200+ people',
    location: {
      address: '789 Pine St, Uptown, City',
      lat: 40.7831,
      lng: -73.9712
    },
    neededBy: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    servingSize: '200',
    status: 'active',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    receiverId: 'receiver2',
    receiverName: 'Michael Chen',
    organizationName: 'Downtown Food Bank',
    title: 'Weekly Food Distribution',
    foodType: 'packaged-food',
    quantity: '100',
    unit: 'items',
    urgency: 'medium',
    description: 'Packaged foods for our weekly distribution to families in need',
    location: {
      address: '321 Elm St, Downtown, City',
      lat: 40.7505,
      lng: -73.9934
    },
    neededBy: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    servingSize: '150',
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    receiverId: 'current-user',
    receiverName: 'Sarah Johnson',
    organizationName: 'Community Hope Shelter',
    title: 'Emergency Food Request',
    foodType: 'cooked-meals',
    quantity: '50',
    unit: 'portions',
    urgency: 'high',
    description: 'Urgent need for ready-to-eat meals due to kitchen equipment failure',
    location: {
      address: '789 Pine St, Uptown, City',
      lat: 40.7831,
      lng: -73.9712
    },
    neededBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    servingSize: '50',
    status: 'matched',
    matchedWith: 'Green Valley Restaurant',
    matchedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

const mockMatches: Match[] = [
  {
    id: '1',
    donationId: '3',
    requirementId: '3',
    donorId: 'current-user',
    receiverId: 'current-user',
    status: 'confirmed',
    distance: 2.5,
    matchScore: 95,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

// Enhanced pub/sub system with better error handling
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
      listener([...data]); // Create a copy to prevent mutations
    } catch (error) {
      console.error('Error in listener callback:', error);
    }
  });
};

// Enhanced database availability check
const isDatabaseAvailable = async (): Promise<boolean> => {
  try {
    if (!database || typeof database !== 'object') {
      return false;
    }

    // Check if we have valid Firebase configuration
    const hasValidConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                          process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key' &&
                          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
                          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-project';
    
    if (!hasValidConfig) {
      console.log('📊 Firebase not configured properly, using mock data mode');
      return false;
    }

    // Test database connection
    const testRef = ref(database, '.info/connected');
    const snapshot = await get(testRef);
    return snapshot.exists();
  } catch (error) {
    console.log('📦 Firebase database not available, using mock data:', error);
    return false;
  }
};

// Synchronous version for immediate checks
const isDatabaseAvailableSync = (): boolean => {
  try {
    return !!(database && 
             process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key' &&
             process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-project');
  } catch (error) {
    return false;
  }
};

// Enhanced donation functions
export const createDonation = async (donation: Omit<FoodDonation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  console.log('📝 Creating donation:', donation);
  
  try {
    const isAvailable = await isDatabaseAvailable();
    
    if (!isAvailable) {
      console.log('📦 Using mock data for donation creation');
      const newDonation: FoodDonation = {
        ...donation,
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockDonations.unshift(newDonation);
      console.log('📦 Added donation to mock data:', newDonation.id);
      
      // Notify all listeners
      setTimeout(() => notify(donationsListeners, [...mockDonations]), 100);
      
      return newDonation.id!;
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
      id: key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(newDonationRef, donationWithId);
    console.log('✅ Donation saved to Firebase with ID:', key);
    return key;
  } catch (error) {
    console.error('❌ Error creating donation:', error);
    // Fallback to mock data
    const newDonation: FoodDonation = {
      ...donation,
      id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockDonations.unshift(newDonation);
    setTimeout(() => notify(donationsListeners, [...mockDonations]), 100);
    
    return newDonation.id!;
  }
};

export const updateDonationStatus = async (
  donationId: string, 
  status: FoodDonation['status'], 
  matchedWith?: string
): Promise<void> => {
  try {
    if (!isDatabaseAvailableSync()) {
      const donation = mockDonations.find(d => d.id === donationId);
      if (donation) {
        donation.status = status;
        donation.updatedAt = new Date().toISOString();
        if (matchedWith) {
          donation.matchedWith = matchedWith;
          donation.matchedAt = new Date().toISOString();
        }
        console.log('📦 Mock donation updated:', donation);
        setTimeout(() => notify(donationsListeners, [...mockDonations]), 100);
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
    console.log('✅ Donation status updated in Firebase');
  } catch (error) {
    console.error('❌ Error updating donation status:', error);
    throw error;
  }
};

export const getDonationsByDonor = (donorId: string, callback: (donations: FoodDonation[]) => void) => {
  console.log(`👂 Setting up listener for donations by donor: ${donorId}`);
  
  if (!isDatabaseAvailableSync()) {
    const getMockDonations = () => {
      console.log('📦 Getting mock donations for donor:', donorId);
      const filteredDonations = mockDonations.filter(d => 
        d.donorId === donorId || d.donorId === 'current-user'
      );
      console.log(`📦 Found ${filteredDonations.length} mock donations for this donor`);
      callback([...filteredDonations]);
    };

    getMockDonations();
    return subscribe(donationsListeners, getMockDonations);
  }

  try {
    console.log('🔥 Using real Firebase database for donations');
    const donationsRef = query(ref(database, 'donations'), orderByChild('donorId'), equalTo(donorId));
    
    const listener = onValue(donationsRef, (snapshot) => {
      const donations: FoodDonation[] = [];
      snapshot.forEach((child) => {
        donations.push(child.val());
      });
      console.log(`🔥 Found ${donations.length} donations from Firebase for donor: ${donorId}`);
      callback(donations.reverse());
    }, (error) => {
      console.error('❌ Error listening to donations:', error);
      // Fallback to mock data
      const filteredDonations = mockDonations.filter(d => 
        d.donorId === donorId || d.donorId === 'current-user'
      );
      callback([...filteredDonations]);
    });

    return () => off(donationsRef, 'value', listener);
  } catch (error) {
    console.error('❌ Error setting up donations listener:', error);
    // Fallback to mock data
    const filteredDonations = mockDonations.filter(d => 
      d.donorId === donorId || d.donorId === 'current-user'
    );
    callback([...filteredDonations]);
    return () => {};
  }
};

// Enhanced requirement functions
export const createRequirement = async (requirement: Omit<FoodRequirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  console.log('📋 Creating requirement:', requirement);
  
  try {
    const isAvailable = await isDatabaseAvailable();
    
    if (!isAvailable) {
      console.log('📋 Using mock data for requirement creation');
      const newRequirement: FoodRequirement = {
        ...requirement,
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockRequirements.unshift(newRequirement);
      console.log('📋 Added requirement to mock data:', newRequirement.id);
      
      // Notify all listeners
      setTimeout(() => notify(requirementsListeners, [...mockRequirements]), 100);
      
      return newRequirement.id!;
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
      id: key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(newRequirementRef, requirementWithId);
    console.log('✅ Requirement saved to Firebase with ID:', key);
    return key;
  } catch (error) {
    console.error('❌ Error creating requirement:', error);
    // Fallback to mock data
    const newRequirement: FoodRequirement = {
      ...requirement,
      id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockRequirements.unshift(newRequirement);
    setTimeout(() => notify(requirementsListeners, [...mockRequirements]), 100);
    
    return newRequirement.id!;
  }
};

export const getRequirementsByReceiver = (receiverId: string, callback: (requirements: FoodRequirement[]) => void) => {
  console.log(`👂 Setting up listener for requirements by receiver: ${receiverId}`);

  if (!isDatabaseAvailableSync()) {
    const getMockRequirements = () => {
      console.log('📦 Getting mock requirements for receiver:', receiverId);
      const filteredRequirements = mockRequirements.filter(r => 
        r.receiverId === receiverId || r.receiverId === 'current-user'
      );
      console.log(`📦 Found ${filteredRequirements.length} mock requirements for this receiver`);
      callback([...filteredRequirements]);
    };

    getMockRequirements();
    return subscribe(requirementsListeners, getMockRequirements);
  }

  try {
    console.log('🔥 Using real Firebase database for requirements');
    const requirementsRef = query(ref(database, 'requirements'), orderByChild('receiverId'), equalTo(receiverId));
    
    const listener = onValue(requirementsRef, (snapshot) => {
      const requirements: FoodRequirement[] = [];
      snapshot.forEach((child) => {
        requirements.push(child.val());
      });
      console.log(`🔥 Found ${requirements.length} requirements from Firebase for receiver: ${receiverId}`);
      callback(requirements.reverse());
    }, (error) => {
      console.error('❌ Error listening to requirements:', error);
      // Fallback to mock data
      const filteredRequirements = mockRequirements.filter(r => 
        r.receiverId === receiverId || r.receiverId === 'current-user'
      );
      callback([...filteredRequirements]);
    });

    return () => off(requirementsRef, 'value', listener);
  } catch (error) {
    console.error('❌ Error setting up requirements listener:', error);
    // Fallback to mock data
    const filteredRequirements = mockRequirements.filter(r => 
      r.receiverId === receiverId || r.receiverId === 'current-user'
    );
    callback([...filteredRequirements]);
    return () => {};
  }
};

// Enhanced match functions
export const createMatch = async (match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const isAvailable = await isDatabaseAvailable();
    
    if (!isAvailable) {
      const newId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const matchData: Match = {
        ...match,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockMatches.push(matchData);
      console.log('📦 Mock match created:', matchData);
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
    console.log('✅ Match created in Firebase:', newMatchRef.key);
    return newMatchRef.key!;
  } catch (error) {
    console.error('❌ Error creating match:', error);
    // Fallback to mock data
    const newId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const matchData: Match = {
      ...match,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockMatches.push(matchData);
    return newId;
  }
};

export const updateMatchStatus = async (matchId: string, status: Match['status']): Promise<void> => {
  try {
    if (!isDatabaseAvailableSync()) {
      const match = mockMatches.find(m => m.id === matchId);
      if (match) {
        match.status = status;
        match.updatedAt = new Date().toISOString();
        console.log('📦 Mock match updated:', match);
      }
      return;
    }

    const matchRef = ref(database, `matches/${matchId}`);
    await update(matchRef, {
      status,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Match status updated in Firebase');
  } catch (error) {
    console.error('❌ Error updating match status:', error);
    throw error;
  }
};

// Enhanced real-time listeners
export const listenToAvailableDonations = (callback: (donations: FoodDonation[]) => void) => {
  console.log('👂 Setting up listener for available donations');
  
  if (!isDatabaseAvailableSync()) {
    console.log('📦 Using mock data for available donations');
    const getMockDonations = () => {
      const donations = mockDonations.filter(d => d.status === 'pending');
      console.log('📦 Mock available donations found:', donations.length);
      callback([...donations]);
    };

    getMockDonations();
    return subscribe(donationsListeners, getMockDonations);
  }

  try {
    const availableDonationsRef = query(
      ref(database, 'donations'), 
      orderByChild('status'), 
      equalTo('pending')
    );
    
    const listener = onValue(availableDonationsRef, (snapshot) => {
      const donations: FoodDonation[] = [];
      snapshot.forEach((child) => {
        donations.push(child.val());
      });
      console.log(`🔥 Found ${donations.length} available donations from Firebase`);
      callback(donations);
    }, (error) => {
      console.error('❌ Error listening to available donations:', error);
      // Fallback to mock data
      const donations = mockDonations.filter(d => d.status === 'pending');
      callback([...donations]);
    });

    return () => off(availableDonationsRef, 'value', listener);
  } catch (error) {
    console.error('❌ Error setting up available donations listener:', error);
    // Fallback to mock data
    const donations = mockDonations.filter(d => d.status === 'pending');
    callback([...donations]);
    return () => {};
  }
};

export const listenToActiveRequirements = (callback: (requirements: FoodRequirement[]) => void) => {
  console.log('👂 Setting up listener for active requirements');
  
  if (!isDatabaseAvailableSync()) {
    console.log('📋 Using mock data for requirements');
    const getMockRequirements = () => {
      const requirements = mockRequirements.filter(r => r.status === 'active');
      console.log('📋 Mock requirements found:', requirements.length);
      callback([...requirements]);
    };

    getMockRequirements();
    return subscribe(requirementsListeners, getMockRequirements);
  }

  try {
    console.log('🔥 Using real Firebase for active requirements');
    const activeRequirementsRef = query(
      ref(database, 'requirements'), 
      orderByChild('status'), 
      equalTo('active')
    );
    
    const listener = onValue(activeRequirementsRef, (snapshot) => {
      const requirements: FoodRequirement[] = [];
      snapshot.forEach((child) => {
        requirements.push(child.val());
      });
      console.log(`🔥 Found ${requirements.length} active requirements from Firebase`);
      callback(requirements);
    }, (error) => {
      console.error('❌ Error listening to active requirements:', error);
      // Fallback to mock data
      const requirements = mockRequirements.filter(r => r.status === 'active');
      callback([...requirements]);
    });

    return () => off(activeRequirementsRef, 'value', listener);
  } catch (error) {
    console.error('❌ Error setting up active requirements listener:', error);
    // Fallback to mock data
    const requirements = mockRequirements.filter(r => r.status === 'active');
    callback([...requirements]);
    return () => {};
  }
};

// Enhanced analytics with better caching
let analyticsCache: any = null;
let analyticsCacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export const getAnalyticsData = async () => {
  // Return cached data if still valid
  if (analyticsCache && Date.now() - analyticsCacheTime < CACHE_DURATION) {
    console.log('📊 Returning cached analytics data');
    return analyticsCache;
  }

  try {
    const isAvailable = await isDatabaseAvailable();
    
    if (!isAvailable) {
      console.log('📊 Using mock analytics data');
      const data = {
        donations: [...mockDonations],
        requirements: [...mockRequirements],
        matches: [...mockMatches]
      };
      analyticsCache = data;
      analyticsCacheTime = Date.now();
      return data;
    }

    console.log('🔥 Fetching analytics data from Firebase');
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
    console.log('✅ Analytics data fetched and cached');
    return data;
  } catch (error) {
    console.error('❌ Error fetching analytics data:', error);
    // Fallback to mock data
    const data = {
      donations: [...mockDonations],
      requirements: [...mockRequirements],
      matches: [...mockMatches]
    };
    analyticsCache = data;
    analyticsCacheTime = Date.now();
    return data;
  }
};

// Utility functions
export const removeListener = (ref: any, callback: any) => {
  if (ref && callback) {
    off(ref, 'value', callback);
  }
};

export const updateUserRole = async (userId: string, role: string): Promise<void> => {
  console.log(`👤 Updating role for user ${userId} to ${role}`);
  
  try {
    if (!isDatabaseAvailableSync()) {
      console.log('📦 Mock user role updated (no persistent storage in mock mode)');
      return;
    }

    const userRef = ref(database, `users/${userId}`);
    await update(userRef, { 
      role,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Role updated for user ${userId} to ${role}`);
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    throw error;
  }
};

// Clear cache function for testing
export const clearAnalyticsCache = () => {
  analyticsCache = null;
  analyticsCacheTime = 0;
  console.log('🗑️ Analytics cache cleared');
};