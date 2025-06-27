export interface DisasterAlert {
  id: string;
  type: 'flood' | 'fire' | 'earthquake' | 'hurricane' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    lat: number;
    lng: number;
    radius: number; // affected radius in km
    address: string;
  };
  title: string;
  description: string;
  issuedAt: string;
  expiresAt: string;
  active: boolean;
  priorityRouting: boolean;
  emergencyContacts: string[];
}

export interface EmergencyRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  urgencyLevel: 'immediate' | 'urgent' | 'high';
  peopleAffected: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  needs: {
    foodType: string;
    quantity: number;
    priority: number;
  }[];
  specialRequirements: string[];
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
  status: 'active' | 'partially-fulfilled' | 'fulfilled';
  createdAt: string;
  updatedAt: string;
}

class DisasterService {
  private activeAlerts: DisasterAlert[] = [];
  private emergencyRequests: EmergencyRequest[] = [];

  async issueDisasterAlert(alert: Omit<DisasterAlert, 'id' | 'issuedAt' | 'active'>): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const disasterAlert: DisasterAlert = {
      ...alert,
      id: alertId,
      issuedAt: new Date().toISOString(),
      active: true
    };

    this.activeAlerts.push(disasterAlert);
    
    // Trigger emergency notifications
    await this.sendSOSAlerts(disasterAlert);
    
    // Activate priority routing
    if (disasterAlert.priorityRouting) {
      await this.activatePriorityRouting(disasterAlert);
    }

    console.log(`Disaster alert issued: ${alertId}`);
    return alertId;
  }

  private async sendSOSAlerts(alert: DisasterAlert): Promise<void> {
    // In a real implementation, this would send push notifications, SMS, and emails
    const message = `🚨 EMERGENCY ALERT: ${alert.title}\n${alert.description}\nLocation: ${alert.location.address}\nSeverity: ${alert.severity.toUpperCase()}`;
    
    console.log('SOS Alert sent to all users:', message);
    
    // Simulate sending to different channels
    const channels = ['push_notification', 'sms', 'email', 'in_app'];
    for (const channel of channels) {
      console.log(`Alert sent via ${channel}`);
    }
  }

  private async activatePriorityRouting(alert: DisasterAlert): Promise<void> {
    console.log(`Priority routing activated for disaster area: ${alert.location.address}`);
    console.log(`Affected radius: ${alert.location.radius}km`);
    
    // In a real implementation, this would:
    // 1. Identify all active donations and requirements in the affected area
    // 2. Prioritize emergency requests
    // 3. Reroute volunteers and deliveries
    // 4. Coordinate with emergency services
  }

  async createEmergencyRequest(request: Omit<EmergencyRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const requestId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const emergencyRequest: EmergencyRequest = {
      ...request,
      id: requestId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.emergencyRequests.push(emergencyRequest);
    
    // Auto-match with nearby donations
    await this.autoMatchEmergencyRequest(emergencyRequest);
    
    console.log(`Emergency request created: ${requestId}`);
    return requestId;
  }

  private async autoMatchEmergencyRequest(request: EmergencyRequest): Promise<void> {
    // Simulate finding nearby donations
    console.log(`Auto-matching emergency request for ${request.organizationName}`);
    console.log(`People affected: ${request.peopleAffected}`);
    console.log(`Needs: ${request.needs.map(n => `${n.quantity} ${n.foodType}`).join(', ')}`);
    
    // In a real implementation, this would:
    // 1. Query nearby donations within expanded radius
    // 2. Prioritize based on urgency and proximity
    // 3. Auto-assign volunteers for immediate pickup
    // 4. Send notifications to donors and volunteers
  }

  async getActiveAlerts(): Promise<DisasterAlert[]> {
    const now = new Date();
    return this.activeAlerts.filter(alert => 
      alert.active && new Date(alert.expiresAt) > now
    );
  }

  async getEmergencyRequests(location?: { lat: number; lng: number; radius: number }): Promise<EmergencyRequest[]> {
    let requests = this.emergencyRequests.filter(req => req.status === 'active');
    
    if (location) {
      requests = requests.filter(req => {
        const distance = this.calculateDistance(
          location.lat, location.lng,
          req.location.lat, req.location.lng
        );
        return distance <= location.radius;
      });
    }
    
    // Sort by urgency
    return requests.sort((a, b) => {
      const urgencyOrder = { 'immediate': 3, 'urgent': 2, 'high': 1 };
      return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
    });
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

  async deactivateAlert(alertId: string): Promise<boolean> {
    const alertIndex = this.activeAlerts.findIndex(alert => alert.id === alertId);
    if (alertIndex !== -1) {
      this.activeAlerts[alertIndex].active = false;
      console.log(`Disaster alert deactivated: ${alertId}`);
      return true;
    }
    return false;
  }

  async getDisasterStatistics(): Promise<{
    activeAlerts: number;
    emergencyRequests: number;
    peopleAffected: number;
    responseTime: number;
  }> {
    const activeAlerts = this.getActiveAlerts();
    const activeRequests = this.emergencyRequests.filter(req => req.status === 'active');
    
    return {
      activeAlerts: (await activeAlerts).length,
      emergencyRequests: activeRequests.length,
      peopleAffected: activeRequests.reduce((sum, req) => sum + req.peopleAffected, 0),
      responseTime: 15 // Average response time in minutes
    };
  }

  // Simulate disaster scenarios for testing
  async simulateFloodAlert(): Promise<string> {
    return this.issueDisasterAlert({
      type: 'flood',
      severity: 'high',
      location: {
        lat: 40.7128,
        lng: -74.0060,
        radius: 10,
        address: 'Downtown Manhattan, NY'
      },
      title: 'Flash Flood Warning',
      description: 'Heavy rainfall has caused flooding in downtown area. Multiple shelters need immediate food assistance.',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      priorityRouting: true,
      emergencyContacts: ['+1-800-EMERGENCY', 'disaster@foodbridge.ai']
    });
  }

  async simulateFireAlert(): Promise<string> {
    return this.issueDisasterAlert({
      type: 'fire',
      severity: 'critical',
      location: {
        lat: 40.7589,
        lng: -73.9851,
        radius: 15,
        address: 'Central Park Area, NY'
      },
      title: 'Wildfire Emergency',
      description: 'Wildfire spreading rapidly. Evacuation centers need emergency food supplies for displaced families.',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      priorityRouting: true,
      emergencyContacts: ['+1-800-FIRE-HELP', 'fire-emergency@foodbridge.ai']
    });
  }
}

export const disasterService = new DisasterService();