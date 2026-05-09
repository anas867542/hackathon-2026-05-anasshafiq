'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';

const notifications = [
  { text: 'New booking TPL-9K2M1X arrived', time: '2 min ago', dot: 'bg-brand-500' },
  { text: 'Driver Bilal completed trip', time: '15 min ago', dot: 'bg-emerald-500' },
  { text: 'Booking TPL-7K3M9X cancelled', time: '1 hr ago', dot: 'bg-red-500' },
];

export function DashboardHeader({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-6">
      <div>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">
          {title ?? 'Dashboard'}
        </h1>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <input
            type="text"
            placeholder="Search bookings…"
            className="h-9 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 pl-9 pr-4 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>

        {/* Dark mode */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="grid size-9 place-items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative grid size-9 place-items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-1 ring-white dark:ring-gray-950" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-floating p-3">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Notifications
              </p>
              {notifications.map((n, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.dot}`} />
                  <div>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{n.text}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="grid size-6 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              A
            </div>
            <span className="hidden sm:block text-xs font-medium text-gray-700 dark:text-gray-300">Admin</span>
            <svg viewBox="0 0 24 24" className="size-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 z-50 w-44 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-floating py-1.5">
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span>👤</span> Profile
              </button>
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span>⚙️</span> Settings
              </button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <span>🚪</span> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
