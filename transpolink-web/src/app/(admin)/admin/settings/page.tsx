'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [autoCancel, setAutoCancel] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  function save(section: string) {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Settings" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Platform settings</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure platform behaviour and notifications</p>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notification preferences</h3>

          <div className="space-y-4">
            {[
              { label: 'Email notifications', sub: 'Receive booking updates via email', checked: emailNotif, set: setEmailNotif },
              { label: 'SMS notifications', sub: 'Receive critical alerts via SMS', checked: smsNotif, set: setSmsNotif },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{item.sub}</p>
                </div>
                <Toggle checked={item.checked} onChange={item.set} />
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => save('notifications')}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              {savedSection === 'notifications' ? '✓ Saved' : 'Save preferences'}
            </button>
          </div>
        </div>

        {/* Booking behaviour */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Booking behaviour</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Auto-cancel expired bookings</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Automatically cancel bookings with no driver response after 30 min</p>
              </div>
              <Toggle checked={autoCancel} onChange={setAutoCancel} />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Fare limits</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Minimum fare (PKR)', value: '500' },
                { label: 'Maximum fare (PKR)', value: '50,000' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input
                    type="text"
                    defaultValue={f.value}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => save('booking')}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              {savedSection === 'booking' ? '✓ Saved' : 'Save settings'}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-100 dark:border-red-900/50 bg-white dark:bg-gray-950 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Maintenance mode</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Disables new bookings and shows maintenance banner to customers</p>
            </div>
            <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} />
          </div>

          {maintenanceMode && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-400">
              ⚠ Maintenance mode is active. Customers cannot place new bookings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
