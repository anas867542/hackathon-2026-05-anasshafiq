'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';

export function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="relative overflow-hidden bg-[#0A2540] py-24" ref={ref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(13,148,136,0.18)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-brand-600/10 blur-[80px]" />

      <div className="relative container-page text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Need a truck right now?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-gray-300">
            Drivers within 5 km will see your request instantly. Book in under 30 seconds.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/book">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-500 px-8 py-4 text-sm font-semibold text-white shadow-glow hover:bg-brand-400 transition-colors"
              >
                Book a truck →
              </motion.span>
            </Link>
            <Link href="/register?role=driver">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Drive with us
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
