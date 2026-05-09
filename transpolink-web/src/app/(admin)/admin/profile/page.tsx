'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');

  function save(section: string) {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  }

  function handlePasswordSave() {
    setPwError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    save('password');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  const initials = 'A';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Profile" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Account profile</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage your personal information and password</p>
        </div>

        {/* Avatar + info */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-5">
          <div className="flex items-center gap-5">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-glow">
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">Admin</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email ?? 'admin@transpolink.dev'}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-950/50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:text-brand-400">
                Admin
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Full name', defaultValue: 'Admin' },
              { label: 'Email address', defaultValue: user?.email ?? 'admin@transpolink.dev', type: 'email' },
              { label: 'Phone number', defaultValue: '+92 300 0000000', type: 'tel' },
            ].map((field) => (
              <div key={field.label} className={field.label === 'Email address' ? 'sm:col-span-2' : ''}>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {field.label}
                </label>
                <input
                  type={field.type ?? 'text'}
                  defaultValue={field.defaultValue}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-all"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => save('profile')}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              {savedSection === 'profile' ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Change password</h3>

          {pwError && (
            <div className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-xs text-red-700 dark:text-red-400">
              {pwError}
            </div>
          )}

          <div className="space-y-3">
            {[
              { label: 'Current password', value: currentPassword, set: setCurrentPassword },
              { label: 'New password', value: newPassword, set: setNewPassword },
              { label: 'Confirm new password', value: confirmPassword, set: setConfirmPassword },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  {field.label}
                </label>
                <input
                  type="password"
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-all"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handlePasswordSave}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              {savedSection === 'password' ? '✓ Updated' : 'Update password'}
            </button>
          </div>
        </div>

        {/* Session info */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Session</h3>
          <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Current session</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Signed in via admin portal · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
