'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

export function HeroContent() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleGetStarted = () => {
    if (session) {
      router.push(`/${(session.user as any).role || 'donor'}`);
    } else {
      router.push('/register');
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={itemVariants}
        className="inline-block"
      >
        <span className="text-sm font-semibold tracking-wider text-green-600 uppercase">
          Transforming Food Donations
        </span>
      </motion.div>
      
      <motion.h1 
        className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight tracking-tight"
        variants={itemVariants}
      >
        Bridge the Gap Between 
        <span className="text-green-600"> Surplus Food </span>
        and Those in Need.

      </motion.h1>
      
      <motion.p 
        className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl"
        variants={itemVariants}
      >
        FoodBridge AI uses intelligent matching to connect food donors with NGOs and shelters, ensuring that excess food reaches the plates of the hungry, not landfills.
      </motion.p>
      
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 pt-4" 
        variants={itemVariants}
      >
        <Button 
          size="lg" 
          onClick={handleGetStarted} 
          className="shadow-lg hover:shadow-xl transition-all duration-300 bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
        >
          <span className="flex items-center gap-2">
            <span>NGO Registration</span>
            <ArrowRight className="h-5 w-5" />
          </span>
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          onClick={handleGetStarted}
          className="shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg border-2 hover:bg-white/50 backdrop-blur-sm"
        >
          Start Donating
        </Button>
      </motion.div>
      
      <motion.div 
        variants={itemVariants}
        className="pt-8"
      >
      </motion.div>
    </motion.div>
  );
}
