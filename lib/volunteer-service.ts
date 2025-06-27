export interface VolunteerRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  title: string;
  description: string;
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  deliveryLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  scheduledTime: string;
  estimatedDuration: number; // in minutes
  volunteersNeeded: number;
  volunteersAssigned: string[];
  status: 'open' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  requirements: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: {
    lat: number;
    lng: number;
  };
  availability: {
    days: string[];
    timeSlots: string[];
  };
  skills: string[];
  vehicleType: 'car' | 'bike' | 'van' | 'truck' | 'walking';
  rating: number;
  completedTasks: number;
  verified: boolean;
  active: boolean;
}

export interface RouteOptimization {
  volunteerId: string;
  route: {
    waypoints: Array<{
      location: { lat: number; lng: number };
      address: string;
      type: 'pickup' | 'delivery';
      estimatedTime: string;
    }>;
    totalDistance: number;
    totalDuration: number;
    optimizedOrder: number[];
  };
  estimatedCost: number;
  fuelEfficiency: number;
}

class VolunteerService {
  async createVolunteerRequest(request: Omit<VolunteerRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const requestId = `vol_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const volunteerRequest: VolunteerRequest = {
      ...request,
      id: requestId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real implementation, save to database
    console.log('Created volunteer request:', volunteerRequest);
    
    return requestId;
  }

  async findNearbyVolunteers(
    location: { lat: number; lng: number },
    radiusKm: number = 25,
    requirements: string[] = []
  ): Promise<Volunteer[]> {
    // Simulate volunteer database
    const mockVolunteers: Volunteer[] = [
      {
        id: 'vol_1',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '+1234567890',
        location: { lat: location.lat + 0.01, lng: location.lng + 0.01 },
        availability: {
          days: ['monday', 'wednesday', 'friday'],
          timeSlots: ['morning', 'afternoon']
        },
        skills: ['food-handling', 'driving'],
        vehicleType: 'car',
        rating: 4.8,
        completedTasks: 45,
        verified: true,
        active: true
      },
      {
        id: 'vol_2',
        name: 'Mike Chen',
        email: 'mike@example.com',
        phone: '+1234567891',
        location: { lat: location.lat - 0.02, lng: location.lng + 0.015 },
        availability: {
          days: ['tuesday', 'thursday', 'saturday'],
          timeSlots: ['afternoon', 'evening']
        },
        skills: ['heavy-lifting', 'organization'],
        vehicleType: 'van',
        rating: 4.9,
        completedTasks: 67,
        verified: true,
        active: true
      }
    ];

    // Filter by distance and requirements
    return mockVolunteers.filter(volunteer => {
      const distance = this.calculateDistance(
        location.lat, location.lng,
        volunteer.location.lat, volunteer.location.lng
      );
      
      const meetsRequirements = requirements.length === 0 || 
        requirements.some(req => volunteer.skills.includes(req));
      
      return distance <= radiusKm && meetsRequirements && volunteer.active;
    });
  }

  async optimizeRoute(
    volunteerId: string,
    pickupPoints: Array<{ lat: number; lng: number; address: string }>,
    deliveryPoints: Array<{ lat: number; lng: number; address: string }>
  ): Promise<RouteOptimization> {
    // Simulate route optimization algorithm
    const allWaypoints = [
      ...pickupPoints.map(p => ({ ...p, type: 'pickup' as const })),
      ...deliveryPoints.map(d => ({ ...d, type: 'delivery' as const }))
    ];

    // Simple optimization: sort by proximity (in real implementation, use Google Maps API)
    const optimizedWaypoints = allWaypoints.map((waypoint, index) => ({
      location: waypoint,
      address: waypoint.address,
      type: waypoint.type,
      estimatedTime: new Date(Date.now() + (index + 1) * 30 * 60 * 1000).toISOString()
    }));

    const totalDistance = this.calculateTotalDistance(allWaypoints);
    const totalDuration = allWaypoints.length * 30; // 30 minutes per stop

    return {
      volunteerId,
      route: {
        waypoints: optimizedWaypoints,
        totalDistance,
        totalDuration,
        optimizedOrder: allWaypoints.map((_, index) => index)
      },
      estimatedCost: totalDistance * 0.5, // $0.50 per km
      fuelEfficiency: totalDistance / 10 // 10km per liter assumption
    };
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

  private calculateTotalDistance(waypoints: Array<{ lat: number; lng: number }>): number {
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += this.calculateDistance(
        waypoints[i].lat, waypoints[i].lng,
        waypoints[i + 1].lat, waypoints[i + 1].lng
      );
    }
    return total;
  }

  async assignVolunteer(requestId: string, volunteerId: string): Promise<boolean> {
    // In real implementation, update database
    console.log(`Assigned volunteer ${volunteerId} to request ${requestId}`);
    return true;
  }

  async trackVolunteerLocation(volunteerId: string): Promise<{ lat: number; lng: number; timestamp: string }> {
    // Simulate real-time location tracking
    return {
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1,
      timestamp: new Date().toISOString()
    };
  }

  async sendNotification(volunteerId: string, message: string, type: 'info' | 'urgent' | 'emergency'): Promise<void> {
    // In real implementation, send push notification or SMS
    console.log(`Notification to ${volunteerId} (${type}): ${message}`);
  }
}

export const volunteerService = new VolunteerService();