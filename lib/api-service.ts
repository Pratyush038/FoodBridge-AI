// Frontend API service to communicate with the new backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      // Get Firebase ID token from current user
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async registerUser(userData: {
    name: string;
    role: string;
    organizationName?: string;
  }) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserProfile() {
    return this.makeRequest('/auth/profile');
  }

  async updateUserProfile(profileData: {
    name?: string;
    organizationName?: string;
    location?: any;
  }) {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Donation endpoints
  async createDonation(donationData: any) {
    return this.makeRequest('/donations', {
      method: 'POST',
      body: JSON.stringify(donationData),
    });
  }

  async getMyDonations() {
    return this.makeRequest('/donations/my-donations');
  }

  async getAvailableDonations() {
    return this.makeRequest('/donations/available');
  }

  async updateDonationStatus(id: string, status: string, matchedWith?: string) {
    return this.makeRequest(`/donations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, matchedWith }),
    });
  }

  async getAllDonations() {
    return this.makeRequest('/donations/all');
  }

  async getDonationAnalytics() {
    return this.makeRequest('/donations/analytics');
  }

  // Requirement endpoints
  async createRequirement(requirementData: any) {
    return this.makeRequest('/requirements', {
      method: 'POST',
      body: JSON.stringify(requirementData),
    });
  }

  async getMyRequirements() {
    return this.makeRequest('/requirements/my-requirements');
  }

  async getActiveRequirements() {
    return this.makeRequest('/requirements/active');
  }

  async updateRequirementStatus(id: string, status: string, matchedWith?: string) {
    return this.makeRequest(`/requirements/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, matchedWith }),
    });
  }

  async getAllRequirements() {
    return this.makeRequest('/requirements/all');
  }

  async getRequirementAnalytics() {
    return this.makeRequest('/requirements/analytics');
  }

  // Match endpoints
  async createMatch(matchData: {
    donationId: string;
    requirementId: string;
    distance: number;
    matchScore: number;
  }) {
    return this.makeRequest('/matches', {
      method: 'POST',
      body: JSON.stringify(matchData),
    });
  }

  async getMyMatches() {
    return this.makeRequest('/matches/my-matches');
  }

  async updateMatchStatus(id: string, status: string) {
    return this.makeRequest(`/matches/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getAllMatches() {
    return this.makeRequest('/matches/all');
  }

  // Analytics endpoints
  async getAnalytics() {
    return this.makeRequest('/analytics');
  }

  async getMyStats() {
    return this.makeRequest('/analytics/my-stats');
  }
}

export const apiService = new ApiService();