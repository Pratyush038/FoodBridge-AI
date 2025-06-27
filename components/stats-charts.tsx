'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FoodDonation, FoodRequirement, Match } from '@/lib/firebase-service';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';

interface StatsChartsProps {
  donations: FoodDonation[];
  requirements: FoodRequirement[];
  matches: Match[];
}

export default function StatsCharts({ donations, requirements, matches }: StatsChartsProps) {
  // Prepare daily data for the last 7 days (reduced from 30 for faster processing)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const dailyData = last7Days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayDonations = donations.filter(d => 
      format(parseISO(d.createdAt), 'yyyy-MM-dd') === dayStr
    );
    const dayRequirements = requirements.filter(r => 
      format(parseISO(r.createdAt), 'yyyy-MM-dd') === dayStr
    );

    return {
      date: format(day, 'MMM dd'),
      donations: dayDonations.length,
      requirements: dayRequirements.length,
      completed: dayDonations.filter(d => d.status === 'completed').length
    };
  });

  // Status distribution (simplified)
  const statusData = [
    {
      name: 'Pending',
      donations: donations.filter(d => d.status === 'pending').length,
      requirements: requirements.filter(r => r.status === 'active').length,
    },
    {
      name: 'Matched',
      donations: donations.filter(d => d.status === 'matched').length,
      requirements: requirements.filter(r => r.status === 'matched').length,
    },
    {
      name: 'Completed',
      donations: donations.filter(d => d.status === 'completed').length,
      requirements: requirements.filter(r => r.status === 'fulfilled').length,
    }
  ];

  // Food type summary (simplified)
  const foodTypeSummary = donations.reduce((acc, donation) => {
    const type = donation.foodType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topFoodTypes = Object.entries(foodTypeSummary)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name: name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), count }));

  return (
    <div className="space-y-6">
      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
          <CardDescription>Donations and requirements over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="donations" fill="#22C55E" name="Donations" />
              <Bar dataKey="requirements" fill="#3B82F6" name="Requirements" />
              <Bar dataKey="completed" fill="#10B981" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Current status of donations and requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="donations" fill="#22C55E" name="Donations" />
                <Bar dataKey="requirements" fill="#3B82F6" name="Requirements" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Food Types */}
        <Card>
          <CardHeader>
            <CardTitle>Top Food Types</CardTitle>
            <CardDescription>Most donated food categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topFoodTypes.map((food, index) => (
                <div key={food.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-800">{index + 1}</span>
                    </div>
                    <span className="font-medium">{food.name}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{food.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Summary</CardTitle>
          <CardDescription>Key metrics and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{donations.length}</div>
              <div className="text-sm text-gray-500">Total Donations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{requirements.length}</div>
              <div className="text-sm text-gray-500">Total Requirements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{matches.length}</div>
              <div className="text-sm text-gray-500">Total Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {donations.length > 0 ? Math.round((donations.filter(d => d.status === 'completed').length / donations.length) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500">Completion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}