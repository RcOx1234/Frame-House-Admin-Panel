import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useLockBodyScrollMobile } from '../hooks/useLockBodyScrollMobile';
import {
  deleteIntegration,
  fetchGeneralSettings,
  listIntegrations,
  saveGeneralSettings,
  upsertIntegration,
} from '../services/settingsFirestore';
import {
  saveImageKitPrivateKeyRemote,
  deleteImageKitPrivateKeyRemote,
  verifyImageKitConnection,
} from '../services/mediaUpload';
import { useTheme } from '../context/ThemeContext';
import {
  DEFAULT_PANEL_SETTINGS,
  type DefaultMediaProvider,
  type IntegrationDoc,
  type IntegrationProvider,
  type IntegrationWritePayload,
  type PanelGeneralSettings,
  type PanelTheme,
} from '../types/settings';

function enforceSingleDefault(rows: IntegrationDoc[]): IntegrationDoc[] {
  const act = rows.filter((r) => r.active);
  const defaults = act.filter((r) => r.isDefault);
  if (defaults.length <= 1) return rows;
  const keep = defaults[0]?.id;
  return rows.map((r) => ({ ...r, isDefault: r.active && r.id === keep }));
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin text-muted dark:text-muted`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function buildImageKitSecretName(integrationId: string) {
  return `IMAGEKIT_PRIVATE_KEY_${integrationId}`.replace(/-/g, '_').toUpperCase();
}

type IntegrationEditModalProps = {
  row: IntegrationDoc;
  persistedToFirestore: boolean;
  onClose: () => void;
  onRemove: () => void;
  patchIntegration: (id: string, patch: Partial<IntegrationDoc>) => void;
  useAsDefault: (id: string) => void;
  savePrivateKeyFor: (id: string) => Promise<void>;
  deletePrivateKeyFor: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<void>;
  privateKeyDraft: Record<string, string>;
  setPrivateKeyDraft: Dispatch<SetStateAction<Record<string, string>>>;
  privateKeySavingId: string | null;
  privateKeyDeletingId: string | null;
  privateKeyEditingId: string | null;
  setPrivateKeyEditingId: (id: string | null) => void;
  testBusyId: string | null;
  testOkId: string | null;
};

function IntegrationEditModal({
  row,
  persistedToFirestore,
  onClose,
  onRemove,
  patchIntegration,
  useAsDefault,
  savePrivateKeyFor,
  deletePrivateKeyFor,
  testConnection,
  privateKeyDraft,
  setPrivateKeyDraft,
  privateKeySavingId,
  privateKeyDeletingId,
  privateKeyEditingId,
  setPrivateKeyEditingId,
  testBusyId,
  testOkId,
}: IntegrationEditModalProps) {
  useLockBodyScrollMobile(true);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const id = row.id;

  return (
    <div
      className="panel-modal-overlay z-[65]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`integration-edit-title-${id}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel-modal-panel flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 dark:border-line">
          <div className="min-w-0">
            <p id={`integration-edit-title-${id}`} className="text-base font-semibold text-ink dark:text-ink">
              Editar integración
            </p>
            <p className="mt-1 truncate text-sm text-muted dark:text-muted">
              {row.name || (row.provider === 'cloudinary' ? 'Cloudinary' : 'ImageKit')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="panel-btn-secondary shrink-0 py-1.5 text-xs">
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          <input
            value={row.name}
            onChange={(e) => patchIntegration(id, { name: e.target.value })}
            placeholder="Nombre"
            className="panel-input w-full font-medium"
          />

          <label className="inline-flex items-center gap-2 text-xs text-muted dark:text-muted">
            <input
              type="checkbox"
              checked={row.active}
              onChange={(e) => patchIntegration(id, { active: e.target.checked })}
            />
            Integración activa
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!row.active}
              onClick={() => useAsDefault(id)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-canvas disabled:opacity-40 dark:border-line dark:bg-surface dark:hover:bg-line"
            >
              Usar como predeterminada
            </button>
            {row.provider === 'imagekit' ? (
              <button
                type="button"
                disabled={testBusyId === id || !row.active || !row.hasPrivateKey || !persistedToFirestore}
                onClick={() => void testConnection(id)}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium transition hover:bg-canvas disabled:opacity-40 dark:border-line dark:bg-surface dark:hover:bg-line"
              >
                {testBusyId === id ? (
                  <>
                    <Spinner className="h-3 w-3" /> Probando…
                  </>
                ) : (
                  'Probar conexión'
                )}
              </button>
            ) : null}
            {row.provider === 'imagekit' ? <p className="w-full text-xs text-muted">Claves del mismo par · ImageKit → Developer options → API keys · Media Read and write. La prueba verifica la clave privada y la lectura; una subida confirma la firma y la escritura.</p> : null}
            {testOkId === id ? (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Clave y lectura verificadas</span>
            ) : null}
          </div>

          {row.provider === 'cloudinary' ? (
            <div className="grid gap-2">
              <input
                value={row.cloudName || ''}
                onChange={(e) => patchIntegration(id, { cloudName: e.target.value })}
                placeholder="Cloud name"
                className="panel-input text-sm"
              />
              <input
                value={row.uploadPreset || ''}
                onChange={(e) => patchIntegration(id, { uploadPreset: e.target.value })}
                placeholder="Upload preset (unsigned)"
                className="panel-input text-sm"
              />
              <input
                value={row.folder || ''}
                onChange={(e) => patchIntegration(id, { folder: e.target.value })}
                placeholder="Carpeta opcional"
                className="panel-input text-sm"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                value={row.publicKey || ''}
                onChange={(e) => patchIntegration(id, { publicKey: e.target.value })}
                placeholder="Public key"
                className="panel-input text-sm"
              />
              <input
                value={row.urlEndpoint || ''}
                onChange={(e) => patchIntegration(id, { urlEndpoint: e.target.value })}
                placeholder="URL endpoint"
                className="panel-input text-sm"
              />
              <input
                value={row.folder || ''}
                onChange={(e) => patchIntegration(id, { folder: e.target.value })}
                placeholder="Carpeta opcional"
                className="panel-input text-sm"
              />
              <div className="rounded-xl border border-dashed border-line bg-[#f7f4ed]/80 p-3 dark:border-line dark:bg-surface/50">
                {!persistedToFirestore ? (
                  <p className="mb-2 text-xs text-brand dark:text-brand">
                    Pulsa <strong>Guardar cambios</strong> en Configuraciones para persistir esta integración y poder guardar la
                    private key.
                  </p>
                ) : null}
                <p className="mb-2 text-[11px] uppercase tracking-wide text-muted dark:text-muted">
                  Private key (no se muestra)
                </p>
                <p className="mb-2 font-mono text-[10px] text-muted break-all opacity-90 dark:text-muted">
                  Secret: {buildImageKitSecretName(id)}
                </p>
                {row.hasPrivateKey && privateKeyEditingId !== id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      disabled={!persistedToFirestore}
                      onClick={() => setPrivateKeyEditingId(id)}
                      className="panel-btn-secondary w-full text-xs sm:w-auto"
                    >
                      Reemplazar key
                    </button>
                    <button
                      type="button"
                      disabled={privateKeyDeletingId === id || !persistedToFirestore}
                      onClick={() => void deletePrivateKeyFor(id)}
                      className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/45 sm:w-auto"
                    >
                      {privateKeyDeletingId === id ? 'Eliminando…' : 'Eliminar key'}
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={privateKeyDraft[id] ?? ''}
                      onChange={(e) => setPrivateKeyDraft((d) => ({ ...d, [id]: e.target.value }))}
                      placeholder={row.hasPrivateKey ? 'Pegar nueva private key…' : 'Pegar private key…'}
                      className="panel-input mb-2 w-full text-sm"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      {row.hasPrivateKey ? (
                        <button
                          type="button"
                          disabled={privateKeySavingId === id}
                          onClick={() => setPrivateKeyEditingId(null)}
                          className="panel-btn-secondary w-full text-xs sm:w-auto"
                        >
                          Cancelar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={privateKeySavingId === id || !persistedToFirestore}
                        onClick={() => void savePrivateKeyFor(id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-surface py-2 text-xs font-semibold text-[#fdfcfa] transition hover:bg-muted disabled:opacity-50 dark:bg-canvas dark:text-muted dark:hover:bg-surface sm:w-auto sm:px-4"
                      >
                        {privateKeySavingId === id ? (
                          <>
                            <Spinner className="h-3.5 w-3.5 text-[#fdfcfa] dark:text-muted" /> Guardando…
                          </>
                        ) : row.hasPrivateKey ? (
                          'Guardar reemplazo'
                        ) : (
                          'Guardar private key'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 dark:border-line">
          <button
            type="button"
            className="text-xs text-red-600 opacity-90 transition hover:opacity-100 dark:text-red-400"
            onClick={() => {
              const ok = window.confirm('¿Quitar esta integración de la lista? Recuerda guardar cambios abajo.');
              if (!ok) return;
              onRemove();
              onClose();
            }}
          >
            Quitar integración
          </button>
          <p className="max-w-[200px] text-[10px] text-muted dark:text-muted">ID: {id}</p>
        </div>
      </div>
    </div>
  );
}

type Props = {
  reloadSignal?: number;
};

function toPayload(row: IntegrationDoc): IntegrationWritePayload {
  return {
    provider: row.provider,
    name: row.name,
    active: row.active,
    isDefault: row.isDefault,
    publicKey: row.publicKey,
    urlEndpoint: row.urlEndpoint,
    cloudName: row.cloudName,
    uploadPreset: row.uploadPreset,
    folder: row.folder,
  };
}

export function ConfiguracionesSection({ reloadSignal = 0 }: Props) {
  const { setTheme } = useTheme();
  const [draft, setDraft] = useState<PanelGeneralSettings>(DEFAULT_PANEL_SETTINGS);
  const [integrations, setIntegrations] = useState<IntegrationDoc[]>([]);
  const [loadedIds, setLoadedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [privateKeyDraft, setPrivateKeyDraft] = useState<Record<string, string>>({});
  const [privateKeySavingId, setPrivateKeySavingId] = useState<string | null>(null);
  const [privateKeyEditingId, setPrivateKeyEditingId] = useState<string | null>(null);
  const [privateKeyDeletingId, setPrivateKeyDeletingId] = useState<string | null>(null);
  const [testBusyId, setTestBusyId] = useState<string | null>(null);
  const [testOkId, setTestOkId] = useState<string | null>(null);

  const [detailIntegrationId, setDetailIntegrationId] = useState<string | null>(null);
  const [newIntegrationMenuOpen, setNewIntegrationMenuOpen] = useState(false);
  const newIntegrationMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newIntegrationMenuOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (
        newIntegrationMenuRef.current &&
        !newIntegrationMenuRef.current.contains(e.target as Node)
      ) {
        setNewIntegrationMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [newIntegrationMenuOpen]);

  const detailRow = useMemo(
    () => (detailIntegrationId ? integrations.find((i) => i.id === detailIntegrationId) ?? null : null),
    [detailIntegrationId, integrations]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, ints] = await Promise.all([fetchGeneralSettings(), listIntegrations()]);
      setDraft(g);
      setIntegrations(ints);
      setLoadedIds(ints.map((i) => i.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las configuraciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadSignal]);

  function patchDraft(partial: Partial<PanelGeneralSettings>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function onThemePick(next: PanelTheme) {
    patchDraft({ theme: next });
    setTheme(next);
  }

  function addIntegration(provider: IntegrationProvider) {
    const id = crypto.randomUUID();
    setIntegrations((prev) => [
      ...prev,
      {
        id,
        provider,
        name: provider === 'cloudinary' ? 'Cloudinary' : 'ImageKit',
        active: true,
        isDefault: prev.filter((p) => p.active && p.provider === provider).length === 0,
        cloudName: provider === 'cloudinary' ? '' : undefined,
        uploadPreset: provider === 'cloudinary' ? '' : undefined,
        publicKey: provider === 'imagekit' ? '' : undefined,
        urlEndpoint: provider === 'imagekit' ? '' : undefined,
        folder: '',
        hasPrivateKey: false,
      },
    ]);
  }

  function patchIntegration(id: string, patch: Partial<IntegrationDoc>) {
    setIntegrations((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeIntegrationLocal(id: string) {
    setIntegrations((prev) => prev.filter((x) => x.id !== id));
    setPrivateKeyDraft((d) => {
      const n = { ...d };
      delete n[id];
      return n;
    });
  }

  function useAsDefault(id: string) {
    setIntegrations((prev) =>
      prev.map((row) => ({
        ...row,
        isDefault: row.id === id,
      }))
    );
  }

  async function savePrivateKeyFor(integrationId: string) {
    const key = (privateKeyDraft[integrationId] || '').trim();
    if (!key) {
      setError('Pega la private key antes de guardar');
      return;
    }
    setPrivateKeySavingId(integrationId);
    setError(null);
    setFeedback(null);
    try {
      await saveImageKitPrivateKeyRemote(integrationId, key);
      setPrivateKeyDraft((d) => ({ ...d, [integrationId]: '' }));
      patchIntegration(integrationId, { hasPrivateKey: true });
      setPrivateKeyEditingId((x) => (x === integrationId ? null : x));
      setFeedback('Private key guardada en Secret Manager');
      window.setTimeout(() => setFeedback(null), 2800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la private key');
    } finally {
      setPrivateKeySavingId(null);
    }
  }

  async function deletePrivateKeyFor(integrationId: string) {
    const ok = window.confirm('¿Eliminar la private key actual? Esto puede romper subidas a ImageKit hasta reemplazarla.');
    if (!ok) return;
    setPrivateKeyDeletingId(integrationId);
    setError(null);
    setFeedback(null);
    try {
      await deleteImageKitPrivateKeyRemote(integrationId);
      patchIntegration(integrationId, { hasPrivateKey: false });
      setPrivateKeyDraft((d) => ({ ...d, [integrationId]: '' }));
      setPrivateKeyEditingId((x) => (x === integrationId ? null : x));
      setFeedback('Private key eliminada');
      window.setTimeout(() => setFeedback(null), 2800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la private key');
    } finally {
      setPrivateKeyDeletingId(null);
    }
  }

  async function testConnection(integrationId: string) {
    const row = integrations.find((i) => i.id === integrationId);
    if (!row || row.provider !== 'imagekit') return;
    setTestBusyId(integrationId);
    setTestOkId(null);
    setError(null);
    try {
      await verifyImageKitConnection(integrationId);
      setTestOkId(integrationId);
      window.setTimeout(() => setTestOkId((x) => (x === integrationId ? null : x)), 3200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prueba de conexión fallida');
    } finally {
      setTestBusyId(null);
    }
  }

  const canSave = useMemo(() => !loading && !saving, [loading, saving]);

  async function onSave() {
    if (!canSave) return;
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      let normalizedInts = enforceSingleDefault(integrations);
      const activeRows = normalizedInts.filter((r) => r.active);
      if (activeRows.length && !activeRows.some((r) => r.isDefault)) {
        const pick = activeRows[0].id;
        normalizedInts = normalizedInts.map((row) => ({
          ...row,
          isDefault: row.id === pick,
        }));
      }
      setIntegrations(normalizedInts);

      await saveGeneralSettings({
        theme: draft.theme,
        defaultMediaProvider: draft.defaultMediaProvider,
        useSeparateGalleryImages: draft.useSeparateGalleryImages,
        useVideoPreview: draft.useVideoPreview,
        allowUrlUpload: draft.allowUrlUpload,
      });
      setTheme(draft.theme);

      const nextIds = new Set(normalizedInts.map((i) => i.id));
      for (const oldId of loadedIds) {
        if (!nextIds.has(oldId)) await deleteIntegration(oldId);
      }
      for (const row of normalizedInts) {
        await upsertIntegration(row.id, toPayload(row));
      }
      setLoadedIds(normalizedInts.map((i) => i.id));

      await load();

      setFeedback('Cambios guardados correctamente');
      window.setTimeout(() => setFeedback(null), 3200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="panel-card-muted flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted dark:text-muted">
        <Spinner className="h-5 w-5" /> Cargando configuración…
      </div>
    );
  }

  return (
    <section className="space-y-6 opacity-100 transition-opacity duration-300">
      <div className="panel-card space-y-8 p-5 md:p-8">
        <header>
          <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-ink">
            Configuraciones del panel
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted dark:text-muted">
            Tema, integraciones multimedia y políticas de la galería. Cada cuenta ImageKit usa su propio secreto{' '}
            <code className="rounded-md bg-line/90 px-1.5 py-0.5 text-xs text-ink dark:bg-line dark:text-ink">
              IMAGEKIT_PRIVATE_KEY_&lt;id-normalizado&gt;
            </code>{' '}
            en Google Secret Manager (el panel puede crearlo con “Guardar private key”; la función necesita rol Secret
            Manager en el proyecto).
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="panel-card-muted space-y-3 rounded-2xl p-4">
            <h3 className="panel-label mb-0">Apariencia</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onThemePick('light')}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition duration-200 hover:bg-canvas/80 active:scale-[0.99] dark:hover:bg-surface ${
                  draft.theme === 'light'
                    ? 'border-line bg-surface text-ink shadow-sm dark:border-line dark:bg-surface dark:text-ink'
                    : 'panel-btn-secondary'
                }`}
              >
                Claro
              </button>
              <button
                type="button"
                onClick={() => onThemePick('dark')}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition duration-200 hover:bg-canvas/80 active:scale-[0.99] dark:hover:bg-surface ${
                  draft.theme === 'dark'
                    ? 'border-line bg-surface text-ink shadow-sm dark:border-line dark:bg-surface dark:text-ink'
                    : 'panel-btn-secondary'
                }`}
              >
                Oscuro
              </button>
            </div>
          </div>

          <div className="panel-card-muted space-y-3 rounded-2xl p-4">
            <h3 className="panel-label mb-0">Proveedor de media predeterminado</h3>
            <select
              value={draft.defaultMediaProvider}
              onChange={(e) => patchDraft({ defaultMediaProvider: e.target.value as DefaultMediaProvider })}
              className="panel-input w-full"
            >
              <option value="url">URL directa</option>
              <option value="cloudinary">Cloudinary</option>
              <option value="imagekit">ImageKit</option>
            </select>
            <p className="text-xs text-muted dark:text-muted">
              Se usa como default en inputs de subida cuando no eliges proveedor manualmente.
            </p>
          </div>
        </section>

        <section className="panel-card-muted space-y-3 rounded-2xl p-4">
          <h3 className="panel-label mb-0">Preferencias del panel</h3>
          <div className="grid gap-2 text-sm text-ink dark:text-ink sm:grid-cols-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.useSeparateGalleryImages}
                onChange={(e) => patchDraft({ useSeparateGalleryImages: e.target.checked })}
              />
              Imagen separada para miniatura y vista grande (web)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.useVideoPreview}
                onChange={(e) => patchDraft({ useVideoPreview: e.target.checked })}
              />
              Video embebido en detalle si existe
            </label>
            <label className="inline-flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.allowUrlUpload}
                onChange={(e) => patchDraft({ allowUrlUpload: e.target.checked })}
              />
              Permitir URL directa en formularios
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="panel-label mb-0">Integraciones</h3>
            <div className="relative" ref={newIntegrationMenuRef}>
              <button
                type="button"
                className="panel-btn-secondary text-xs"
                aria-expanded={newIntegrationMenuOpen}
                aria-haspopup="menu"
                onClick={() => setNewIntegrationMenuOpen((o) => !o)}
              >
                Nueva integración
              </button>
              {newIntegrationMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-line bg-[#fdfcfa] py-1 text-sm shadow-lg dark:border-line dark:bg-canvas"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-2.5 text-left text-ink transition hover:bg-canvas dark:text-ink dark:hover:bg-line"
                    onClick={() => {
                      addIntegration('cloudinary');
                      setNewIntegrationMenuOpen(false);
                    }}
                  >
                    Cloudinary
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-2.5 text-left text-ink transition hover:bg-canvas dark:text-ink dark:hover:bg-line"
                    onClick={() => {
                      addIntegration('imagekit');
                      setNewIntegrationMenuOpen(false);
                    }}
                  >
                    ImageKit
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {!integrations.length ? (
            <p className="text-sm text-muted dark:text-muted">
              Añade al menos una cuenta. Cloudinary: preset sin firma (unsigned). ImageKit: secreto por ID de integración,
              configurado desde aquí o con la CLI.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {integrations.map((row) => {
              const persistedToFirestore = loadedIds.includes(row.id);
              const summary =
                row.provider === 'cloudinary'
                  ? [row.cloudName, row.uploadPreset].filter(Boolean).join(' · ') || 'Sin cloud name'
                  : [row.publicKey?.slice(0, 12), row.urlEndpoint?.replace(/^https?:\/\//, '').slice(0, 28)]
                      .filter(Boolean)
                      .join(' · ') || 'Sin datos públicos';
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-line/90 bg-surface p-3 shadow-sm transition hover:border-line dark:border-line dark:bg-canvas/50 dark:hover:border-line"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink dark:text-ink">
                        {row.name || (row.provider === 'cloudinary' ? 'Cloudinary' : 'ImageKit')}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted dark:text-muted" title={summary}>
                        {summary}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-line/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink dark:bg-line dark:text-ink">
                          {row.provider === 'cloudinary' ? 'CL' : 'IK'}
                        </span>
                        {row.isDefault ? (
                          <span className="rounded-md border border-line/80 px-1.5 py-0.5 text-[10px] text-muted dark:border-line dark:text-muted">
                            Predeterminada
                          </span>
                        ) : null}
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            row.active
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                              : 'bg-line text-muted dark:bg-line dark:text-muted'
                          }`}
                        >
                          {row.active ? 'Activa' : 'Inactiva'}
                        </span>
                        {row.provider === 'imagekit' ? (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                              row.hasPrivateKey
                                ? 'bg-line/80 text-ink dark:bg-line dark:text-ink'
                                : 'bg-brandsoft/80 text-brand dark:bg-brandsoft/40 dark:text-brand'
                            }`}
                          >
                            {row.hasPrivateKey ? 'Key OK' : 'Sin key'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="panel-btn-secondary w-full py-2 text-xs"
                    onClick={() => setDetailIntegrationId(row.id)}
                  >
                    Ver detalles y editar
                  </button>
                  {!persistedToFirestore ? (
                    <p className="text-[10px] leading-snug text-brand dark:text-brand/90">
                      Borrador · pulsa Guardar cambios para persistir.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {detailRow ? (
          <IntegrationEditModal
            row={detailRow}
            persistedToFirestore={loadedIds.includes(detailRow.id)}
            onClose={() => setDetailIntegrationId(null)}
            onRemove={() => removeIntegrationLocal(detailRow.id)}
            patchIntegration={patchIntegration}
            useAsDefault={useAsDefault}
            savePrivateKeyFor={savePrivateKeyFor}
            deletePrivateKeyFor={deletePrivateKeyFor}
            testConnection={testConnection}
            privateKeyDraft={privateKeyDraft}
            setPrivateKeyDraft={setPrivateKeyDraft}
            privateKeySavingId={privateKeySavingId}
            privateKeyDeletingId={privateKeyDeletingId}
            privateKeyEditingId={privateKeyEditingId}
            setPrivateKeyEditingId={setPrivateKeyEditingId}
            testBusyId={testBusyId}
            testOkId={testOkId}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-line/90 pt-6 dark:border-line">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void onSave()}
            className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Spinner className="h-4 w-4 text-muted" /> Guardando…
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
          {feedback ? <span className="text-sm text-emerald-700 dark:text-emerald-400">{feedback}</span> : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}
