'use client';

import { useEffect, useRef, useState } from 'react';
import { session } from '@/lib/auth/session';
import { cn } from '@/lib/utils';

export interface Place {
  address: string;
  lat:     number;
  lng:     number;
}

interface Props {
  label?:               string;
  value:                Place;
  onChange:             (place: Place) => void;
  placeholder?:         string;
  hint?:                string;
  showCurrentLocation?: boolean;
  loading?:             boolean;
  /** When true, renders a compact icon-only pill instead of full label/hint */
  compact?:             boolean;
  className?:           string;
}

const BASE_HISTORY_KEY = 'tl.placeHistory';
const MAX_HISTORY = 6;

function getHistoryKey(): string {
  const user = session.getUser();
  return user ? `${BASE_HISTORY_KEY}.${user.id}` : BASE_HISTORY_KEY;
}
function readHistory(): Place[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(getHistoryKey()) ?? '[]') as Place[]; }
  catch { return []; }
}
function pushHistory(place: Place) {
  const key  = getHistoryKey();
  const next = [place, ...readHistory().filter(h => h.address !== place.address)].slice(0, MAX_HISTORY);
  localStorage.setItem(key, JSON.stringify(next));
}

async function nominatimSearch(query: string): Promise<Place[]> {
  if (!query.trim() || query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=pk`;
  const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return [];
  const data = await res.json() as Array<{ display_name: string; lat: string; lon: string }>;
  return data.map((r) => ({ address: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }));
}

export async function nominatimReverse(lat: number, lng: number): Promise<Place> {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error();
    const data = await res.json() as { display_name?: string };
    return { address: data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  } catch {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  }
}

export function PlaceAutocompleteInput({
  label, value, onChange, placeholder, hint,
  showCurrentLocation = false, loading = false,
  compact = false, className,
}: Props) {
  const [text,      setText]      = useState(value.address);
  const [results,   setResults]   = useState<Place[]>([]);
  const [history,   setHistory]   = useState<Place[]>([]);
  const [showDrop,  setShowDrop]  = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating,  setLocating]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setText(value.address); }, [value.address]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setText(q);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.length < 3) {
      setResults([]);
      const h = readHistory();
      setHistory(h);
      setShowDrop(h.length > 0);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const found = await nominatimSearch(q);
      setResults(found);
      setHistory([]);
      setShowDrop(found.length > 0);
      setSearching(false);
    }, 400);
  }

  function handleFocus() {
    if (!text.trim()) {
      const h = readHistory();
      if (h.length) { setHistory(h); setResults([]); setShowDrop(true); }
    }
  }

  function selectPlace(place: Place) {
    setText(place.address);
    onChange(place);
    pushHistory(place);
    setShowDrop(false);
    setResults([]);
    setHistory([]);
  }

  function clearHistory() {
    localStorage.removeItem(getHistoryKey());
    setHistory([]);
    setShowDrop(false);
  }

  async function useMyLocation() {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const place = await nominatimReverse(pos.coords.latitude, pos.coords.longitude);
        setText(place.address);
        onChange(place);
        pushHistory(place);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === 1 ? 'Permission denied.'
          : err.code === 2 ? 'Could not determine location.'
          : 'Location request timed out.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const dropItems     = results.length > 0 ? results : history;
  const isHistoryMode = results.length === 0 && history.length > 0;

  const inputCls = compact
    ? 'w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none'
    : [
        'block w-full rounded-xl border border-gray-200 bg-white',
        'px-4 py-3 text-sm text-gray-900 placeholder-gray-400',
        'transition-all duration-150',
        'focus:border-brand-500 focus:ring-0 focus:shadow-input-focus focus:outline-none',
        (loading || searching) ? 'pr-10' : '',
      ].join(' ');

  return (
    <div className={cn('space-y-1', className)}>
      {/* Label + current-location button */}
      {!compact && (label || showCurrentLocation) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label className="block text-sm font-medium text-gray-700">{label}</label>
          )}
          {showCurrentLocation && (
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-brand-600 disabled:opacity-50 transition-colors"
            >
              {locating
                ? <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                : <span aria-hidden>📍</span>}
              {locating ? 'Locating…' : 'Use location'}
            </button>
          )}
        </div>
      )}

      {/* Input + dropdown */}
      <div className="relative">
        <div className="relative">
          <input
            value={text}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            placeholder={loading ? 'Detecting location…' : placeholder}
            disabled={loading}
            className={cn(inputCls, 'disabled:opacity-50')}
          />
          {(loading || searching) && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <span className="block size-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
            </span>
          )}
          {/* Current-location icon for compact mode */}
          {compact && showCurrentLocation && !loading && !searching && (
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-brand-600"
              aria-label="Use current location"
            >
              {locating
                ? <span className="size-3 block animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>}
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDrop && dropItems.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-floating animate-scale-in">
            {isHistoryMode && (
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Recent</span>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); clearHistory(); }}
                  className="text-[10px] text-gray-400 hover:text-brand-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
            {dropItems.map((item, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectPlace(item); }}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className="mt-0.5 shrink-0 text-sm text-gray-400">
                  {isHistoryMode ? '🕐' : '📍'}
                </span>
                <span className="line-clamp-2 text-gray-700 text-xs leading-relaxed">{item.address}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error
        ? <p className="text-xs text-red-500">{error}</p>
        : hint && !compact
        ? <p className="text-xs text-gray-400">{hint}</p>
        : null}
    </div>
  );
}
