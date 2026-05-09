'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const testimonials = [
  {
    name: 'Asad Mehmood',
    role: 'Warehouse Manager · FurnishPk',
    initials: 'AM',
    rating: 5,
    text: 'We switched from calling dispatch agents to TranspoLink three months ago. Our average truck wait time dropped from 2 hours to under 10 minutes. The live tracking alone justified the move.',
  },
  {
    name: 'Bilal Raza',
    role: 'Driver Partner · Lahore',
    initials: 'BR',
    rating: 5,
    text: 'Before TranspoLink, I spent half my day hunting for loads. Now bookings come to me. I run 3–4 trips a day instead of 1–2, and the fare estimates are always fair.',
  },
  {
    name: 'Sana Tariq',
    role: 'Operations Head · StoreMart',
    initials: 'ST',
    rating: 5,
    text: 'The bidding feature is a game changer for bulk shipments. Drivers compete for our loads and we consistently save 15–20% on freight costs. Real-time tracking keeps our clients happy too.',
  },
  {
    name: 'Hamza Qureshi',
    role: 'E-commerce Seller · Karachi',
    initials: 'HQ',
    rating: 5,
    text: 'I run a small Daraz business from home. TranspoLink lets me book a mini truck in under a minute. The drivers are professional and I can track everything from my phone.',
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="size-4 fill-amber-400" viewBox="0 0 24 24">
          <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 bg-white dark:bg-gray-950" ref={ref}>
      <div className="container-page">
        <div className="max-w-2xl mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Testimonials
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Trusted by shippers and drivers
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Don't take our word for it — hear from the people who use TranspoLink every day.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.4, 0.25, 1] }}
              className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6"
            >
              <Stars count={t.rating} />
              <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                "{t.text}"
              </p>
              <div className="mt-5 flex items-center gap-3 border-t border-gray-100 dark:border-gray-800 pt-5">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
