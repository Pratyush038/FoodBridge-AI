'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { TrendingUp } from 'lucide-react';

const rightVariants = {
  hidden: { x: 100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number],
    },
  },
};

export function HeroImage() {
  return (
    <motion.div 
      className="relative h-[600px]" 
      variants={rightVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Main image container with gradient overlay */}
      <div className="relative w-full h-full rounded-3xl overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-green-200 to-green-300 opacity-90 z-10" />
        
        {/* Image */}
        <div className="absolute inset-0 z-20 flex items-center justify-center p-8">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/happy-photo.png"
              alt="Food donation connecting communities"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
