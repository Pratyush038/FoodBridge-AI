import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase';
import type { Database } from './database.types';

// NOTE: Throughout this file, you'll see @ts-ignore comments before Supabase operations.
// This is due to a TypeScript type inference issue when using placeholder environment variables.
// The Supabase client is properly typed, but TypeScript can't infer table types during compilation
// when using placeholder credentials. These operations will work correctly at runtime when
// proper credentials are provided.

type Donor = Database['public']['Tables']['donors']['Row'];
type DonorInsert = Database['public']['Tables']['donors']['Insert'];
type DonorUpdate = Database['public']['Tables']['donors']['Update'];

type NGO = Database['public']['Tables']['ngos']['Row'];
type NGOInsert = Database['public']['Tables']['ngos']['Insert'];
type NGOUpdate = Database['public']['Tables']['ngos']['Update'];

type FoodItem = Database['public']['Tables']['food_items']['Row'];
type FoodItemInsert = Database['public']['Tables']['food_items']['Insert'];
type FoodItemUpdate = Database['public']['Tables']['food_items']['Update'];

type Request = Database['public']['Tables']['requests']['Row'];
type RequestInsert = Database['public']['Tables']['requests']['Insert'];
type RequestUpdate = Database['public']['Tables']['requests']['Update'];

type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

type Feedback = Database['public']['Tables']['feedback']['Row'];
type FeedbackInsert = Database['public']['Tables']['feedback']['Insert'];

// =====================================================
// DONOR OPERATIONS
// =====================================================

export const donorService = {
  // Create a new donor
  async create(donor: DonorInsert): Promise<Donor | null> {
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase not configured! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }

    const { data, error } = await supabase
      .from('donors')
      // @ts-ignore - Supabase type inference issue with environment variables
      .insert(donor)
      .select()
      .single();

    if (error) {
      console.error('Error creating donor:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Get donor by user ID
  async getByUserId(userId: string): Promise<Donor | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching donor:', error);
    }

    return data;
  },

  // Get donor by ID
  async getById(id: string): Promise<Donor | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching donor:', error);
      return null;
    }

    return data;
  },

  // Update donor
  async update(id: string, updates: DonorUpdate): Promise<Donor | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('donors')
      // @ts-ignore - Supabase type inference issue
      // @ts-ignore - Supabase type inference issue
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating donor:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Update donor tier (calls stored procedure)
  async updateTier(donorId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // @ts-ignore - Supabase type inference issue
    const { error } = await supabaseAdmin.rpc('update_donor_tier', {
      donor_id: donorId,
    });

    if (error) {
      console.error('Error updating donor tier:', error);
      throw new Error(error.message);
    }
  },

  // Get all donors (admin)
  async getAll(): Promise<Donor[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching donors:', error);
      return [];
    }

    return data || [];
  },
};

// =====================================================
// NGO OPERATIONS
// =====================================================

export const ngoService = {
  // Create a new NGO
  async create(ngo: NGOInsert): Promise<NGO | null> {
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase not configured! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }

    const { data, error } = await supabase
      .from('ngos')
      // @ts-ignore - Supabase type inference issue
      .insert(ngo)
      .select()
      .single();

    if (error) {
      console.error('Error creating NGO:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Get NGO by user ID
  async getByUserId(userId: string): Promise<NGO | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('ngos')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching NGO:', error);
    }

    return data;
  },

  // Get NGO by ID
  async getById(id: string): Promise<NGO | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('ngos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching NGO:', error);
      return null;
    }

    return data;
  },

  // Update NGO
  async update(id: string, updates: NGOUpdate): Promise<NGO | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('ngos')
      // @ts-ignore - Supabase type inference issue
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating NGO:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Get all NGOs
  async getAll(): Promise<NGO[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('ngos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching NGOs:', error);
      return [];
    }

    return data || [];
  },
};

// =====================================================
// FOOD ITEM OPERATIONS
// =====================================================

