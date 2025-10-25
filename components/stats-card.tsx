'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  value: string | number | React.ReactNode;
  label: string;
  iconColor?: string;
  delay?: number;
}

export function StatsCard({ icon: Icon, value, label, iconColor = "text-green-600", delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <p className="text-sm text-gray-600 font-medium">{label}</p>
    </motion.div>
  );
}
