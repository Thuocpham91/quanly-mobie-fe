import { useState, useEffect } from 'react';

export const DEFAULT_INTERFACE_SCALE = 1;
export const MIN_INTERFACE_SCALE = 0.8;
export const MAX_INTERFACE_SCALE = 1.4;

export interface ScalePreset {
  label: string;
  value: number;
  description: string;
}

export const INTERFACE_SCALE_PRESETS: ScalePreset[] = [
  { label: '85%', value: 0.85, description: 'Gọn gàng' },
  { label: '100%', value: 1.0, description: 'Chuẩn (Mặc định)' },
  { label: '115%', value: 1.15, description: 'Vừa' },
  { label: '125%', value: 1.25, description: 'To (Dễ nhìn)' },
  { label: '135%', value: 1.35, description: 'Rất to' },
];

export const clampInterfaceScale = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_INTERFACE_SCALE;
  const clamped = Math.min(MAX_INTERFACE_SCALE, Math.max(MIN_INTERFACE_SCALE, Number(value)));
  return Number(clamped.toFixed(2));
};

export const getCurrentUserKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.id) return `user_${user.id}`;
      if (user?.email) return `user_${user.email}`;
    }
  } catch {
    return null;
  }
  return null;
};

export const getStoredInterfaceScale = (userKey?: string | null): number => {
  if (typeof window === 'undefined') return DEFAULT_INTERFACE_SCALE;
  const key = userKey !== undefined ? userKey : getCurrentUserKey();
  let rawValue: string | null = null;
  if (key) {
    rawValue = localStorage.getItem(`interface_scale_${key}`);
  }
  if (!rawValue) {
    rawValue = localStorage.getItem('interface_scale');
  }
  return clampInterfaceScale(Number(rawValue ?? DEFAULT_INTERFACE_SCALE));
};

export const applyInterfaceScale = (value: number, userKey?: string | null): number => {
  const scale = clampInterfaceScale(value);
  if (typeof document === 'undefined') return scale;

  document.documentElement.style.setProperty('--interface-scale', String(scale));
  document.body.style.zoom = String(scale);

  const key = userKey !== undefined ? userKey : getCurrentUserKey();
  if (key) {
    localStorage.setItem(`interface_scale_${key}`, String(scale));
  }
  localStorage.setItem('interface_scale', String(scale));

  window.dispatchEvent(new CustomEvent('interface-scale-change', { detail: { scale, key } }));
  return scale;
};

/**
 * React hook to read and change interface scale with reactive updates across components
 */
export const useInterfaceScale = () => {
  const [scale, setScale] = useState<number>(() => getStoredInterfaceScale());

  useEffect(() => {
    const handleScaleChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ scale: number }>;
      if (customEvent.detail?.scale) {
        setScale(customEvent.detail.scale);
      }
    };
    window.addEventListener('interface-scale-change', handleScaleChange);
    return () => window.removeEventListener('interface-scale-change', handleScaleChange);
  }, []);

  const changeScale = (newScale: number) => {
    const applied = applyInterfaceScale(newScale);
    setScale(applied);
  };

  return { scale, changeScale, presets: INTERFACE_SCALE_PRESETS };
};
