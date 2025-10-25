'use client';

import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';
import { HeroContent } from './hero-content';
import { HeroImage } from './hero-image';
import { HeroStats } from './hero-stats';

export default function Hero() {
  return (
    <section className="relative min-h-screen py-20 md:py-32 overflow-hidden bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30">
      {/* Dot Pattern Background */}
      <DotPattern
        className={cn(
          "absolute inset-0 h-full w-full",
          "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]",
          "text-gray-500/50" // darker base + good visibility
        )}
      />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left: Hero Content */}
          <div className="pt-12">
            <HeroContent />
          </div>
          
          {/* Right: Hero Image */}
          <div className="hidden md:block pt-12">
            <HeroImage />
          </div>
        </div>
        
        {/* Stats Row - Below Everything */}
        <div className="mt-20 md:mt-32">
          <HeroStats />
        </div>
      </div>
    </section>
  );
}