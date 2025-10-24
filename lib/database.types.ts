// Database type definitions for Supabase
// Auto-generated types for FoodBridge AI

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      donors: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          phone: string | null
          organization_name: string | null
          organization_type: string | null
          address: string
          latitude: number
          longitude: number
          verified: boolean
          total_donations: number
          tier: 'bronze' | 'silver' | 'gold' | 'platinum'
          reliability_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          phone?: string | null
          organization_name?: string | null
          organization_type?: string | null
          address: string
          latitude: number
          longitude: number
          verified?: boolean
          total_donations?: number
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          reliability_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          phone?: string | null
          organization_name?: string | null
          organization_type?: string | null
          address?: string
          latitude?: number
          longitude?: number
          verified?: boolean
          total_donations?: number
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          reliability_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      ngos: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          phone: string
          registration_number: string
          organization_type: string
          address: string
          latitude: number
          longitude: number
          verified: boolean
          serving_capacity: number
          total_requests: number
          rating: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          phone: string
          registration_number: string
          organization_type: string
          address: string
          latitude: number
          longitude: number
          verified?: boolean
          serving_capacity: number
          total_requests?: number
          rating?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          phone?: string
          registration_number?: string
          organization_type?: string
          address?: string
          latitude?: number
          longitude?: number
          verified?: boolean
          serving_capacity?: number
          total_requests?: number
          rating?: number
          created_at?: string
          updated_at?: string
        }
      }
      food_items: {
        Row: {
          id: string
          donor_id: string
          food_type: string
          quantity: number
          unit: string
          description: string
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          pickup_time: string
          expiry_date: string
          image_url: string | null
          status: 'available' | 'reserved' | 'collected' | 'expired' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          donor_id: string
          food_type: string
          quantity: number
          unit: string
          description: string
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          pickup_time: string
          expiry_date: string
          image_url?: string | null
          status?: 'available' | 'reserved' | 'collected' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          donor_id?: string
          food_type?: string
          quantity?: number
          unit?: string
          description?: string
          pickup_address?: string
          pickup_latitude?: number
          pickup_longitude?: number
          pickup_time?: string
          expiry_date?: string
          image_url?: string | null
          status?: 'available' | 'reserved' | 'collected' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          ngo_id: string
          title: string
          food_type: string
          quantity: number
          unit: string
          urgency: 'low' | 'medium' | 'high'
          description: string
          delivery_address: string
          delivery_latitude: number
          delivery_longitude: number
          needed_by: string
          serving_size: number
          status: 'active' | 'matched' | 'fulfilled' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ngo_id: string
          title: string
          food_type: string
          quantity: number
          unit: string
          urgency: 'low' | 'medium' | 'high'
          description: string
          delivery_address: string
          delivery_latitude: number
          delivery_longitude: number
          needed_by: string
          serving_size: number
          status?: 'active' | 'matched' | 'fulfilled' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ngo_id?: string
          title?: string
          food_type?: string
          quantity?: number
          unit?: string
          urgency?: 'low' | 'medium' | 'high'
          description?: string
          delivery_address?: string
          delivery_latitude?: number
          delivery_longitude?: number
          needed_by?: string
          serving_size?: number
          status?: 'active' | 'matched' | 'fulfilled' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          food_item_id: string
          request_id: string
          donor_id: string
          ngo_id: string
          quantity_transferred: number
          match_score: number
          status: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled'
          pickup_time: string | null
          delivery_time: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          food_item_id: string
          request_id: string
          donor_id: string
          ngo_id: string
          quantity_transferred: number
          match_score: number
          status?: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled'
          pickup_time?: string | null
          delivery_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          food_item_id?: string
          request_id?: string
          donor_id?: string
          ngo_id?: string
          quantity_transferred?: number
          match_score?: number
          status?: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled'
          pickup_time?: string | null
          delivery_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      feedback: {
        Row: {
          id: string
          transaction_id: string
          from_user_id: string
          to_user_id: string
          rating: number
          comment: string | null
          feedback_type: 'donor_to_ngo' | 'ngo_to_donor'
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          from_user_id: string
          to_user_id: string
          rating: number
          comment?: string | null
          feedback_type: 'donor_to_ngo' | 'ngo_to_donor'
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          from_user_id?: string
          to_user_id?: string
          rating?: number
          comment?: string | null
          feedback_type?: 'donor_to_ngo' | 'ngo_to_donor'
          created_at?: string
        }
      }
    }
    Views: {
      weekly_donation_report: {
        Row: {
          week_start: string
          total_donations: number
          total_quantity: number
          total_donors: number
          total_ngos: number
          completion_rate: number
        }
      }
      donor_performance: {
        Row: {
          donor_id: string
          donor_name: string
          total_donations: number
          completed_donations: number
          average_rating: number
          tier: string
        }
      }
      ngo_activity: {
        Row: {
          ngo_id: string
          ngo_name: string
          total_requests: number
          fulfilled_requests: number
          average_rating: number
          total_served: number
        }
      }
    }
    Functions: {
      update_donor_tier: {
        Args: { donor_id: string }
        Returns: void
      }
      calculate_match_score: {
        Args: {
          food_item_id: string
          request_id: string
        }
        Returns: number
      }
      get_nearby_requests: {
        Args: {
          donor_lat: number
          donor_lng: number
          max_distance_km: number
        }
        Returns: Database['public']['Tables']['requests']['Row'][]
      }
    }
    Enums: {
      donor_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
      food_item_status: 'available' | 'reserved' | 'collected' | 'expired' | 'cancelled'
      request_status: 'active' | 'matched' | 'fulfilled' | 'cancelled'
      transaction_status: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled'
      urgency_level: 'low' | 'medium' | 'high'
    }
  }
}
