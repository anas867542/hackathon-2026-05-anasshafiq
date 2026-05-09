'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const stats = [
  { value: '12,000+', label: 'Loads delivered' },
  { value: '3,200+', label: 'Verified drivers' },
  { value: '12', label: 'Cities covered' },
  { value: '4.8 / 5', label: 'Avg. driver rating' },
];

export function StatsStrip() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="bg-[#0A2540] py-16" ref={ref}>
      <div className="container-page">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-extrabold text-white lg:text-4xl">{stat.value}</div>
              <div className="mt-1.5 text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
