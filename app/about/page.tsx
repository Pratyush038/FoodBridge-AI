'use client';

import { Heart, Sparkles, MapPin, Clock, UserCheck, ShieldCheck, TrendingUp, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  const router = useRouter();
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 pb-24 overflow-x-hidden pt-16">
      {/* Decorative background blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-green-200 opacity-30 rounded-full blur-3xl z-0" />
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-blue-200 opacity-20 rounded-full blur-2xl z-0" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-green-100 opacity-20 rounded-full blur-2xl z-0" />
      
      {/* Back to Home Button */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-4 pb-6">
        <Button
          onClick={() => router.push('/')}
          variant="outline"
          className="flex items-center gap-2 hover:bg-green-50 hover:border-green-300"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 max-w-3xl mx-auto text-center py-20 px-4">
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center justify-center bg-white shadow-lg rounded-full w-20 h-20">
            <Heart className="h-10 w-10 text-green-500" />
          </span>
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight drop-shadow-sm">
          About{' '}
          <Link href="/" className="text-green-600 hover:underline focus:outline-none focus:ring-2 focus:ring-green-400/50 transition">
            FoodBridge AI
          </Link>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
FoodBridge AI is an intelligent platform that connects surplus food providers, such as restaurants, grocers, and event organisers, with verified recipients through a network of NGOs, shelters, and community kitchens. Powered by automation and smart logistics, it ensures timely, efficient, and equitable food distribution, reducing waste and fighting hunger at scale.
        </p>
        <div className="flex justify-center mt-6">
          <Link href="/register" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-full shadow transition-all text-lg">
            Get Started <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 flex justify-center my-10">
        <div className="w-24 h-1 rounded-full bg-gradient-to-r from-green-400 via-green-300 to-blue-300 opacity-60" />
      </div>

      {/* How It Works Section */}
      <section className="relative z-10 max-w-4xl mx-auto bg-white/90 rounded-3xl shadow-2xl p-12 md:p-16 mb-16 border border-gray-100 backdrop-blur-md">
        <h2 className="text-3xl font-bold text-gray-900 mb-10 flex items-center gap-3">
          <div className="h-7 w-7 text-green-500" />
          How FoodBridge AI Works
        </h2>
        <ol className="space-y-16 text-gray-800">
          <li>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center bg-green-100 rounded-full w-10 h-10"><MapPin className="h-6 w-6 text-green-500" /></span>
              <span className="font-semibold text-xl">1. Access Live Donation Listings</span>
            </div>
            <p className="ml-14 text-gray-700 text-lg max-w-3xl">
              Once you log in, you&#39;ll see a live dashboard of available food donations tailored to your location and needs. Each listing includes:
            </p>
            <ul className="ml-20 mt-2 list-disc text-gray-600 text-base max-w-3xl">
              <li>Food type and quantity</li>
              <li>Expiry or best-before time</li>
              <li>Pickup location with directions</li>
              <li>Availability window</li>
            </ul>
            <p className="ml-14 mt-2 text-gray-700 text-lg max-w-3xl">The interface is designed for quick filtering and action, even in urgent situations.</p>
          </li>
          <li>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center bg-blue-100 rounded-full w-10 h-10"><Sparkles className="h-6 w-6 text-blue-500" /></span>
              <span className="font-semibold text-xl">2. AI-Powered Matching</span>
            </div>
            <p className="ml-14 text-gray-700 text-lg max-w-3xl">Behind the scenes, our AI engine analyzes real-time factors such as:</p>
            <ul className="ml-20 mt-2 list-disc text-gray-600 text-base max-w-3xl">
              <li>Your past claim history and capacity</li>
              <li>Distance from the donor</li>
              <li>Urgency (based on food expiry)</li>
              <li>Category preferences (e.g., cooked vs. raw, veg/non-veg)</li>
              <li>Claim frequency to ensure equitable access</li>
            </ul>
            <p className="ml-14 mt-2 text-gray-700 text-lg max-w-3xl">
              Based on these, the system ranks and suggests donations most relevant to you. High-priority users (like verified shelters or community kitchens) may get early access or automatic reservations.
            </p>
          </li>
          <li>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center bg-yellow-100 rounded-full w-10 h-10"><ShieldCheck className="h-6 w-6 text-yellow-500" /></span>
              <span className="font-semibold text-xl">3. Secure Claim and Pickup</span>
            </div>
            <p className="ml-14 text-gray-700 text-lg max-w-3xl">Once you request a donation:</p>
            <ul className="ml-20 mt-2 list-disc text-gray-600 text-base max-w-3xl">
              <li>You receive a secure pickup code and time slot</li>
              <li>Contact details are shared (with safety protocols)</li>
              <li>You may assign the pickup to a team member or volunteer</li>
            </ul>
            <p className="ml-14 mt-2 text-gray-700 text-lg max-w-3xl">Pickups are monitored to prevent misuse, double-booking, or no-shows.</p>
          </li>
          <li>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center bg-purple-100 rounded-full w-10 h-10"><TrendingUp className="h-6 w-6 text-purple-500" /></span>
              <span className="font-semibold text-xl">4. Track and Manage Your Activity</span>
            </div>
            <p className="ml-14 text-gray-700 text-lg max-w-3xl">Your personal dashboard provides:</p>
            <ul className="ml-20 mt-2 list-disc text-gray-600 text-base max-w-3xl">
              <li>Number of meals or items received</li>
              <li>Distribution stats over time</li>
              <li>Zone-based history for operational planning</li>
              <li>AI insights (e.g., peak hours, most needed items in your area)</li>
            </ul>
            <p className="ml-14 mt-2 text-gray-700 text-lg max-w-3xl">This helps NGOs and recipients improve logistics and reduce food waste even further.</p>
          </li>
          <li>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center bg-gray-200 rounded-full w-10 h-10"><UserCheck className="h-6 w-6 text-gray-700" /></span>
              <span className="font-semibold text-xl">5. Zero Cost, Full Transparency</span>
            </div>
            <p className="ml-14 text-gray-700 text-lg max-w-3xl">FoodBridge AI is completely free to use. There are no subscription tiers, hidden fees, or ad-based limitations. Every part of the system is designed to maximize efficiency and fairness, not profit.</p>
          </li>
        </ol>
      </section>

      {/* Divider */}
      <div className="relative z-10 flex justify-center my-10">
        <div className="w-24 h-1 rounded-full bg-gradient-to-r from-green-400 via-green-300 to-blue-300 opacity-60" />
      </div>

      {/* Why AI Section */}
      <section className="relative z-10 max-w-4xl mx-auto bg-white/90 rounded-3xl shadow-2xl p-12 md:p-16 border border-gray-100 backdrop-blur-md">
        <h2 className="text-3xl font-bold text-gray-900 mb-10 flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-green-500" />
          Why AI?
        </h2>
        <p className="text-gray-700 mb-4 text-lg max-w-3xl">
          Traditional food distribution often relies on manual coordination, leading to delays, overbooking, and food spoilage. Our AI model automates:
        </p>
        <ul className="ml-8 mb-4 list-disc text-gray-600 text-base max-w-3xl">
          <li>Donation-to-recipient matching</li>
          <li>Priority and fairness allocation</li>
          <li>Expiry-based urgency scoring</li>
          <li>Smart notifications and reminders</li>
        </ul>
        <p className="text-gray-700 text-lg max-w-3xl">
          This allows us to scale across cities, manage high volumes, and serve more people without friction.
        </p>
      </section>
    </main>
  );
} 