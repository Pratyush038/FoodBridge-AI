'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, MapPin, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createDonation, getDonationsByDonor } from '@/lib/firebase-service';
import { geocodeAddress, initializeAutocomplete, Location } from '@/lib/maps';
import { toast } from 'sonner';

interface FoodUploadFormProps {
  onSuccess?: () => void;
}

export default function FoodUploadForm({ onSuccess }: FoodUploadFormProps) {
  const { data: session } = useSession();
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    foodType: '',
    quantity: '',
    unit: '',
    description: '',
    location: null as Location | null,
    pickupTime: '',
    expiryDate: null as Date | null,
    image: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<any>(null);

  // Load form data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('foodDonationFormData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Restore expiryDate as a Date object
      if (parsedData.expiryDate) {
        parsedData.expiryDate = new Date(parsedData.expiryDate);
      }
      setFormData(parsedData);
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    // We don't save the file object, only the data URL for preview
    const dataToSave = { ...formData, image: null };
    localStorage.setItem('foodDonationFormData', JSON.stringify(dataToSave));
  }, [formData]);

  // Initialize Mapbox Geocoder
  useEffect(() => {
    if (addressInputRef.current && !autocomplete) {
      const newAutocomplete = initializeAutocomplete(addressInputRef.current, (location) => {
        console.log('Location selected:', location);
        setFormData(prev => ({ ...prev, location }));
      });
      setAutocomplete(newAutocomplete);
    }
    // We only want this to run once, so we pass an empty dependency array.
    // The `autocomplete` state is used to ensure it's only initialized once.
  }, [autocomplete]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({...formData, image: file});
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      toast.error('Please sign in to upload food donations');
      return;
    }

    setLoading(true);

    try {
      // Validate required fields with better error messages
      const errors = [];
      
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
      
      if (errors.length > 0) {
        toast.error(`Please fix the following: ${errors.join(', ')}`);
        setLoading(false);
        return;
      }

      // Create donation object
      const donation = {
        donorId: (session.user as any).id || session.user.email || 'current-user',
        donorName: session.user.name || 'Anonymous Donor',
        foodType: formData.foodType,
        quantity: formData.quantity,
        unit: formData.unit,
        description: formData.description,
        location: formData.location!, // We've already validated this is not null
        pickupTime: formData.pickupTime,
        expiryDate: formData.expiryDate?.toISOString() || '',
        imageUrl: imagePreview || undefined,
        status: 'pending' as const
      };

      console.log('📝 Submitting donation:', donation);

      // Save to Firebase
      const donationId = await createDonation(donation);
      
      console.log('✅ Donation created with ID:', donationId);
      
      // Reset form
      setFormData({
        foodType: '',
        quantity: '',
        unit: '',
        description: '',
        location: null,
        pickupTime: '',
        expiryDate: null,
        image: null
      });
      setImagePreview(null);
      
      // Clear address input
      if (addressInputRef.current) {
        addressInputRef.current.value = '';
      }
      
      // Clear saved form data
      localStorage.removeItem('foodDonationFormData');

      // Show success message with more details
      toast.success(`🎉 Donation Posted Successfully!`, {
        description: `${formData.quantity} ${formData.unit} of ${formData.foodType} has been posted and is now visible to organizations in need.`,
        duration: 5000,
      });
      
      // Call onSuccess callback to refresh the donor dashboard
      if (onSuccess) {
        onSuccess();
      }
      
      // Force a small delay to ensure the database update is processed
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error creating donation:', error);
      toast.error('Failed to post donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Upload Food Donation</span>
        </CardTitle>
        <CardDescription>
          Share details about your food surplus to connect with organizations in need
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="foodType">Food Type *</Label>
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
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the food (ingredients, preparation method, etc.)"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="location">Pickup Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  ref={addressInputRef}
                  id="location"
                  placeholder="Start typing to see address suggestions..."
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500">Type an address and select from the dropdown that appears</p>
              {formData.location && (
                <p className="text-sm text-green-600">✓ Location confirmed: {formData.location.address}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupTime">Preferred Pickup Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="pickupTime"
                  type="time"
                  value={formData.pickupTime}
                  onChange={(e) => setFormData({...formData, pickupTime: e.target.value})}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expiryDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiryDate ? format(formData.expiryDate, "PPP") : <span>Pick expiry date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expiryDate || undefined}
                    onSelect={(date) => setFormData({...formData, expiryDate: date || null})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Food Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
                disabled={loading}
              />
            </div>
          </div>

          {imagePreview && (
            <div className="space-y-2">
              <Label>Image Preview</Label>
              <div className="relative w-full h-48">
                <Image
                  src={imagePreview}
                  alt="Food preview"
                  fill
                  className="object-cover rounded-lg border"
                />
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting Donation...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Post Donation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}