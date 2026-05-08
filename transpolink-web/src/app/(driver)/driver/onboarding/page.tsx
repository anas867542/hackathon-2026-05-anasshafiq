'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { DocumentUpload } from '@/components/upload/DocumentUpload';
import { TruckTypeSelector } from '@/components/booking/TruckTypeSelector';
import { driversApi } from '@/lib/api/drivers';
import { trucksApi } from '@/lib/api/trucks';
import { ApiError } from '@/lib/api/client';
import type { VehicleType } from '@/lib/api/bookings';

const STEPS = ['License', 'Vehicle', 'Documents'];

interface OnboardingState {
  // Step 1
  licenseNumber: string;
  licenseExpiry: string;
  cnicNumber: string;
  licenseDocUrl: string;
  // Step 2
  truckType: VehicleType | null;
  plateNumber: string;
  capacityKg: string;
  make: string;
  model: string;
  year: string;
  // Step 3
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
    if (step === 0) {
      return (
        data.licenseNumber.trim().length >= 3 &&
        data.licenseExpiry.length > 0 &&
        data.licenseDocUrl.length > 0
      );
    }
    if (step === 1) {
      return (
        data.truckType != null &&
        data.plateNumber.trim().length >= 3 &&
        Number(data.capacityKg) > 0
      );
    }
    if (step === 2) {
      return data.registrationDocUrl.length > 0 && data.insuranceDocUrl.length > 0;
    }
    return false;
  })();

  async function next() {
    setError(null);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (!data.truckType) return;
    setSubmitting(true);
    try {
      // 1. Create / update driver profile
      await driversApi.submitOnboarding({
        licenseNumber: data.licenseNumber.trim(),
        licenseExpiry: data.licenseExpiry,
        cnicNumber: data.cnicNumber.trim() || undefined,
        licenseDocUrl: data.licenseDocUrl,
      });
      // 2. Register the primary truck
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
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm text-zinc-500">Driver onboarding</p>
        <h1 className="text-2xl font-semibold tracking-tight">Get verified to take trips</h1>
      </header>

      <StepIndicator steps={STEPS} current={step} />

      <Card>
        {step === 0 && (
          <>
            <CardHeader>
              <CardTitle>Driver license</CardTitle>
              <CardDescription>
                We verify license details against your government records.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
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
            </CardBody>
          </>
        )}

        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Vehicle</CardTitle>
              <CardDescription>
                Pick the truck type — customers see this when matching.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-5">
              <TruckTypeSelector
                value={data.truckType}
                onChange={(v) => update('truckType', v)}
              />
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
            </CardBody>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Vehicle documents</CardTitle>
              <CardDescription>
                Upload registration and insurance papers. Our team verifies before you go online.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
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
            </CardBody>
          </>
        )}
      </Card>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>
        <Button onClick={next} disabled={!canProceed} isLoading={submitting}>
          {step < STEPS.length - 1 ? 'Continue' : 'Submit for verification'}
        </Button>
      </div>
    </div>
  );
}
