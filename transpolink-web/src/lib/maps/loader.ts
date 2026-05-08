'use client';

import { Libraries, useJsApiLoader } from '@react-google-maps/api';

const libraries: Libraries = ['places'];

/**
 * Loads the Google Maps JS API once for the whole app.
 * Same `id` everywhere prevents the "loaded with different parameters" warning.
 */
export function useGoogleMaps() {
  return useJsApiLoader({
    id: 'transpolink-google-map',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  });
}

export const DEFAULT_CENTER = { lat: 31.5204, lng: 74.3587 }; // Lahore
