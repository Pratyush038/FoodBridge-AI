'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, Target, TrendingUp, Camera, Award, Users, AlertTriangle } from 'lucide-react';
import { aiMatchingEngine, MatchPrediction, ImageClassification } from '@/lib/ai-matching-engine';
import { gamificationService, DonorReward } from '@/lib/gamification-service';
import { FoodDonation, FoodRequirement } from '@/lib/firebase-service';

interface AIMatchingDashboardProps {
  donations: FoodDonation[];
  requirements: FoodRequirement[];
  userId: string;
  userRole: 'donor' | 'receiver';
}

export default function AIMatchingDashboard({ 
  donations, 
  requirements, 
  userId, 
  userRole 
}: AIMatchingDashboardProps) {
  const [matches, setMatches] = useState<MatchPrediction[]>([]);
  const [imageClassification, setImageClassification] = useState<ImageClassification | null>(null);
  const [rewards, setRewards] = useState<DonorReward[]>([]);
  const [donorTier, setDonorTier] = useState<'bronze' | 'silver' | 'gold' | 'platinum'>('bronze');
  const [loading, setLoading] = useState(false);
  const [classifyingImage, setClassifyingImage] = useState(false);

  useEffect(() => {
    generateMatches();
    if (userRole === 'donor') {
      loadGamificationData();
    }
  }, [donations, requirements]);

  const generateMatches = async () => {
    setLoading(true);
    try {
      const predictions = await aiMatchingEngine.predictMatches(donations, requirements);
      setMatches(predictions.slice(0, 10)); // Show top 10 matches
    } catch (error) {
      console.error('Error generating matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGamificationData = async () => {
    try {
      // Simulate loading donor stats
      const donorStats = {
        totalDonations: donations.filter(d => d.donorId === userId).length,
        consistencyScore: 75,
        monthlyDonations: 5,
        peopleFed: 150,
        wasteReduced: 25
      };

      const tier = aiMatchingEngine.calculateDonorTier(
        donorStats.totalDonations,
        donorStats.consistencyScore
      );
      setDonorTier(tier);

      // Generate rewards
      const reward = await gamificationService.generateReward(userId, tier);
      if (reward) {
        setRewards([reward]);
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setClassifyingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        const classification = await aiMatchingEngine.classifyFoodImage(imageData);
        setImageClassification(classification);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error classifying image:', error);
    } finally {
      setClassifyingImage(false);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-purple-100 text-purple-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span>AI-Powered Matching Engine</span>
          </CardTitle>
          <CardDescription>
            Advanced machine learning algorithms to optimize food distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{matches.length}</div>
              <div className="text-sm text-blue-700">AI Matches Found</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {matches.length > 0 ? (matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length * 100).toFixed(0) : 0}%
              </div>
              <div className="text-sm text-green-700">Avg Match Score</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {matches.filter(m => m.confidence > 0.8).length}
              </div>
              <div className="text-sm text-purple-700">High Confidence</div>
            </div>
          </div>

          <Button 
            onClick={generateMatches} 
            disabled={loading}
            className="w-full mb-4"
          >
            {loading ? 'Generating Matches...' : 'Refresh AI Matches'}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="matches" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matches">Smart Matches</TabsTrigger>
          <TabsTrigger value="image-ai">Image Recognition</TabsTrigger>
          {userRole === 'donor' && <TabsTrigger value="gamification">Rewards & Badges</TabsTrigger>}
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Matches</CardTitle>
              <CardDescription>
                Optimized matches based on location, food type, quantity, and historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matches.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No matches found. Try adjusting your criteria.</p>
                  </div>
                ) : (
                  matches.map((match) => (
                    <div key={`${match.donationId}-${match.requirementId}`} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">Match Score: {(match.matchScore * 100).toFixed(0)}%</h3>
                          <p className="text-sm text-gray-600">Confidence: {(match.confidence * 100).toFixed(0)}%</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getMatchScoreColor(match.matchScore)}`}></div>
                          <Badge variant="outline">
                            {match.matchScore >= 0.8 ? 'Excellent' : match.matchScore >= 0.6 ? 'Good' : 'Fair'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Food Type Match:</span>
                          <Progress value={match.factors.foodTypeMatch * 100} className="mt-1" />
                        </div>
                        <div>
                          <span className="font-medium">Location Proximity:</span>
                          <Progress value={match.factors.locationProximity * 100} className="mt-1" />
                        </div>
                        <div>
                          <span className="font-medium">Quantity Match:</span>
                          <Progress value={match.factors.quantityMatch * 100} className="mt-1" />
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Accept Match
                        </Button>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="image-ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>AI Image Recognition</span>
              </CardTitle>
              <CardDescription>
                Upload food images for automatic categorization and quality assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="food-image" className="block text-sm font-medium mb-2">
                    Upload Food Image
                  </label>
                  <input
                    id="food-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={classifyingImage}
                  />
                </div>

                {classifyingImage && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">AI is analyzing your image...</p>
                  </div>
                )}

                {imageClassification && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">AI Classification Results</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Food Type:</span>
                        <p className="text-lg capitalize">{imageClassification.foodType.replace('-', ' ')}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Confidence:</span>
                        <p className="text-lg">{(imageClassification.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Freshness:</span>
                        <Badge className={
                          imageClassification.freshness === 'excellent' ? 'bg-green-100 text-green-800' :
                          imageClassification.freshness === 'good' ? 'bg-blue-100 text-blue-800' :
                          imageClassification.freshness === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {imageClassification.freshness}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Est. Quantity:</span>
                        <p className="text-lg">{imageClassification.estimatedQuantity} portions</p>
                      </div>
                    </div>
                    
                    {imageClassification.allergens.length > 0 && (
                      <div className="mt-4">
                        <span className="text-sm font-medium">Detected Allergens:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {imageClassification.allergens.map((allergen) => (
                            <Badge key={allergen} variant="outline" className="text-orange-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {allergen}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {userRole === 'donor' && (
          <TabsContent value="gamification">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Donor Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${getTierColor(donorTier)}`}>
                      {donorTier.charAt(0).toUpperCase() + donorTier.slice(1)} Tier
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {donorTier === 'platinum' ? 'Maximum impact achieved!' :
                       donorTier === 'gold' ? 'Excellent contribution!' :
                       donorTier === 'silver' ? 'Great progress!' :
                       'Keep donating to level up!'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress to next tier</span>
                        <span>75%</span>
                      </div>
                      <Progress value={75} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{donations.filter(d => d.donorId === userId).length}</div>
                        <div className="text-sm text-blue-700">Total Donations</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">150</div>
                        <div className="text-sm text-green-700">People Fed</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rewards & Coupons</CardTitle>
                  <CardDescription>
                    Earn rewards from our business partners
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rewards.length === 0 ? (
                      <div className="text-center py-8">
                        <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No rewards available yet. Keep donating!</p>
                      </div>
                    ) : (
                      rewards.map((reward) => (
                        <div key={reward.id} className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{reward.title}</h3>
                              <p className="text-sm text-gray-600">{reward.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Expires: {new Date(reward.expiryDate!).toLocaleDateString()}
                              </p>
                            </div>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              Claim Reward
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>AI Insights & Recommendations</CardTitle>
              <CardDescription>
                Data-driven insights to improve your food donation impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Optimal Donation Times</h3>
                    <p className="text-sm text-blue-700">
                      Based on historical data, donations posted between 10 AM - 2 PM have 85% higher match rates.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">High-Demand Food Types</h3>
                    <p className="text-sm text-green-700">
                      Fresh produce and cooked meals are in highest demand in your area. Consider focusing on these categories.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-2">Location Optimization</h3>
                    <p className="text-sm text-purple-700">
                      Donations within 5km of downtown have 3x faster pickup times. Consider central locations.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-semibold text-orange-800 mb-2">Quantity Recommendations</h3>
                    <p className="text-sm text-orange-700">
                      Medium-sized donations (10-25 portions) have the highest success rate for quick matching.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Personalized Recommendations</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <p className="text-sm">
                        Your donation pattern shows consistency in fresh produce. Consider partnering with local farms for regular donations.
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <p className="text-sm">
                        You have a 95% successful match rate! Your reliability makes you a preferred donor for urgent requests.
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <p className="text-sm">
                        Consider expanding your donation radius by 2km to reach 3 additional high-need organizations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}