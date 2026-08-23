import { useState, useCallback } from 'react';
import { getUsage } from '../api/client';
import type { UsageInfo } from '../types';

export function useUsage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getUsage();
      setUsage(data);
    } catch {
      // Silently fail — usage meter is non-critical
    }
  }, []);

  const applyUpdate = useCallback((updated: UsageInfo) => {
    setUsage(updated);
  }, []);

  return { usage, refresh, applyUpdate };
}
