import { useCallback, useEffect, useState } from "react";
import {
  checkAccessibility,
  fetchAppSettings,
  patchAppSettings,
  requestAccessibilityPermission,
  type AppSettings,
} from "../lib/macosBridge";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [accessibilityTrusted, setAccessibilityTrusted] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [appSettings, accessibility] = await Promise.all([
        fetchAppSettings(),
        checkAccessibility(),
      ]);
      setSettings(appSettings);
      setAccessibilityTrusted(accessibility.trusted);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function markAccessibilityPrompted(): Promise<void> {
    const next = await patchAppSettings({ accessibilityPrompted: true });
    setSettings(next);
  }

  async function openAccessibilitySettings(): Promise<void> {
    await requestAccessibilityPermission();
  }

  return {
    settings,
    accessibilityTrusted,
    loading,
    refresh,
    markAccessibilityPrompted,
    openAccessibilitySettings,
  };
}
