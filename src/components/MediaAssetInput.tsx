import { useEffect, useMemo, useState } from 'react';
import type { DefaultMediaProvider, IntegrationDoc } from '../types/settings';
import {
  isValidHttpUrl,
  requestImageKitUploadAuth,
  uploadToCloudinary,
  uploadToImageKit,
} from '../services/mediaUpload';

type MediaSource = 'url' | 'cloudinary' | 'imagekit';

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  integrations: IntegrationDoc[];
  defaultProvider: DefaultMediaProvider;
  allowUrl: boolean;
  accept: string;
  disabled?: boolean;
};

/** Mini spinner para estado de subida */
function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin text-amber-600`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function MediaAssetInput({
  label,
  value,
  onChange,
  integrations,
  defaultProvider,
  allowUrl,
  accept,
  disabled,
}: Props) {
  const initialSource = useMemo((): MediaSource => {
    if (defaultProvider === 'cloudinary') return 'cloudinary';
    if (defaultProvider === 'imagekit') return 'imagekit';
    return 'url';
  }, [defaultProvider]);

  const [source, setSource] = useState<MediaSource>(initialSource);
  const [integrationId, setIntegrationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cloudinaryAccounts = useMemo(
    () => integrations.filter((i) => i.active && i.provider === 'cloudinary'),
    [integrations]
  );
  const imagekitAccounts = useMemo(
    () => integrations.filter((i) => i.active && i.provider === 'imagekit'),
    [integrations]
  );

  useEffect(() => {
    setSource(initialSource);
  }, [initialSource]);

  const activeList = source === 'cloudinary' ? cloudinaryAccounts : imagekitAccounts;

  useEffect(() => {
    if (source !== 'cloudinary' && source !== 'imagekit') return;
    const preferred = activeList.find((i) => i.isDefault)?.id || activeList[0]?.id || '';
    setIntegrationId(preferred);
  }, [source, activeList]);

  useEffect(() => {
    if (!allowUrl && source === 'url') {
      if (cloudinaryAccounts.length) setSource('cloudinary');
      else if (imagekitAccounts.length) setSource('imagekit');
    }
  }, [allowUrl, source, cloudinaryAccounts.length, imagekitAccounts.length]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || disabled || busy) return;
    setErr(null);
    setBusy(true);
    try {
      if (source === 'cloudinary') {
        const row = cloudinaryAccounts.find((i) => i.id === integrationId);
        if (!row?.cloudName?.trim() || !row.uploadPreset?.trim()) {
          throw new Error('Configura cloud name y upload preset en Configuraciones');
        }
        const url = await uploadToCloudinary(file, {
          cloudName: row.cloudName.trim(),
          uploadPreset: row.uploadPreset.trim(),
          folder: row.folder?.trim(),
        });
        onChange(url);
      } else if (source === 'imagekit') {
        const row = imagekitAccounts.find((i) => i.id === integrationId);
        if (!integrationId) throw new Error('Selecciona una cuenta ImageKit');
        if (!row?.publicKey?.trim() || !row.urlEndpoint?.trim()) {
          throw new Error('Configura nombre, public key y URL endpoint');
        }
        if (!row.hasPrivateKey) {
          throw new Error('Guarda la private key desde Configuraciones (Secret Manager)');
        }
        const auth = await requestImageKitUploadAuth(integrationId);
        const url = await uploadToImageKit(file, {
          folder: row.folder?.trim(),
          auth,
        });
        onChange(url);
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Error al subir');
    } finally {
      setBusy(false);
    }
  }

  const urlInvalid = source === 'url' && value.trim() !== '' && !isValidHttpUrl(value);
  const uploadDisabled = disabled || busy || (source !== 'url' && !integrationId);

  return (
    <div className="panel-card-muted space-y-2 p-3 transition hover:border-neutral-300 dark:hover:border-neutral-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          {label}
        </span>
        <select
          value={source}
          disabled={disabled}
          onChange={(e) => setSource(e.target.value as MediaSource)}
          className="panel-input py-1.5 text-xs"
        >
          {allowUrl ? <option value="url">URL directa</option> : null}
          <option value="cloudinary" disabled={!cloudinaryAccounts.length}>
            Cloudinary {!cloudinaryAccounts.length ? '(sin cuentas)' : ''}
          </option>
          <option value="imagekit" disabled={!imagekitAccounts.length}>
            ImageKit {!imagekitAccounts.length ? '(sin cuentas)' : ''}
          </option>
        </select>
      </div>

      {source === 'url' ? (
        <input
          type="url"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="panel-input w-full"
        />
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={integrationId}
            disabled={disabled || busy || !activeList.length}
            onChange={(e) => setIntegrationId(e.target.value)}
            className="panel-input flex-1 py-2 text-xs"
          >
            {activeList.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name || i.id}
                {i.isDefault ? ' (predeterminada)' : ''}
              </option>
            ))}
          </select>
          <label
            className={`panel-btn-secondary inline-flex min-h-[38px] min-w-[120px] cursor-pointer items-center justify-center gap-2 text-xs transition ${
              uploadDisabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <input
              type="file"
              accept={accept}
              className="hidden"
              disabled={uploadDisabled}
              onChange={onFileChange}
            />
            {busy ? (
              <>
                <Spinner /> Subiendo…
              </>
            ) : (
              'Elegir archivo'
            )}
          </label>
        </div>
      )}

      {value ? (
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-500" title={value}>
          URL guardada: {value}
        </p>
      ) : null}

      {urlInvalid ? <p className="text-xs text-red-600 dark:text-red-400">URL no válida</p> : null}
      {err ? <p className="text-xs text-red-600 dark:text-red-400">{err}</p> : null}
    </div>
  );
}
