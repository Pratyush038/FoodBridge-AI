export interface DonorReward {
  id: string;
  donorId: string;
  type: 'badge' | 'coupon' | 'points';
  title: string;
  description: string;
  value: number;
  expiryDate?: string;
  businessPartner?: string;
  claimed: boolean;
  earnedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: 'donations' | 'consistency' | 'impact' | 'special';
    threshold: number;
    timeframe?: string;
  };
}

export interface BusinessPartner {
  id: string;
  name: string;
  logo: string;
  description: string;
  discountPercentage: number;
  category: string;
  location: string;
  active: boolean;
}

class GamificationService {
  private badges: Badge[] = [
    {
      id: 'first-donation',
      name: 'First Steps',
      description: 'Made your first food donation',
      icon: '🌱',
      tier: 'bronze',
      requirement: { type: 'donations', threshold: 1 }
    },
    {
      id: 'consistent-donor',
      name: 'Consistent Helper',
      description: 'Donated food 5 times in a month',
      icon: '⭐',
      tier: 'silver',
      requirement: { type: 'consistency', threshold: 5, timeframe: 'month' }
    },
    {
      id: 'community-champion',
      name: 'Community Champion',
      description: 'Helped feed 100+ people',
      icon: '🏆',
      tier: 'gold',
      requirement: { type: 'impact', threshold: 100 }
    },
    {
      id: 'waste-warrior',
      name: 'Waste Warrior',
      description: 'Prevented 50kg of food waste',
      icon: '♻️',
      tier: 'gold',
      requirement: { type: 'impact', threshold: 50 }
    },
    {
      id: 'platinum-donor',
      name: 'Platinum Guardian',
      description: 'Made 50+ successful donations',
      icon: '💎',
      tier: 'platinum',
      requirement: { type: 'donations', threshold: 50 }
    }
  ];

  private businessPartners: BusinessPartner[] = [
    {
      id: 'green-grocers',
      name: 'Green Grocers',
      logo: '🥬',
      description: '15% off organic produce',
      discountPercentage: 15,
      category: 'grocery',
      location: 'Downtown',
      active: true
    },
    {
      id: 'eco-cafe',
      name: 'Eco Café',
      logo: '☕',
      description: '20% off sustainable coffee',
      discountPercentage: 20,
      category: 'restaurant',
      location: 'Midtown',
      active: true
    },
    {
      id: 'farm-fresh',
      name: 'Farm Fresh Market',
      logo: '🚜',
      description: '10% off local produce',
      discountPercentage: 10,
      category: 'market',
      location: 'Suburbs',
      active: true
    }
  ];

  async checkEarnedBadges(donorId: string, donorStats: any): Promise<Badge[]> {
    const earnedBadges: Badge[] = [];

    for (const badge of this.badges) {
      const hasEarned = await this.checkBadgeRequirement(badge, donorStats);
      if (hasEarned) {
        earnedBadges.push(badge);
      }
    }

    return earnedBadges;
  }

  private async checkBadgeRequirement(badge: Badge, stats: any): Promise<boolean> {
    switch (badge.requirement.type) {
      case 'donations':
        return stats.totalDonations >= badge.requirement.threshold;
      
      case 'consistency':
        return stats.monthlyDonations >= badge.requirement.threshold;
      
      case 'impact':
        if (badge.id === 'community-champion') {
          return stats.peopleFed >= badge.requirement.threshold;
        }
        if (badge.id === 'waste-warrior') {
          return stats.wasteReduced >= badge.requirement.threshold;
        }
        return false;
      
      default:
        return false;
    }
  }

  async generateReward(donorId: string, tier: string): Promise<DonorReward | null> {
    const availablePartners = this.businessPartners.filter(p => p.active);
    if (availablePartners.length === 0) return null;

    const partner = availablePartners[Math.floor(Math.random() * availablePartners.length)];
    
    // Higher tier donors get better rewards
    const bonusMultiplier = {
      'bronze': 1.0,
      'silver': 1.2,
      'gold': 1.5,
      'platinum': 2.0
    }[tier] || 1.0;

    const finalDiscount = Math.min(
      Math.floor(partner.discountPercentage * bonusMultiplier),
      50 // Cap at 50%
    );

    return {
      id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      donorId,
      type: 'coupon',
      title: `${finalDiscount}% off at ${partner.name}`,
      description: partner.description,
      value: finalDiscount,
      businessPartner: partner.name,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      claimed: false,
      earnedAt: new Date().toISOString()
    };
  }

  calculatePoints(donationValue: number, tier: string): number {
    const basePoints = Math.floor(donationValue * 10);
    const tierMultiplier = {
      'bronze': 1.0,
      'silver': 1.25,
      'gold': 1.5,
      'platinum': 2.0
    }[tier] || 1.0;

    return Math.floor(basePoints * tierMultiplier);
  }

  getBadgesByTier(tier: string): Badge[] {
    return this.badges.filter(badge => badge.tier === tier);
  }

  getBusinessPartners(): BusinessPartner[] {
    return this.businessPartners.filter(p => p.active);
  }
}

export const gamificationService = new GamificationService();