export const foodItemService = {
  // Create a new food item
  async create(foodItem: FoodItemInsert): Promise<FoodItem | null> {
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase not configured! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }

    const { data, error } = await supabase
      .from('food_items')
      // @ts-ignore - Supabase type inference issue
      .insert(foodItem)
      .select()
      .single();

    if (error) {
      console.error('Error creating food item:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Get food item by ID
  async getById(id: string): Promise<FoodItem | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching food item:', error);
      return null;
    }

    return data;
  },

  // Get all available food items
  async getAvailable(): Promise<FoodItem[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching available food items:', error);
      return [];
    }

    return data || [];
  },

  // Get food items by donor
  async getByDonor(donorId: string): Promise<FoodItem[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching donor food items:', error);
      return [];
    }

    return data || [];
  },

  // Update food item
  async update(id: string, updates: FoodItemUpdate): Promise<FoodItem | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('food_items')
      // @ts-ignore - Supabase type inference issue
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating food item:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Update status
  async updateStatus(
    id: string,
    status: Database['public']['Enums']['food_item_status']
  ): Promise<FoodItem | null> {
    return this.update(id, { status });
  },

  // Delete food item
  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.from('food_items').delete().eq('id', id);

    if (error) {
      console.error('Error deleting food item:', error);
      return false;
    }

    return true;
  },
};

// =====================================================
// REQUEST OPERATIONS
// =====================================================

export const requestService = {
  // Create a new request
  async create(request: RequestInsert): Promise<Request | null> {
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase not configured! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }

    const { data, error } = await supabase
      .from('requests')
      // @ts-ignore - Supabase type inference issue
      .insert(request)
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Get request by ID
  async getById(id: string): Promise<Request | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching request:', error);
      return null;
    }

    return data;
  },

  // Get all active requests
  async getActive(): Promise<Request[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active requests:', error);
      return [];
    }

    return data || [];
  },

  // Get requests by NGO
  async getByNGO(ngoId: string): Promise<Request[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('ngo_id', ngoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching NGO requests:', error);
      return [];
    }

    return data || [];
  },

  // Get nearby requests (calls stored procedure)
  async getNearby(
    latitude: number,
    longitude: number,
    maxDistanceKm: number = 50
  ): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    // @ts-ignore - Supabase type inference issue
    const { data, error } = await supabaseAdmin.rpc('get_nearby_requests', {
      donor_lat: latitude,
      donor_lng: longitude,
      max_distance_km: maxDistanceKm,
    });

    if (error) {
      console.error('Error fetching nearby requests:', error);
      return [];
    }

    return data || [];
  },

  // Update request
  async update(id: string, updates: RequestUpdate): Promise<Request | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('requests')
      // @ts-ignore - Supabase type inference issue
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating request:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Update status
  async updateStatus(
    id: string,
    status: Database['public']['Enums']['request_status']
  ): Promise<Request | null> {
    return this.update(id, { status });
  },

  // Delete request
  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.from('requests').delete().eq('id', id);

    if (error) {
      console.error('Error deleting request:', error);
      return false;
    }

    return true;
  },
};

// =====================================================
// TRANSACTION OPERATIONS
// =====================================================

export const transactionService = {
  // Create a new transaction
  async create(transaction: TransactionInsert): Promise<Transaction | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      return null;
    }

    const { data, error } = await supabase
      .from('transactions')
      // @ts-ignore - Supabase type inference issue
      .insert(transaction)
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Get transaction by ID
  async getById(id: string): Promise<Transaction | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }

    return data;
  },

  // Get transactions by donor
  async getByDonor(donorId: string): Promise<Transaction[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('donor_id', donorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching donor transactions:', error);
      return [];
    }

    return data || [];
  },

  // Get transactions by NGO
  async getByNGO(ngoId: string): Promise<Transaction[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('ngo_id', ngoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching NGO transactions:', error);
      return [];
    }

    return data || [];
  },

  // Update transaction
  async update(
    id: string,
    updates: TransactionUpdate
  ): Promise<Transaction | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('transactions')
      // @ts-ignore - Supabase type inference issue
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Update status
  async updateStatus(
    id: string,
    status: Database['public']['Enums']['transaction_status']
  ): Promise<Transaction | null> {
    return this.update(id, { status });
  },

  // Calculate match score (calls stored procedure)
  async calculateMatchScore(
    foodItemId: string,
    requestId: string
  ): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    // @ts-ignore - Supabase type inference issue
    const { data, error } = await supabaseAdmin.rpc('calculate_match_score', {
      food_item_id: foodItemId,
      request_id: requestId,
    });

    if (error) {
      console.error('Error calculating match score:', error);
      return 0;
    }

    return data || 0;
  },

  // Get all transactions (admin/analytics)
  async getAll(): Promise<Transaction[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  },
};

