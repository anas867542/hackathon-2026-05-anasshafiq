'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { reviewsApi } from '@/lib/api/reviews';
import { ApiError } from '@/lib/api/client';

interface Props {
  bookingId:    string;
  revieweeName: string;
  onDone:       () => void;
}

export function RatingModal({ bookingId, revieweeName, onDone }: Props) {
  const [hovered,   setHovered]   = useState(0);
  const [selected,  setSelected]  = useState(0);
  const [comment,   setComment]   = useState('');
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [done,      setDone]      = useState(false);

  const display = hovered || selected;
  const labels  = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  async function submit() {
    if (!selected) { setError('Please choose a star rating.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await reviewsApi.submit({ bookingId, score: selected, comment: comment.trim() || undefined });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 border border-gray-100 shadow-floating animate-scale-in">
        {done ? (
          <div className="space-y-4 text-center py-4">
            <div className="text-5xl">⭐</div>
            <p className="text-lg font-bold text-gray-900">Thanks for your review!</p>
            <p className="text-sm text-gray-500">Your feedback helps improve the platform.</p>
            <Button variant="brand" className="w-full" onClick={onDone}>Done</Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rate your trip</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{revieweeName}</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-1" onMouseLeave={() => setHovered(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHovered(star)}
                  onClick={() => setSelected(star)}
                  className="text-4xl transition-transform hover:scale-110 focus:outline-none active:scale-95"
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                  <span className={display >= star ? 'text-amber-400' : 'text-gray-200'}>★</span>
                </button>
              ))}
            </div>

            <p className="min-h-[1.25rem] text-center text-sm font-semibold text-gray-600">
              {display > 0 ? labels[display] : ''}
            </p>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Comment <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about your experience…"
                className="block w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-0 focus:shadow-input-focus focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onDone} disabled={submitting}>
                Skip
              </Button>
              <Button variant="brand" className="flex-1" onClick={submit} isLoading={submitting}>
                Submit
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
