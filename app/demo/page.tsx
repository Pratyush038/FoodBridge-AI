'use client';

/**
 * AI Technology Showcase
 * 
 * Professional demonstration page showcasing core AI capabilities:
 * 1. Food Trust Score Engine - Real-time safety scoring
 * 2. Hunger Hotspot Predictions - Predictive demand analysis
 * 3. LSTM Neural Network Forecasts - 7-day demand forecasting
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import HeaderBar from '@/components/header-bar';

// Import engines
import { 
  calculateFoodTrustScoreSync, 
  FoodTrustScore, 
  TrustLabel,
  FoodItemInput,
  DonorHistoryStats
} from '@/lib/food-trust-engine';
import {
  HotspotPrediction,
  RiskLevel,
} from '@/lib/hunger-hotspot-engine';

// Import ML integration service
import {
  fetchMLPredictions,
  getRiskLevelColor,
  getRiskLevelBgColor,
  formatDemand,
  formatForecastDate,
  MLPredictionsResponse,
} from '@/lib/ml-integration-service';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_FOOD_ITEMS: Array<{
  item: FoodItemInput;
  donorStats: DonorHistoryStats;
  description: string;
  displayQuantity: string;
}> = [
  {
    item: {
      id: 'demo-1',
      donor_id: 'donor-reliable',
      food_type: 'Cooked Rice & Dal',
      pickup_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      expiry_date: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    donorStats: {
      totalDonations: 45,
      completedDonations: 43,
      averageFeedbackRating: 4.8,
      reliabilityScore: 0.95,
      tier: 'gold',
    },
    description: 'High-trust donation from verified donor with refrigerated transport',
    displayQuantity: '50 servings',
  },
  {
    item: {
      id: 'demo-2',
      donor_id: 'donor-new',
      food_type: 'Fresh Fruits (Bananas, Apples)',
      pickup_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      expiry_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    donorStats: {
      totalDonations: 3,
      completedDonations: 2,
      averageFeedbackRating: 4.0,
      reliabilityScore: 0.66,
      tier: 'bronze',
    },
    description: 'Medium-trust donation from new donor with fresh produce',
    displayQuantity: '30 kg',
  },
  {
    item: {
      id: 'demo-3',
      donor_id: 'donor-risky',
      food_type: 'Seafood Curry',
      pickup_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      expiry_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    donorStats: {
      totalDonations: 8,
      completedDonations: 4,
      averageFeedbackRating: 2.5,
      reliabilityScore: 0.50,
      tier: 'bronze',
    },
    description: 'High-risk: Seafood (perishable) + expiring soon + low reliability',
    displayQuantity: '20 servings',
  },
  {
    item: {
      id: 'demo-4',
      donor_id: 'donor-moderate',
      food_type: 'Packaged Biscuits & Snacks',
      pickup_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    donorStats: {
      totalDonations: 20,
      completedDonations: 18,
      averageFeedbackRating: 4.2,
      reliabilityScore: 0.90,
      tier: 'silver',
    },
    description: 'Safe packaged food with extended shelf life',
    displayQuantity: '100 packets',
  },
];

const MOCK_HOTSPOTS: Array<HotspotPrediction & { 
  displayFactors: string[]; 
  displayShortfall: number;
  displayAction: string;
  displayTrend: 'increasing' | 'stable' | 'decreasing';
  displayTimeframeDays: number;
}> = [
  {
    regionId: 'blr-koramangala',
    regionName: 'Koramangala',
    center: { lat: 12.9352, lng: 77.6245 },
    radiusKm: 2,
    predictedDemandScore: 85,
    riskLevel: 'HIGH',
    confidenceScore: 0.87,
    factors: {
      recentDemandTrend: 0.8,
      weekOverWeekGrowth: 0.3,
      unfulfilledRatio: 0.6,
      averageUrgency: 0.7,
      capacityGap: 0.5,
    },
    predictedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    displayFactors: ['High demand from nearby communities', 'Limited donor activity', 'Seasonal surge'],
    displayShortfall: 450,
    displayAction: 'Mobilize donors in HSR Layout and Indiranagar to cover shortage',
    displayTrend: 'increasing',
    displayTimeframeDays: 7,
  },
  {
    regionId: 'blr-whitefield',
    regionName: 'Whitefield',
    center: { lat: 12.9698, lng: 77.7500 },
    radiusKm: 3,
    predictedDemandScore: 55,
    riskLevel: 'MEDIUM',
    confidenceScore: 0.72,
    factors: {
      recentDemandTrend: 0.5,
      weekOverWeekGrowth: 0.1,
      unfulfilledRatio: 0.4,
      averageUrgency: 0.5,
      capacityGap: 0.3,
    },
    predictedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    displayFactors: ['Growing migrant population', 'Moderate donor coverage'],
    displayShortfall: 200,
    displayAction: 'Monitor situation; consider outreach to IT companies',
    displayTrend: 'stable',
    displayTimeframeDays: 5,
  },
  {
    regionId: 'blr-electronic-city',
    regionName: 'Electronic City',
    center: { lat: 12.8456, lng: 77.6603 },
    radiusKm: 2.5,
    predictedDemandScore: 25,
    riskLevel: 'LOW',
    confidenceScore: 0.91,
    factors: {
      recentDemandTrend: 0.2,
      weekOverWeekGrowth: -0.1,
      unfulfilledRatio: 0.1,
      averageUrgency: 0.3,
      capacityGap: 0.1,
    },
    predictedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    displayFactors: ['Strong corporate donor base', 'Active NGO presence'],
    displayShortfall: 50,
    displayAction: 'Maintain current donor relationships',
    displayTrend: 'decreasing',
    displayTimeframeDays: 7,
  },
  {
    regionId: 'blr-jayanagar',
    regionName: 'Jayanagar',
    center: { lat: 12.9299, lng: 77.5826 },
    radiusKm: 1.8,
    predictedDemandScore: 78,
    riskLevel: 'HIGH',
    confidenceScore: 0.83,
    factors: {
      recentDemandTrend: 0.75,
      weekOverWeekGrowth: 0.25,
      unfulfilledRatio: 0.55,
      averageUrgency: 0.65,
      capacityGap: 0.45,
    },
    predictedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    displayFactors: ['School vacation impact', 'Resource diversion due to events'],
    displayShortfall: 380,
    displayAction: 'Partner with local community kitchens and temples',
    displayTrend: 'increasing',
    displayTimeframeDays: 4,
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function TrustScoreBadge({ score, label }: { score: number; label: TrustLabel }) {
  const config = {
    SAFE: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CAUTION: { color: 'bg-amber-50 text-amber-700 border-amber-200' },
    HIGH_RISK: { color: 'bg-red-50 text-red-700 border-red-200' },
  };
  
  const { color } = config[label];
  
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${color}`}>
      <span className="text-xl font-bold">{score}</span>
      <span className="text-sm opacity-70">/ 100</span>
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = {
    HIGH: { color: 'bg-red-100 text-red-700 border-red-200' },
    MEDIUM: { color: 'bg-amber-100 text-amber-700 border-amber-200' },
    LOW: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  };
  
  const { color } = config[level];
  
  return (
    <Badge className={`${color} border font-medium`}>
      {level} RISK
    </Badge>
  );
}

function ScoreBreakdown({ 
  label, 
  score, 
  maxScore, 
  color
}: { 
  label: string; 
  score: number; 
  maxScore: number; 
  color?: string;
}) {
  const percentage = (score / maxScore) * 100;
  const barColor = color || (percentage >= 70 ? 'bg-emerald-500' : percentage >= 40 ? 'bg-amber-500' : 'bg-red-500');
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 font-medium">
          {label}
        </span>
        <span className="font-semibold text-gray-900">{score.toFixed(1)}/{maxScore}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColor} transition-all duration-500 rounded-full`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}

function FeatureHighlight({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50/50">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DemoShowcasePage() {
  const [activeTab, setActiveTab] = useState('trust-score');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [trustScores, setTrustScores] = useState<Map<string, FoodTrustScore>>(new Map());
  const [mlPredictions, setMlPredictions] = useState<MLPredictionsResponse | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  useEffect(() => {
    const scores = new Map<string, FoodTrustScore>();
    MOCK_FOOD_ITEMS.forEach(({ item, donorStats }) => {
      const score = calculateFoodTrustScoreSync(item, donorStats);
      scores.set(item.id, score);
    });
    setTrustScores(scores);
  }, []);

  useEffect(() => {
    const loadPredictions = async () => {
      setMlLoading(true);
      try {
        const predictions = await fetchMLPredictions();
        setMlPredictions(predictions);
      } catch (error) {
        console.error('Failed to load ML predictions:', error);
      } finally {
        setMlLoading(false);
      }
    };
    loadPredictions();
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <HeaderBar />
      
      <main className="container mx-auto px-4 py-8 pt-28">
        {/* Header Section */}
        <div className="mb-10">
          <Link 
            href="/" 
            className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Innovative Component for FoodBridge AI
              </h1>
              <p className="text-gray-500 max-w-2xl">
                Explore the intelligent systems powering FoodBridge — from real-time safety scoring to 
                predictive demand forecasting using deep learning models.
              </p>
            </div>
            
            <div className="text-sm text-gray-400 bg-gray-100 px-4 py-2 rounded-full">
              Live Demo Environment
            </div>
          </div>
        </div>

        {/* Feature Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-gray-100/80 p-1 rounded-xl">
            <TabsTrigger 
              value="trust-score" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3"
            >
              <span className="hidden sm:inline">Trust Scoring</span>
              <span className="sm:hidden">Trust</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hotspots" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3"
            >
              <span className="hidden sm:inline">Demand Hotspots</span>
              <span className="sm:hidden">Hotspots</span>
            </TabsTrigger>
            <TabsTrigger 
              value="lstm-predictions" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3"
            >
              <span className="hidden sm:inline">LSTM Forecasts</span>
              <span className="sm:hidden">Forecasts</span>
            </TabsTrigger>
          </TabsList>

          {/* ============================================= */}
          {/* TAB 1: FOOD TRUST SCORES */}
          {/* ============================================= */}
          <TabsContent value="trust-score" className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Food Safety Trust Engine</CardTitle>
                    <CardDescription className="mt-1">
                      Real-time safety scoring for food donations (0-100)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {MOCK_FOOD_ITEMS.map(({ item, donorStats, description, displayQuantity }) => {
                      const score = trustScores.get(item.id);
                      const isExpanded = expandedItems.has(item.id);
                      
                      if (!score) return null;
                      
                      const borderColor = score.label === 'SAFE' ? 'border-l-emerald-500' :
                        score.label === 'CAUTION' ? 'border-l-amber-500' : 'border-l-red-500';
                      
                      return (
                        <Card 
                          key={item.id} 
                          className={`border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}
                        >
                          <CardContent className="p-5">
                            {/* Header Row */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-lg">{item.food_type}</h4>
                                <p className="text-sm text-gray-500 mt-0.5">{displayQuantity}</p>
                              </div>
                              <TrustScoreBadge score={score.score} label={score.label} />
                            </div>
                            
                            {/* Description */}
                            <p className="text-sm text-gray-600 mb-4 bg-gray-50 px-3 py-2 rounded-lg">
                              {description}
                            </p>
                            
                            {/* Quick Stats */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <Badge variant="outline" className="bg-white">
                                Pickup: {new Date(item.pickup_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Badge>
                              <Badge variant="outline" className="bg-white">
                                Expires: {new Date(item.expiry_date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Badge>
                              <Badge variant="outline" className="bg-white">
                                {donorStats.totalDonations} donations ({donorStats.averageFeedbackRating.toFixed(1)} rating)
                              </Badge>
                            </div>
                            
                            {/* Expand/Collapse Button */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggleExpanded(item.id)}
                              className="w-full hover:bg-gray-50 text-gray-600"
                            >
                              {isExpanded ? (
                                <>Hide Score Breakdown <ChevronUp className="h-4 w-4 ml-1" /></>
                              ) : (
                                <>View Score Breakdown <ChevronDown className="h-4 w-4 ml-1" /></>
                              )}
                            </Button>
                            
                            {/* Expanded Breakdown */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                                <ScoreBreakdown 
                                  label="Donor Reliability" 
                                  score={score.breakdown.donorReliability} 
                                  maxScore={25}
                                  color="bg-blue-500"
                                />
                                <ScoreBreakdown 
                                  label="Food Type Risk" 
                                  score={score.breakdown.foodTypeRisk} 
                                  maxScore={20}
                                  color="bg-emerald-500"
                                />
                                <ScoreBreakdown 
                                  label="Freshness Score" 
                                  score={score.breakdown.freshnessScore} 
                                  maxScore={20}
                                  color="bg-purple-500"
                                />
                                <ScoreBreakdown 
                                  label="Expiry Buffer" 
                                  score={score.breakdown.expiryScore} 
                                  maxScore={25}
                                  color="bg-amber-500"
                                />
                                <ScoreBreakdown 
                                  label="Transport Mode" 
                                  score={score.breakdown.transportRisk} 
                                  maxScore={10}
                                  color="bg-gray-500"
                                />
                                
                                <Separator className="my-4" />
                                
                                <div className="space-y-2">
                                  <h5 className="text-sm font-medium text-gray-700">Analysis Notes:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1.5 bg-gray-50 p-3 rounded-lg">
                                    {score.explanations.map((exp, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-gray-400 mt-0.5">•</span>
                                        <span>{exp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      Scoring Components
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FeatureHighlight 
                      title="Donor Reliability (25 pts)"
                      description="Based on donation history and feedback ratings"
                    />
                    <FeatureHighlight 
                      title="Food Type Risk (20 pts)"
                      description="Perishability and handling requirements"
                    />
                    <FeatureHighlight 
                      title="Freshness Score (20 pts)"
                      description="Time since preparation or harvest"
                    />
                    <FeatureHighlight 
                      title="Expiry Buffer (25 pts)"
                      description="Time remaining until expiration"
                    />
                    <FeatureHighlight 
                      title="Transport Mode (10 pts)"
                      description="Storage and delivery conditions"
                    />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Trust Labels</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <div>
                        <p className="font-medium text-emerald-700">SAFE (70-100)</p>
                        <p className="text-xs text-emerald-600">Recommended for distribution</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50">
                      <div>
                        <p className="font-medium text-amber-700">CAUTION (40-69)</p>
                        <p className="text-xs text-amber-600">Requires additional verification</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-red-50">
                      <div>
                        <p className="font-medium text-red-700">HIGH RISK (0-39)</p>
                        <p className="text-xs text-red-600">Not recommended without inspection</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ============================================= */}
          {/* TAB 2: HUNGER HOTSPOTS */}
          {/* ============================================= */}
          <TabsContent value="hotspots" className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Stats Row */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-red-500 to-rose-600 p-4 text-white">
                    <p className="text-3xl font-bold">
                      {MOCK_HOTSPOTS.filter(h => h.riskLevel === 'HIGH').length}
                    </p>
                    <p className="text-sm opacity-80">High Risk Zones</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white">
                    <p className="text-3xl font-bold">
                      {MOCK_HOTSPOTS.filter(h => h.riskLevel === 'MEDIUM').length}
                    </p>
                    <p className="text-sm opacity-80">Medium Risk Zones</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white">
                    <p className="text-3xl font-bold">
                      {MOCK_HOTSPOTS.filter(h => h.riskLevel === 'LOW').length}
                    </p>
                    <p className="text-sm opacity-80">Low Risk Zones</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white">
                    <p className="text-3xl font-bold">
                      {MOCK_HOTSPOTS.reduce((sum, h) => sum + h.displayShortfall, 0).toLocaleString()}
                    </p>
                    <p className="text-sm opacity-80">Total Meal Shortfall</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Predictive Demand Hotspots</CardTitle>
                <CardDescription className="mt-1">
                  AI-powered analysis identifying areas with projected food shortage over the next 3-7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_HOTSPOTS.sort((a, b) => {
                    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                    return order[a.riskLevel] - order[b.riskLevel];
                  }).map((hotspot) => {
                    const borderColor = hotspot.riskLevel === 'HIGH' ? 'border-l-red-500' :
                      hotspot.riskLevel === 'MEDIUM' ? 'border-l-amber-500' : 'border-l-emerald-500';
                    
                    return (
                      <Card 
                        key={hotspot.regionId} 
                        className={`border-l-4 ${borderColor} shadow-sm`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {hotspot.regionName}
                              </h4>
                              <p className="text-sm text-gray-500 mt-0.5">
                                Coverage Radius: {hotspot.radiusKm.toFixed(1)} km
                              </p>
                            </div>
                            <RiskBadge level={hotspot.riskLevel} />
                          </div>
                          
                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 font-medium">Predicted Shortfall</div>
                              <div className="font-bold text-lg text-gray-900">{hotspot.displayShortfall} meals</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 font-medium">Confidence Score</div>
                              <div className="font-bold text-lg text-gray-900">{(hotspot.confidenceScore * 100).toFixed(0)}%</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 font-medium">Demand Trend</div>
                              <div className="font-bold text-lg text-gray-900">
                                <span className="capitalize">{hotspot.displayTrend}</span>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-500 font-medium">Forecast Window</div>
                              <div className="font-bold text-lg text-gray-900">Next {hotspot.displayTimeframeDays} days</div>
                            </div>
                          </div>
                          
                          {/* Contributing Factors */}
                          <div className="mb-4">
                            <div className="text-xs text-gray-500 font-medium mb-2">Contributing Factors:</div>
                            <div className="flex flex-wrap gap-2">
                              {hotspot.displayFactors.map((factor, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {/* Recommended Action */}
                          <div className={`p-4 rounded-lg border ${
                            hotspot.riskLevel === 'HIGH' ? 'bg-red-50 border-red-200' :
                            hotspot.riskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-200' :
                            'bg-emerald-50 border-emerald-200'
                          }`}>
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-0.5">Recommended Action:</div>
                              <div className="text-sm text-gray-600">{hotspot.displayAction}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================= */}
          {/* TAB 3: LSTM PREDICTIONS */}
          {/* ============================================= */}
          <TabsContent value="lstm-predictions" className="space-y-6 animate-in fade-in-50 duration-300">
            {/* Educational Information Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-slate-900">Understanding the LSTM Forecasting Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none text-slate-700">
                  <p className="leading-relaxed">
                    <strong>Long Short-Term Memory (LSTM)</strong> is a type of recurrent neural network specifically designed 
                    to learn patterns in sequential data over time. Unlike traditional models that treat each data point 
                    independently, LSTMs maintain a &quot;memory&quot; of past observations, making them ideal for time-series 
                    forecasting like food demand prediction.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <h5 className="font-semibold text-slate-900 mb-2">How It Works</h5>
                    <p className="text-sm text-slate-600">
                      The model analyzes 21 days of historical data including demand patterns, day-of-week effects, 
                      and seasonal trends to predict the next 7 days of food demand for each NGO.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <h5 className="font-semibold text-slate-900 mb-2">Why LSTM</h5>
                    <p className="text-sm text-slate-600">
                      LSTMs excel at capturing both short-term fluctuations (daily variations) and long-term 
                      dependencies (weekly/monthly patterns), providing more accurate forecasts than simpler models.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <h5 className="font-semibold text-slate-900 mb-2">Practical Impact</h5>
                    <p className="text-sm text-slate-600">
                      Accurate demand forecasting enables proactive food redistribution, reduces waste from 
                      over-allocation, and ensures NGOs receive adequate supplies before shortages occur.
                    </p>
                  </div>
                </div>

                {/* Model Architecture Diagram */}
                <div className="bg-white rounded-lg p-5 border border-slate-200 mt-4">
                  <h5 className="font-semibold text-slate-900 mb-4">Model Architecture</h5>
                  <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
                    <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg font-medium">
                      Input: 21 days x 23 features
                    </div>
                    <span className="text-slate-400 hidden sm:inline">-&gt;</span>
                    <div className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded-lg font-medium">
                      LSTM (64 units)
                    </div>
                    <span className="text-slate-400 hidden sm:inline">-&gt;</span>
                    <div className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded-lg font-medium">
                      LSTM (32 units)
                    </div>
                    <span className="text-slate-400 hidden sm:inline">-&gt;</span>
                    <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg font-medium">
                      Dense (16 units)
                    </div>
                    <span className="text-slate-400 hidden sm:inline">-&gt;</span>
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg font-medium">
                      Output: 7-day forecast
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 font-medium">Training Epochs</div>
                      <div className="font-bold text-slate-900">100 (Early Stop)</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 font-medium">Dropout Rate</div>
                      <div className="font-bold text-slate-900">0.2</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 font-medium">Optimizer</div>
                      <div className="font-bold text-slate-900">Adam</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 font-medium">Loss Function</div>
                      <div className="font-bold text-slate-900">MSE</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Predictions Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-xl">7-Day Demand Forecasts</CardTitle>
                    <CardDescription className="mt-1">
                      Predicted food demand per NGO with 95% confidence intervals
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Demo Data
                    </Badge>
                    {mlPredictions?.status === 'success' && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Model v{mlPredictions.modelVersion}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>

                {mlLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto"></div>
                      </div>
                      <p className="mt-4 text-gray-600 font-medium">Loading predictions...</p>
                      <p className="text-sm text-gray-400">Fetching data from ML server</p>
                    </div>
                  </div>
                ) : mlPredictions?.status === 'error' ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    </div>
                    <p className="text-gray-900 font-medium">Failed to load predictions</p>
                    <p className="text-sm text-gray-500 mt-1">{mlPredictions.message}</p>
                  </div>
                ) : mlPredictions?.predictions ? (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardContent className="p-4">
                          <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">Total NGOs</div>
                          <div className="text-2xl font-bold text-purple-900 mt-1">{mlPredictions.predictions.length}</div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
                        <CardContent className="p-4">
                          <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Critical Risk</div>
                          <div className="text-2xl font-bold text-red-900 mt-1">
                            {mlPredictions.predictions.filter(p => p.summary.overallRiskLevel === 'CRITICAL' || p.summary.overallRiskLevel === 'HIGH').length}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                        <CardContent className="p-4">
                          <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Avg Daily Demand</div>
                          <div className="text-2xl font-bold text-blue-900 mt-1">
                            {formatDemand(mlPredictions.predictions.reduce((sum, p) => sum + p.summary.averageDailyDemand, 0) / Math.max(mlPredictions.predictions.length, 1))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
                        <CardContent className="p-4">
                          <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Confidence Level</div>
                          <div className="text-2xl font-bold text-emerald-900 mt-1">95%</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Per-NGO Predictions */}
                    <div className="space-y-4">
                      {mlPredictions.predictions.map((prediction) => (
                        <Card 
                          key={prediction.ngoId} 
                          className="overflow-hidden shadow-sm border-l-4"
                          style={{ borderLeftColor: getRiskLevelColor(prediction.summary.overallRiskLevel) }}
                        >
                          <CardContent className="p-5">
                            {/* NGO Header */}
                            <div className="flex items-start justify-between mb-5">
                              <div>
                                <h4 className="font-semibold text-gray-900 text-lg">{prediction.ngoName}</h4>
                                <p className="text-sm text-gray-500">{prediction.ngoId}</p>
                              </div>
                              <Badge 
                                className="font-medium"
                                style={{ 
                                  backgroundColor: getRiskLevelBgColor(prediction.summary.overallRiskLevel),
                                  color: getRiskLevelColor(prediction.summary.overallRiskLevel)
                                }}
                              >
                                {prediction.summary.overallRiskLevel} RISK ({prediction.summary.overallRiskScore.toFixed(0)})
                              </Badge>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-5">
                              <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 font-medium">Average Daily</div>
                                <div className="font-bold text-lg text-gray-900">{prediction.summary.averageDailyDemand.toFixed(1)}</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 font-medium">Peak Daily</div>
                                <div className="font-bold text-lg text-gray-900">{prediction.summary.maxDailyDemand.toFixed(1)}</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 font-medium">7-Day Total</div>
                                <div className="font-bold text-lg text-gray-900">{prediction.summary.total7DayDemand.toFixed(0)}</div>
                              </div>
                            </div>

                            {/* 7-Day Forecast Visualization - Line Chart with Confidence Area */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-gray-500 font-medium">7-Day Demand Forecast</span>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getRiskLevelColor(prediction.summary.overallRiskLevel) }}></span>
                                    Predicted
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="w-3 h-1 bg-gray-300 rounded"></span>
                                    95% CI
                                  </span>
                                </div>
                              </div>
                              
                              {/* SVG Line Chart */}
                              <div className="bg-gray-50 rounded-lg p-4">
                                <svg viewBox="0 0 400 140" className="w-full h-40" preserveAspectRatio="xMidYMid meet">
                                  {/* Grid lines */}
                                  <defs>
                                    <linearGradient id={`confidence-${prediction.ngoId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stopColor={getRiskLevelColor(prediction.summary.overallRiskLevel)} stopOpacity="0.2" />
                                      <stop offset="100%" stopColor={getRiskLevelColor(prediction.summary.overallRiskLevel)} stopOpacity="0.05" />
                                    </linearGradient>
                                  </defs>
                                  
                                  {/* Horizontal grid lines */}
                                  {[0, 25, 50, 75, 100].map((y) => (
                                    <line key={y} x1="40" y1={10 + (100 - y)} x2="380" y2={10 + (100 - y)} stroke="#e5e7eb" strokeWidth="1" />
                                  ))}
                                  
                                  {/* Y-axis labels */}
                                  {(() => {
                                    const maxDemand = Math.max(...prediction.dailyForecasts.map(f => f.upperBound95));
                                    const minDemand = Math.min(...prediction.dailyForecasts.map(f => f.lowerBound95));
                                    return [0, 50, 100].map((percent) => (
                                      <text key={percent} x="35" y={115 - percent} textAnchor="end" fontSize="10" fill="#9ca3af">
                                        {Math.round(minDemand + (maxDemand - minDemand) * (percent / 100))}
                                      </text>
                                    ));
                                  })()}
                                  
                                  {/* Confidence interval area */}
                                  {(() => {
                                    const maxDemand = Math.max(...prediction.dailyForecasts.map(f => f.upperBound95));
                                    const minDemand = Math.min(...prediction.dailyForecasts.map(f => f.lowerBound95));
                                    const range = maxDemand - minDemand;
                                    const points = prediction.dailyForecasts.map((f, i) => ({
                                      x: 55 + i * 50,
                                      upper: 110 - ((f.upperBound95 - minDemand) / range) * 100,
                                      lower: 110 - ((f.lowerBound95 - minDemand) / range) * 100,
                                      pred: 110 - ((f.predictedDemand - minDemand) / range) * 100
                                    }));
                                    
                                    const areaPath = `M ${points[0].x},${points[0].upper} ` +
                                      points.map(p => `L ${p.x},${p.upper}`).join(' ') +
                                      ` L ${points[points.length - 1].x},${points[points.length - 1].lower} ` +
                                      [...points].reverse().map(p => `L ${p.x},${p.lower}`).join(' ') +
                                      ' Z';
                                    
                                    const linePath = `M ${points[0].x},${points[0].pred} ` +
                                      points.slice(1).map(p => `L ${p.x},${p.pred}`).join(' ');
                                    
                                    return (
                                      <>
                                        <path d={areaPath} fill={`url(#confidence-${prediction.ngoId})`} />
                                        <path d={linePath} fill="none" stroke={getRiskLevelColor(prediction.summary.overallRiskLevel)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        {points.map((p, i) => (
                                          <circle key={i} cx={p.x} cy={p.pred} r="4" fill={getRiskLevelColor(prediction.summary.overallRiskLevel)} stroke="white" strokeWidth="2" />
                                        ))}
                                      </>
                                    );
                                  })()}
                                  
                                  {/* X-axis labels */}
                                  {prediction.dailyForecasts.map((forecast, idx) => (
                                    <text key={idx} x={55 + idx * 50} y="130" textAnchor="middle" fontSize="10" fill="#6b7280">
                                      {new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </text>
                                  ))}
                                </svg>
                              </div>
                              
                              {/* Daily values table */}
                              <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                                {prediction.dailyForecasts.map((forecast, idx) => (
                                  <div key={idx} className="text-xs">
                                    <div className="font-semibold text-gray-900">{forecast.predictedDemand.toFixed(0)}</div>
                                    <div className="text-gray-400">&plusmn;{((forecast.upperBound95 - forecast.lowerBound95) / 2).toFixed(0)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Technical Notes */}
                    <div className="mt-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Data Source Note
                      </h4>
                      <p className="text-sm text-gray-600">
                        This demonstration uses simulated prediction data generated with the same statistical properties 
                        as the trained LSTM model output. In a production environment, the FastAPI ML server 
                        (available at <code className="bg-gray-200 px-1 rounded text-xs">ml/api_server.py</code>) would serve 
                        real-time predictions from the trained PyTorch model stored at <code className="bg-gray-200 px-1 rounded text-xs">ml/outputs/lstm_demand_model.pt</code>.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                          PyTorch 2.x
                        </span>
                        <span className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                          FastAPI Backend
                        </span>
                        <span className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                          21-day Input Window
                        </span>
                        <span className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                          7-day Forecast Horizon
                        </span>
                        <span className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                          23 Input Features
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    </div>
                    <p className="text-gray-600 font-medium">No predictions available</p>
                    <p className="text-sm text-gray-400 mt-1">ML server may be offline</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