// =====================================================
// FEEDBACK OPERATIONS
// =====================================================

export const feedbackService = {
  // Create new feedback
  async create(feedback: FeedbackInsert): Promise<Feedback | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      return null;
    }

    const { data, error } = await supabase
      .from('feedback')
      // @ts-ignore - Supabase type inference issue
      .insert(feedback)
      .select()
      .single();

    if (error) {
      console.error('Error creating feedback:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Get feedback by transaction
  async getByTransaction(transactionId: string): Promise<Feedback[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('transaction_id', transactionId);

    if (error) {
      console.error('Error fetching transaction feedback:', error);
      return [];
    }

    return data || [];
  },

  // Get feedback for a user
  async getForUser(userId: string): Promise<Feedback[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user feedback:', error);
      return [];
    }

    return data || [];
  },

  // Get feedback by a user
  async getByUser(userId: string): Promise<Feedback[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user feedback:', error);
      return [];
    }

    return data || [];
  },
};

// =====================================================
// ANALYTICS & REPORTING
// =====================================================

export const analyticsService = {
  // Get weekly donation report
  async getWeeklyReport(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('weekly_donation_report')
      .select('*')
      .limit(12); // Last 12 weeks

    if (error) {
      console.error('Error fetching weekly report:', error);
      return [];
    }

    return data || [];
  },

  // Get donor performance
  async getDonorPerformance(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('donor_performance')
      .select('*')
      .limit(50);

    if (error) {
      console.error('Error fetching donor performance:', error);
      return [];
    }

    return data || [];
  },

  // Get NGO activity
  async getNGOActivity(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('ngo_activity')
      .select('*')
      .limit(50);

    if (error) {
      console.error('Error fetching NGO activity:', error);
      return [];
    }

    return data || [];
  },

  // Get dashboard statistics
  async getDashboardStats(): Promise<{
    totalDonors: number;
    totalNGOs: number;
    totalFoodItems: number;
    activeRequests: number;
    completedTransactions: number;
    totalQuantityDonated: number;
  }> {
    if (!isSupabaseConfigured()) {
      return {
        totalDonors: 0,
        totalNGOs: 0,
        totalFoodItems: 0,
        activeRequests: 0,
        completedTransactions: 0,
        totalQuantityDonated: 0,
      };
    }

    try {
      const [donors, ngos, foodItems, requests, completedFoodItems] =
        await Promise.all([
          supabase.from('donors').select('id', { count: 'exact', head: true }),
          supabase.from('ngos').select('id', { count: 'exact', head: true }),
          supabase
            .from('food_items')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase
            .from('food_items')
            .select('quantity, status')
            .eq('status', 'collected'), // 'collected' means completed donation
        ]);

      // Calculate completed donations and total quantity from food_items
      const completedCount = completedFoodItems.data?.length || 0;
      const totalQuantityDonated = completedFoodItems.data?.reduce(
        (sum, item: any) => sum + (item.quantity || 0),
        0
      ) || 0;

      console.log('📊 Analytics Query Results:', {
        completedDonations: completedCount,
        totalQuantityDonated: totalQuantityDonated
      });

      return {
        totalDonors: donors.count || 0,
        totalNGOs: ngos.count || 0,
        totalFoodItems: foodItems.count || 0,
        activeRequests: requests.count || 0,
        completedTransactions: completedCount, // Using collected food items
        totalQuantityDonated,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalDonors: 0,
        totalNGOs: 0,
        totalFoodItems: 0,
        activeRequests: 0,
        completedTransactions: 0,
        totalQuantityDonated: 0,
      };
    }
  },
};

// Export all services
export const supabaseService = {
  donor: donorService,
  ngo: ngoService,
  foodItem: foodItemService,
  request: requestService,
  transaction: transactionService,
  feedback: feedbackService,
  analytics: analyticsService,
};
