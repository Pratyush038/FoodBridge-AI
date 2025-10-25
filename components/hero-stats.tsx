'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { Heart, Utensils, Building } from 'lucide-react';

interface AnimatedStatProps {
  value: number;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  delay?: number;
}

function AnimatedStat({ value, label, icon: Icon, iconColor, delay = 0 }: AnimatedStatProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const spring = useSpring(0, {
    damping: 25,
    stiffness: 80,
    mass: 0.8
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  const displayValue = useTransform(spring, (v) => Math.round(v).toLocaleString());

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="relative bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-green-500"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`${iconColor} flex-shrink-0`}>
          <Icon className="h-7 w-7" />
        </div>
        <motion.p className="text-4xl font-bold text-gray-900">
          {displayValue}
        </motion.p>
      </div>
      <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">{label}</p>
    </motion.div>
  );
}

export function HeroStats() {
  const [stats, setStats] = useState({
    donations: 0,
    mealsServed: 0,
    cities: 0,
  });

  useEffect(() => {
    // Animate to initial values quickly
    const timer1 = setTimeout(() => {
      setStats({
        donations: 1500,
        mealsServed: 450000,
        cities: 50,
      });
    }, 200);

    // Update to final values after showing initial numbers
    const timer2 = setTimeout(() => {
      setStats({
        donations: 1573,
        mealsServed: 452108,
        cities: 52,
      });
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <AnimatedStat
        value={stats.donations}
        label="Donations"
        icon={Heart}
        iconColor="text-green-600"
        delay={0}
      />
      <AnimatedStat
        value={stats.mealsServed}
        label="Meals Served"
        icon={Utensils}
        iconColor="text-emerald-600"
        delay={0.1}
      />
      <AnimatedStat
        value={stats.cities}
        label="Cities Covered"
        icon={Building}
        iconColor="text-green-700"
        delay={0.2}
      />
    </div>
  );
}
