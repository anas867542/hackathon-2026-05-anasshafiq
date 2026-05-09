'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center bg-[#0A2540] overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-[600px] h-[600px] rounded-full bg-brand-600/20 blur-[100px]" />
        <div className="absolute -bottom-40 -left-32 w-[500px] h-[500px] rounded-full bg-brand-500/15 blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(13,148,136,0.07)_0%,transparent_70%)]" />
      </div>

      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative container-page pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="grid gap-14 md:grid-cols-2 md:items-center lg:gap-20">

          {/* Left: headline + CTAs */}
          <div>
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-300 mb-6"
            >
              <span className="size-1.5 rounded-full bg-brand-400 animate-pulse" />
              On-demand goods transport · Pakistan
            </motion.div>

            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible" custom={0.1}
              className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-[4.25rem] leading-[1.06]"
            >
              Move anything,{' '}
              <span className="text-brand-400">anywhere</span>
              <br />— in minutes.
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={0.2}
              className="mt-6 max-w-lg text-lg leading-relaxed text-gray-300"
            >
              Pakistan's fastest truck booking platform. Set your route, pick a vehicle,
              and a verified driver near you accepts in under 45 seconds.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href="/book">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-500 transition-colors"
                >
                  Book a truck →
                </motion.span>
              </Link>
              <Link href="/register?role=driver">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  Drive with us
                </motion.span>
              </Link>
            </motion.div>

            {/* Stat strip */}
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0.4}
              className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8"
            >
              {[
                { value: '~45s', label: 'Avg. match time' },
                { value: '12+', label: 'Cities covered' },
                { value: '4.8★', label: 'Driver rating' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold text-white sm:text-3xl">{s.value}</div>
                  <div className="mt-1 text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: mock trip card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            className="relative"
          >
            {/* Floating: drivers nearby */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-5 -left-5 z-10 flex items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 shadow-floating"
            >
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white">3 drivers nearby</span>
            </motion.div>

            {/* Main card */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-floating">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white font-bold shadow-glow text-sm">T</div>
                  <div>
                    <p className="text-sm font-semibold text-white">Live trip · TPL-7K3M9X</p>
                    <p className="text-xs text-gray-400">Driver: Bilal Ahmed</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>

              {/* Map placeholder */}
              <div className="mb-5 h-36 rounded-2xl bg-gradient-to-br from-brand-900/40 to-gray-800/60 border border-white/5 overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                {/* Driver pin */}
                <div className="absolute top-[45%] left-[32%] -translate-x-1/2 -translate-y-1/2">
                  <div className="size-4 rounded-full bg-brand-500 shadow-glow" />
                  <div className="absolute inset-0 rounded-full bg-brand-500 animate-pulse-ring" />
                </div>
                {/* Destination pin */}
                <div className="absolute top-[35%] right-[28%]">
                  <div className="size-3 rounded-full border-2 border-white bg-gray-900" />
                </div>
                {/* Dashed route */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 145" fill="none">
                  <path d="M 90 65 Q 155 30 215 50" stroke="#14b8a6" strokeWidth="2" strokeDasharray="5 3" opacity="0.7" />
                </svg>
              </div>

              {/* Route info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-white">Gulberg III, Lahore</p>
                    <p className="text-xs text-gray-400">Pickup · 12 min ago</p>
                  </div>
                </div>
                <div className="ml-[3px] h-5 w-px bg-white/10" />
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full border-2 border-gray-400 bg-transparent" />
                  <div>
                    <p className="text-sm font-medium text-white">DHA Phase 5</p>
                    <p className="text-xs text-gray-400">ETA · 8 min</p>
                  </div>
                </div>
              </div>

              {/* Fare row */}
              <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400">Estimated fare</p>
                  <p className="text-lg font-bold text-white">PKR 1,840</p>
                </div>
                <div className="grid size-10 place-items-center rounded-xl bg-brand-600/30 border border-brand-500/30 text-xl">
                  🚛
                </div>
              </div>
            </div>

            {/* Floating: ETA */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute -bottom-5 -right-5 z-10 rounded-2xl bg-brand-600 px-4 py-2.5 shadow-glow"
            >
              <p className="text-[10px] text-brand-200">Arriving in</p>
              <p className="text-lg font-bold text-white">8 min</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white dark:from-gray-950 to-transparent" />
    </section>
  );
}
