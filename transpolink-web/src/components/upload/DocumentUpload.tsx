'use client';

import { ChangeEvent, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  hint?: string;
  value?: string | null;
  onChange: (url: string) => void;
  accept?: string;
  /**
   * Mock upload — generates a fake CDN URL after a simulated delay.
   * Real implementation would POST the file to /uploads (multipart) and use the returned URL.
   */
  uploadDelayMs?: number;
}

export function DocumentUpload({
  label,
  hint,
  value,
  onChange,
  accept = 'image/*,application/pdf',
  uploadDelayMs = 800,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10 MB).');
      return;
    }
    setError(null);
    setFileName(file.name);
    setUploading(true);

    await new Promise((r) => setTimeout(r, uploadDelayMs));

    const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase();
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const mockUrl = `https://mock.transpolink.dev/docs/${id}.${ext}`;

    setUploading(false);
    onChange(mockUrl);
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <label
        className={cn(
          'flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed p-4 transition',
          value
            ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400'
            : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400',
          uploading && 'pointer-events-none opacity-70',
        )}
      >
        <input
          type="file"
          className="sr-only"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">
            {value ? `✓ ${fileName ?? 'Document uploaded'}` : 'Click to upload'}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {value ? 'Tap again to replace' : 'PDF, JPG, PNG · max 10 MB · mock storage'}
          </p>
        </div>
        {uploading ? (
          <span
            aria-hidden
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"
          />
        ) : value ? (
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Uploaded
          </span>
        ) : (
          <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
            Choose file
          </span>
        )}
      </label>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}
