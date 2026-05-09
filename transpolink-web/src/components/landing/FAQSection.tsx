'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: 'How quickly can I get a truck?',
    a: 'Our average driver match time is 45 seconds. In busy areas of Lahore and Karachi, drivers typically arrive within 15–30 minutes of accepting the booking.',
  },
  {
    q: 'How is the fare calculated?',
    a: "Fares are based on distance, vehicle type, and time of day. You'll always see a fare estimate before confirming. For larger shipments you can open bidding and let drivers compete on price.",
  },
  {
    q: 'Are drivers verified?',
    a: 'Yes. Every driver goes through identity verification, licence validation, and vehicle inspection before their first trip. We also run periodic re-verification.',
  },
  {
    q: 'What truck types are available?',
    a: 'Mini trucks (800 kg), pickups (1 ton), medium trucks (3 tons), large trucks (7 tons), and full containers (20+ tons). Our booking form recommends the right size based on your load description.',
  },
  {
    q: 'What if my goods are damaged during transport?',
    a: "TranspoLink's terms require drivers to handle goods with care. We recommend cargo insurance for high-value items. Our support team handles disputes within 48 hours of delivery.",
  },
  {
    q: 'Can I schedule a booking in advance?',
    a: 'Yes — up to 7 days ahead. Scheduled bookings are broadcast to nearby drivers 30 minutes before your pickup window.',
  },
  {
    q: 'How do I become a driver on TranspoLink?',
    a: 'Register at transpolink.dev/register?role=driver and complete onboarding — usually under 10 minutes. You need a valid CNIC, driver licence, and vehicle registration.',
  },
];

function FAQItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-none">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{q}</span>
        <span
          className={`shrink-0 grid size-6 place-items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          {/* Left label */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              FAQ
            </span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              Can't find what you're looking for?{' '}
              <a href="#contact" className="text-brand-600 dark:text-brand-400 hover:underline">
                Contact support →
              </a>
            </p>
          </div>

          {/* Accordion */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-6">
            {faqs.map((item, i) => (
              <FAQItem
                key={item.q}
                q={item.q}
                a={item.a}
                open={open === i}
                onToggle={() => setOpen(open === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
