'use client';

import { useEffect } from 'react';
import { useSpring, useTransform, motion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({ value, suffix = '', prefix = '' }: AnimatedCounterProps) {
  const spring = useSpring(0, {
    damping: 20,
    stiffness: 100,
    mass: 0.5
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const displayValue = useTransform(spring, (v) => {
    const num = Math.round(v);
    return `${prefix}${num.toLocaleString()}${suffix}`;
  });

  return (
    <motion.span>
      {displayValue}
    </motion.span>
  );
}
