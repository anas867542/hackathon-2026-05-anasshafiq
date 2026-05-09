'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DocumentUpload } from '@/components/upload/DocumentUpload';
import { TruckTypeSelector } from '@/components/booking/TruckTypeSelector';
import { driversApi } from '@/lib/api/drivers';
import { trucksApi } from '@/lib/api/trucks';
import { ApiError } from '@/lib/api/client';
import type { VehicleType } from '@/lib/api/bookings';

const STEPS = [
  { label: 'License',   icon: '🪪', desc: 'Driver verification' },
  { label: 'Vehicle',   icon: '🚛', desc: 'Truck registration' },
  { label: 'Documents', icon: '📋', desc: 'Insurance & papers' },
];

interface OnboardingState {
  licenseNumber: string;
  licenseExpiry: string;
  cnicNumber: string;
  licenseDocUrl: string;
  truckType: VehicleType | null;
  plateNumber: string;
  capacityKg: string;
  make: string;
  model: string;
  year: string;
  registrationDocUrl: string;
  insuranceDocUrl: string;
  insuranceExpiry: string;
}

const INITIAL: OnboardingState = {
  licenseNumber: '',
  licenseExpiry: '',
  cnicNumber: '',
  licenseDocUrl: '',
  truckType: 'mini_truck',
  plateNumber: '',
  capacityKg: '',
  make: '',
  model: '',
  year: '',
  registrationDocUrl: '',
  insuranceDocUrl: '',
  insuranceExpiry: '',
};

export default function DriverOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const canProceed = (() => {
    if (step === 0) return data.licenseNumber.trim().length >= 3 && data.licenseExpiry.length > 0 && data.licenseDocUrl.length > 0;
    if (step === 1) return data.truckType != null && data.plateNumber.trim().length >= 3 && Number(data.capacityKg) > 0;
    if (step === 2) return data.registrationDocUrl.length > 0 && data.insuranceDocUrl.length > 0;
    return false;
  })();

  async function next() {
    setError(null);
    if (step < STEPS.length - 1) { setStep((s) => s + 1); return; }
    if (!data.truckType) return;
    setSubmitting(true);
    try {
      await driversApi.submitOnboarding({
        licenseNumber: data.licenseNumber.trim(),
        licenseExpiry: data.licenseExpiry,
        cnicNumber: data.cnicNumber.trim() || undefined,
        licenseDocUrl: data.licenseDocUrl,
      });
      await trucksApi.create({
        type: data.truckType,
        plateNumber: data.plateNumber.trim(),
        capacityKg: Number(data.capacityKg),
        make: data.make.trim() || undefined,
        model: data.model.trim() || undefined,
        year: data.year ? Number(data.year) : undefined,
        registrationDocUrl: data.registrationDocUrl,
        insuranceDocUrl: data.insuranceDocUrl,
        insuranceExpiry: data.insuranceExpiry || undefined,
        isPrimary: true,
      });
      router.replace('/driver/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to submit onboarding');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero band */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 pt-10 pb-24 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid size-8 place-items-center rounded-xl bg-white/20 text-sm font-bold text-white">T</div>
            <span className="text-sm font-semibold text-brand-200">TranspoLink</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Get verified to drive</h1>
          <p className="mt-1 text-brand-200 text-sm">Complete your profile in 3 quick steps</p>

          {/* Step indicators */}
          <div className="mt-6 flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`grid size-9 place-items-center rounded-xl text-base transition-all ${
                    i === step
                      ? 'bg-white shadow-glow scale-110'
                      : i < step
                      ? 'bg-emerald-400/30 border border-emerald-400/50'
                      : 'bg-white/10'
                  }`}>
                    {i < step ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 7 6 11 12 3"/>
                      </svg>
                    ) : (
                      <span className={i === step ? 'text-brand-700' : 'text-white/50'}>{s.icon}</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${i === step ? 'text-white' : i < step ? 'text-emerald-300' : 'text-brand-300/60'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-3 mb-4 h-px w-10 sm:w-16 transition-all ${i < step ? 'bg-emerald-400/50' : 'bg-white/20'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="-mt-12 px-4 pb-10 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-5">

          {error && (
            <div className="rounded-2xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-card overflow-hidden">
            {/* Step header */}
            <div className="flex items-center gap-4 px-5 py-5 border-b border-gray-100 dark:border-gray-800 sm:px-6">
              <div className="grid size-11 place-items-center rounded-xl bg-brand-50 dark:bg-brand-950/50 text-2xl">
                {STEPS[step].icon}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{STEPS[step].label}</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{STEPS[step].desc}</p>
              </div>
            </div>

            {/* Step content */}
            <div className="px-5 py-6 sm:px-6 space-y-5">
              {step === 0 && (
                <>
                  <Input
                    label="License number"
                    value={data.licenseNumber}
                    onChange={(e) => update('licenseNumber', e.target.value)}
                    placeholder="LHR-001234"
                    required
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="License expiry"
                      type="date"
                      value={data.licenseExpiry}
                      onChange={(e) => update('licenseExpiry', e.target.value)}
                      required
                    />
                    <Input
                      label="CNIC (optional)"
                      value={data.cnicNumber}
                      onChange={(e) => update('cnicNumber', e.target.value)}
                      placeholder="42101-1234567-8"
                    />
                  </div>
                  <DocumentUpload
                    label="License document"
                    hint="Photo of the front of your driving license."
                    value={data.licenseDocUrl}
                    onChange={(url) => update('licenseDocUrl', url)}
                  />
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Truck type</p>
                    <TruckTypeSelector value={data.truckType} onChange={(v) => update('truckType', v)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Plate number"
                      value={data.plateNumber}
                      onChange={(e) => update('plateNumber', e.target.value)}
                      placeholder="LEH-1234"
                      required
                    />
                    <Input
                      label="Capacity (kg)"
                      type="number"
                      min={50}
                      value={data.capacityKg}
                      onChange={(e) => update('capacityKg', e.target.value)}
                      required
                    />
                    <Input
                      label="Make"
                      value={data.make}
                      onChange={(e) => update('make', e.target.value)}
                      placeholder="Suzuki"
                    />
                    <Input
                      label="Model"
                      value={data.model}
                      onChange={(e) => update('model', e.target.value)}
                      placeholder="Ravi"
                    />
                    <Input
                      label="Year"
                      type="number"
                      min={1980}
                      max={2100}
                      value={data.year}
                      onChange={(e) => update('year', e.target.value)}
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                    Our team verifies all documents before you can go online. This usually takes 24–48 hours.
                  </div>
                  <DocumentUpload
                    label="Registration document"
                    hint="The vehicle registration certificate."
                    value={data.registrationDocUrl}
                    onChange={(url) => update('registrationDocUrl', url)}
                  />
                  <DocumentUpload
                    label="Insurance document"
                    hint="Latest insurance policy."
                    value={data.insuranceDocUrl}
                    onChange={(url) => update('insuranceDocUrl', url)}
                  />
                  <Input
                    label="Insurance expiry (optional)"
                    type="date"
                    value={data.insuranceExpiry}
                    onChange={(e) => update('insuranceExpiry', e.target.value)}
                  />
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-5 py-4 sm:px-6">
              <Button
                variant="secondary"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || submitting}
              >
                ← Back
              </Button>
              <Button onClick={next} disabled={!canProceed} isLoading={submitting} variant="brand">
                {step < STEPS.length - 1 ? `Next: ${STEPS[step + 1].label} →` : 'Submit for verification'}
              </Button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-brand-600' : i < step ? 'w-3 bg-brand-400' : 'w-3 bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
