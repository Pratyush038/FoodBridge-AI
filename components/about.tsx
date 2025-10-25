'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Heart, TrendingUp, Shield, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';

export default function About() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const features = [
    {
      name: 'AI-Powered Matching',
      description: 'Our intelligent algorithms connect donors and receivers with unprecedented efficiency, minimizing waste and maximizing impact.',
      icon: TrendingUp,
      stat: '98% Match Efficiency',
    },
    {
      name: 'Verified Network',
      description: 'We partner with a trusted network of over 500+ vetted NGOs and shelters across the country.',
      icon: Shield,
      stat: '500+ Partner NGOs',
    },
    {
      name: 'Real-Time Tracking',
      description: 'Donors can track their contributions from pickup to delivery, ensuring transparency and accountability.',
      icon: Heart,
      stat: '1.2M+ Meals Served',
    },
    {
      name: 'Secure Transactions',
      description: 'Our platform leverages blockchain technology to ensure every donation is tracked securely and transparently from donor to receiver.',
      icon: Lock,
      stat: '100% Auditable',
    },
  ];

  const handleStartDonating = () => {
    if (status === 'authenticated' && session?.user) {
      router.push('/donor');
    } else {
      router.push('/login?callbackUrl=https%3A%2F%2Ffood-bridge-ai.vercel.app%2Fdonor');
    }
  };

  const handleNeedFood = () => {
    if (status === 'authenticated' && session?.user) {
      router.push('/receiver');
    } else {
      router.push('/login?callbackUrl=https%3A%2F%2Ffood-bridge-ai.vercel.app%2Freceiver');
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div className="relative py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
      {/* Dot Pattern Background */}
      <DotPattern
        className={cn(
          "absolute inset-0 h-full w-full",
          "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
          "text-gray-300/30"
        )}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="lg:text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeIn}
        >
          <h2 className="text-base text-green-600 font-semibold tracking-wide uppercase">How It Works</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Revolutionizing Food Distribution
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Our AI-powered platform makes it simple to donate surplus food and connect with organizations that need it most.
          </p>
        </motion.div>

        <div className="mt-10">
          <motion.div 
            className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
          >
            {features.map((feature, index) => (
              <motion.div key={feature.name} variants={fadeIn}>
                <Card className="relative hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full bg-white/70 backdrop-blur-md border-2 border-green-500">
                  <CardContent className="p-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                          <feature.icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-2">{feature.name}</h3>
                        <p className="text-base text-gray-600 leading-relaxed">{feature.description}</p>
                        <p className="mt-3 text-sm font-medium text-green-600">{feature.stat}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div 
          className="mt-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-xl overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeIn}
        >
          <div className="px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Ready to make a difference?
              </h2>
              <p className="mt-4 text-xl text-green-100">
                Join thousands of donors and organizations already using FoodBridge AI.
              </p>
              <div className="mt-8 flex justify-center space-x-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">10K+</div>
                  <div className="text-green-100">Meals Donated</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">500+</div>
                  <div className="text-green-100">Organizations</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">50+</div>
                  <div className="text-green-100">Cities</div>
                </div>
              </div>
              
              {/* Call to Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Button 
                  size="lg" 
                  className="bg-white text-green-600 hover:bg-gray-100 flex items-center space-x-2"
                  onClick={handleStartDonating}
                >
                  <span>{status === 'authenticated' ? 'Go to Dashboard' : 'Start Donating'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-green-600 hover:bg-white hover:text-green-600"
                  onClick={handleNeedFood}
                >
                  Need Food?
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}