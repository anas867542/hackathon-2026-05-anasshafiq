'use client';

import { useState, FormEvent, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const contactInfo = [
  { icon: '📧', label: 'Email', value: 'support@transpolink.pk' },
  { icon: '📞', label: 'Phone', value: '+92 300 0000000' },
  { icon: '📍', label: 'Office', value: 'Lahore, Pakistan' },
];

export function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  function validate() {
    const errs: Partial<typeof form> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'A valid email is required';
    if (form.message.trim().length < 10) errs.message = 'Message must be at least 10 characters';
    return errs;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitted(true);
    setSending(false);
  }

  const field =
    'w-full rounded-xl border px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

  return (
    <section id="contact" className="py-24 bg-white dark:bg-gray-950" ref={ref}>
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              Contact us
            </span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Get in touch
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              Questions, partnership inquiries, or enterprise pricing? Our team responds within 24 hours.
            </p>

            <div className="mt-8 space-y-4">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-brand-50 dark:bg-brand-950/60 text-lg">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          >
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-brand-100 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/40 p-12 text-center">
                <div className="mb-4 grid size-14 place-items-center rounded-full bg-brand-100 dark:bg-brand-900 text-3xl">
                  ✅
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Message sent!</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-5">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
                    placeholder="Asad Mehmood"
                    className={`${field} ${errors.name ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }); }}
                    placeholder="you@company.com"
                    className={`${field} ${errors.email ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Message */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: undefined }); }}
                    placeholder="Tell us how we can help..."
                    className={`${field} resize-none ${errors.message ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                  />
                  {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-700 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {sending && (
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {sending ? 'Sending…' : 'Send message →'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
