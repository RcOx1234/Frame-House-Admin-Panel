import { useCallback, useEffect, useState } from 'react';
import {
  fetchGeneralSettings,
  listIntegrations,
  subscribeGeneralSettings,
} from '../services/settingsFirestore';
import { DEFAULT_PANEL_SETTINGS, type IntegrationDoc, type PanelGeneralSettings } from '../types/settings';

export function usePanelSettings(syncRemote: boolean) {
  const [general, setGeneral] = useState<PanelGeneralSettings>(DEFAULT_PANEL_SETTINGS);
  const [integrations, setIntegrations] = useState<IntegrationDoc[]>([]);
  const [loading, setLoading] = useState(syncRemote);

  const reloadIntegrations = useCallback(async () => {
    const list = await listIntegrations();
    setIntegrations(list);
  }, []);

  useEffect(() => {
    if (!syncRemote) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [g, ints] = await Promise.all([fetchGeneralSettings(), listIntegrations()]);
        if (!cancelled) {
          setGeneral(g);
          setIntegrations(ints);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const unsub = subscribeGeneralSettings((next) => {
      if (!cancelled) setGeneral(next);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [syncRemote]);

  return { general, integrations, loading, reloadIntegrations } as const;
}
