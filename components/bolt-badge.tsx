'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function BoltBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <a
        href="https://bolt.new"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Zap className="h-4 w-4 fill-current" />
        </motion.div>
        <span className="text-sm font-semibold">Made with Bolt</span>
      </a>
    </motion.div>
  );
}