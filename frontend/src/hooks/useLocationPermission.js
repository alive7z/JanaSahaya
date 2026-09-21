import { useCallback, useEffect, useRef, useState } from 'react';
import { getUserLocation } from '../utils/geo';

/**
 * Manages the browser geolocation consent flow. Returns a state machine:
 *   status: 'idle' | 'locating' | 'granted' | 'denied' | 'skipped'
 *   coords: { latitude, longitude } | null   (only meaningful when granted)
 *   error:  short error code (geo.js codes) | null
 *   request(): call to ask the browser for permission (returns the outcome)
 *   skip():   user chose "Continue without location" — status becomes 'skipped'
 *
 * 'denied' vs 'skipped' are distinct so the UI can offer different CTA text
 * (e.g. "Change it in System Settings" vs "You can pin it on the map later").
 * This hook never stores coordinates — callers own where they go.
 */
export function useLocationPermission() {
  const [state, setState] = useState({
    status: 'idle',
    coords: null,
    error: null,
  });
  const active = useRef(false);

  const request = useCallback(async () => {
    if (active.current) return state;
    active.current = true;
    setState((s) => ({ ...s, status: 'locating', error: null }));
    const res = await getUserLocation();
    active.current = false;

    if (res?.ok) {
      const outcome = { status: 'granted', coords: res, error: null };
      setState(outcome);
      return outcome;
    } else {
      const outcome = { status: 'denied', coords: null, error: res?.error || 'position-unavailable' };
      setState(outcome);
      return outcome;
    }
  }, [state]);

  const skip = useCallback(() => {
    setState({ status: 'skipped', coords: null, error: null });
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', coords: null, error: null });
  }, []);

  useEffect(() => () => { active.current = false; }, []);

  return { ...state, request, skip, reset };
}
