'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Heart, Utensils, Building } from 'lucide-react';
import { motion, useInView, useSpring, Variants, useTransform } from 'framer-motion';
import { useRef, FC } from 'react';
import { LucideProps } from 'lucide-react';
import Image from 'next/image';

interface AnimatedNumberProps {
  value: number;
  label: string;
  icon: FC<LucideProps>;
}

function AnimatedNumber({ value, label, icon: Icon }: AnimatedNumberProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, {
    damping: 20,
    stiffness: 100,
    mass: 1
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  const displayValue = useTransform(spring, (v) => Math.round(v).toLocaleString());

  return (
    <motion.div ref={ref} className="text-center p-6">
      <div className="flex items-center justify-center">
        <Icon className="h-8 w-8 text-indigo-500 mr-2" />
        <motion.p
          className="text-4xl font-bold text-gray-900"
        >
          {displayValue}
        </motion.p>
      </div>
      <p className="text-lg text-gray-600 mt-1">{label}</p>
    </motion.div>
  );
}

export default function Hero() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    donations: 1500,
    mealsServed: 450000,
    cities: 50,
  });

  // This would fetch real data in a real app
  useEffect(() => {
    // Simulating a fetch for stats to make it feel more real
    const timer = setTimeout(() => {
      // In a real scenario, you would call getAnalyticsData()
      // For now, we&#39;ll just use slightly higher numbers to show change
      setStats({
        donations: 1573,
        mealsServed: 452108,
        cities: 52,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    if (session) {
      // User is logged in, go to their dashboard
      router.push(`/${(session.user as any).role || 'donor'}`);
    } else {
      // User is not logged in, go to register page
      router.push('/register');
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  const rightVariants: Variants = {
    hidden: { x: 100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeInOut",
      },
    },
  };

  return (
    <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20 md:py-32">
      <motion.div 
        className="container mx-auto px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <motion.h1 
              className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight"
              variants={itemVariants}
            >
              Bridge the Gap Between <span className="text-green-600">Surplus Food</span> and Those in Need.
            </motion.h1>
            <motion.p 
              className="text-lg md:text-xl text-gray-600"
              variants={itemVariants}
            >
              FoodBridge AI uses intelligent matching to connect food donors with NGOs and shelters, ensuring that excess food reaches the plates of the hungry, not landfills.
            </motion.p>
            <motion.div className="flex space-x-4" variants={itemVariants}>
              <Button size="lg" onClick={handleGetStarted}>
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
          <motion.div className="hidden md:block" variants={rightVariants}>
            <Image 
              src="/happy-photo.png" 
              alt="Happy people sharing food" 
              className="rounded-lg shadow-2xl"
              width={600}
              height={400}
            />
          </motion.div>
        </div>

        <motion.div 
          className="mt-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative">
            <div className="absolute inset-0 h-1/2 bg-white/30 backdrop blur-md rounder-xl border border-white/10" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                <dl className="rounded-lg bg-white shadow-lg sm:grid sm:grid-cols-3">
                  <AnimatedNumber value={stats.donations} label="Donations" icon={Heart} />
                  <AnimatedNumber value={stats.mealsServed} label="Meals Served" icon={Utensils} />
                  <AnimatedNumber value={stats.cities} label="Cities Covered" icon={Building} />
                </dl>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}