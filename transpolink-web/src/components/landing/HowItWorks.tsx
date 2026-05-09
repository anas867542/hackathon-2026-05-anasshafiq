'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    emoji: '📍',
    title: 'Set your route',
    body: 'Enter pickup and drop-off addresses. The map instantly shows the route and estimated distance.',
  },
  {
    emoji: '🚛',
    title: 'Choose a vehicle',
    body: 'Pick the size that fits your load — mini truck to full container. See the fare estimate before confirming.',
  },
  {
    emoji: '⚡',
    title: 'Get matched instantly',
    body: 'Nearby verified drivers receive your request. The first to accept gets the job. Avg match: 45 s.',
  },
  {
    emoji: '🗺️',
    title: 'Track in real-time',
    body: 'Follow your driver on the live map. Share the tracking link with your team or recipient.',
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" className="py-24 bg-gray-50 dark:bg-gray-900" ref={ref}>
      <div className="container-page">
        <div className="max-w-2xl mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            How it works
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            From booking to delivery in 4 steps
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            We cut out the middlemen and connect shippers directly with verified drivers.
          </p>
        </div>

        <div className="relative">
          {/* Desktop connector line */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-[26px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px bg-gradient-to-r from-transparent via-brand-300/60 dark:via-brand-700/60 to-transparent"
          />

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 32 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] }}
                className="flex flex-col items-start lg:items-center lg:text-center"
              >
                {/* Step bubble */}
                <div className="relative mb-5 grid size-12 place-items-center rounded-full bg-brand-600 text-white font-bold text-sm shadow-glow ring-4 ring-brand-100 dark:ring-brand-900">
                  {i + 1}
                </div>
                <div className="mb-3 text-3xl">{step.emoji}</div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <a
            href="/book"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-8 py-4 text-sm font-semibold text-white shadow-glow hover:bg-brand-700 transition-all hover:shadow-[0_0_32px_rgba(13,148,136,0.45)] active:scale-[0.98]"
          >
            Try it now — it's free →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
