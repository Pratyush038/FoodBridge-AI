'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Heart, MapPin, Users, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createRequirement } from '@/lib/firebase-service';
import { ensureUserInSupabase } from '@/lib/user-service';
import { Location } from '@/lib/maps';
import { toast } from 'sonner';
import GoogleMapsLoader from '@/components/google-maps-loader';
import AIMatchResults from '@/components/ai-match-results';
import { findMatchingDonors, MatchResult } from '@/lib/donor-receiver-matching';

interface RequirementsFormProps {
  onSuccess?: () => void;
}

export default function RequirementsForm({ onSuccess }: RequirementsFormProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    foodType: '',
    quantity: '',
    unit: '',
    urgency: '',
    description: '',
    location: null as Location | null,
    neededBy: null as Date | null,
    servingSize: '',
    organizationName: ''
  });
  const [loading, setLoading] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  
  // AI Matching state
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);

  // Load form data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('requirementsFormData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Restore neededBy as a Date object
      if (parsedData.neededBy) {
        parsedData.neededBy = new Date(parsedData.neededBy);
      }
      setFormData(parsedData);
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('requirementsFormData', JSON.stringify(formData));
  }, [formData]);

  // Handle manual address entry
  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    if (value.trim()) {
      // Create a location object with the address (using default coordinates)
      setFormData(prev => ({
        ...prev,
        location: {
          address: value.trim(),
          lat: 0,
          lng: 0
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, location: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      toast.error('Please sign in to post requirements');
      return;
    }

    setLoading(true);

    try {
      // Validate required fields with better error messages
      const errors = [];
      
      if (!formData.title) {
        errors.push('Requirement title is required');
      }
      if (!formData.foodType) {
        errors.push('Food type is required');
      }
      if (!formData.quantity) {
        errors.push('Quantity is required');
      }
      if (!formData.unit) {
        errors.push('Unit is required');
      }
      if (!formData.location) {
        errors.push('Location is required - please select an address from the dropdown');
      }
      if (!formData.organizationName) {
        errors.push('Organization name is required');
      }
      
      if (errors.length > 0) {
        toast.error(`Please fix the following: ${errors.join(', ')}`);
        setLoading(false);
        return;
      }

      // Ensure user exists in Supabase and get the NGO ID
      const user = session.user;
      const userInfo = {
        id: (user as any).id || user.email || 'temp-id',
        email: user.email || '',
        name: user.name || 'Anonymous Receiver',
        role: 'receiver' as const,
        organizationName: formData.organizationName,
      };
      
      const { ngoId } = await ensureUserInSupabase(userInfo);
      const finalNgoId = ngoId || userInfo.id;

      // Ensure neededBy has a default timestamp if not specified
      const neededByISO = formData.neededBy?.toISOString() || 
                         new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Create requirement object
      const requirement = {
        receiverId: finalNgoId,
        receiverName: session.user.name || 'Anonymous Receiver',
        organizationName: formData.organizationName,
        title: formData.title,
        foodType: formData.foodType,
        quantity: formData.quantity,
        unit: formData.unit,
        urgency: formData.urgency as 'high' | 'medium' | 'low',
        description: formData.description,
        location: formData.location!, // We've already validated this is not null
        neededBy: neededByISO,
        servingSize: formData.servingSize,
        status: 'active' as const
      };

      console.log('📋 Submitting requirement:', requirement);

      // Save to database (Supabase + Firebase)
      const requirementId = await createRequirement(requirement);
      
      console.log('✅ Requirement created with ID:', requirementId);
      
      // Run AI matching to find nearby donors
      setIsMatchingLoading(true);
      setShowMatches(true);
      
      // Default location for AI matching: RV College, Bangalore, Mysore Road
      const defaultMatchingLocation = {
        lat: 12.9236,
        lng: 77.4989
      };
      
      // Find matching donors based on requirement details
      const matches = findMatchingDonors({
        foodType: formData.foodType,
        quantity: parseFloat(formData.quantity) || 0,
        unit: formData.unit,
        latitude: formData.location?.lat || defaultMatchingLocation.lat,
        longitude: formData.location?.lng || defaultMatchingLocation.lng,
        neededBy: neededByISO,
        urgency: formData.urgency as 'high' | 'medium' | 'low',
      });
      
      setMatchResults(matches);
      setIsMatchingLoading(false);
      
      // Store requirement details for reference before clearing
      const requirementSummary = {
        foodType: formData.foodType,
        quantity: formData.quantity,
        unit: formData.unit,
        organizationName: formData.organizationName,
      };
      
      // Reset form
      setFormData({
        title: '',
        foodType: '',
        quantity: '',
        unit: '',
        urgency: '',
        description: '',
        location: null,
        neededBy: null,
        servingSize: '',
        organizationName: ''
      });
      
      // Clear address input
      setAddressInput('');

      // Clear saved form data
      localStorage.removeItem('requirementsFormData');

      // Show success message with more details
      toast.success(`Requirement Posted Successfully!`, {
        description: `${requirementSummary.quantity} ${requirementSummary.unit} of ${requirementSummary.foodType} needed by ${requirementSummary.organizationName}. Check the AI matches below!`,
        duration: 5000,
      });
      
      // Call onSuccess callback to refresh the receiver dashboard
      if (onSuccess) {
        onSuccess();
      }
      
      // Force a small delay to ensure the database update is processed
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Error creating requirement:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Failed to post requirement: ${errorMessage}`, {
        description: 'Please check your network connection and try again. If the problem persists, check the browser console for details.',
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleMapsLoader>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Post Food Requirements</span>
          </CardTitle>
          <CardDescription>
            Let donors know what food your organization needs
          </CardDescription>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Requirement Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Vegetables for Community Kitchen"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="foodType">Food Type Needed *</Label>
              <Select value={formData.foodType} onValueChange={(value) => setFormData({...formData, foodType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select food type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fresh-produce">Fresh Produce</SelectItem>
                  <SelectItem value="cooked-meals">Cooked Meals</SelectItem>
                  <SelectItem value="baked-goods">Baked Goods</SelectItem>
                  <SelectItem value="packaged-food">Packaged Food</SelectItem>
                  <SelectItem value="dairy">Dairy Products</SelectItem>
                  <SelectItem value="any">Any Food Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level *</Label>
              <Select value={formData.urgency} onValueChange={(value) => setFormData({...formData, urgency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High - Needed Today</SelectItem>
                  <SelectItem value="medium">Medium - Needed This Week</SelectItem>
                  <SelectItem value="low">Low - Ongoing Need</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Needed *</Label>
              <div className="flex space-x-2">
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Amount"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="flex-1"
                  required
                  disabled={loading}
                />
                <Select value={formData.unit} onValueChange={(value) => setFormData({...formData, unit: value})}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="portions">portions</SelectItem>
                    <SelectItem value="items">items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="servingSize">Expected Serving Size</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="servingSize"
                  placeholder="e.g., 50 people"
                  value={formData.servingSize}
                  onChange={(e) => setFormData({...formData, servingSize: e.target.value})}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details</Label>
            <Textarea
              id="description"
              placeholder="Describe your specific needs, dietary restrictions, or preparation requirements"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="location">Pickup/Delivery Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  placeholder="Enter your full address..."
                  className="pl-10"
                  value={addressInput}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500">Enter your complete pickup/delivery address</p>
              {formData.location && (
                <p className="text-sm text-green-600">✓ Address entered</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization Name *</Label>
              <Input
                id="organization"
                placeholder="Your organization/shelter name"
                value={formData.organizationName}
                onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Needed By Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.neededBy && "text-muted-foreground"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.neededBy ? format(formData.neededBy, "PPP") : <span>When do you need this food?</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.neededBy || undefined}
                  onSelect={(date) => setFormData({...formData, neededBy: date || null})}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting Requirement...
              </>
            ) : (
              <>
                <Heart className="mr-2 h-4 w-4" />
                Post Requirement
              </>
            )}
          </Button>
        </form>
        
        {/* AI Matching Results - Shows after successful requirement posting */}
        {showMatches && (
          <AIMatchResults
            matches={matchResults}
            type="donors"
            isLoading={isMatchingLoading}
            onContactClick={(match) => {
              toast.info(`Contact ${match.organizationName || match.name}`, {
                description: `Phone: ${match.phone || 'Not available'}`,
                duration: 5000,
              });
            }}
          />
        )}
      </CardContent>
    </Card>
    </GoogleMapsLoader>
  );
}