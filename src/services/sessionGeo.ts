export type GeoMeta = { country: string; city: string };
const fallback: GeoMeta = { country: 'Desconocido', city: 'Desconocido' };
let cached: { value: GeoMeta; expires: number } | undefined;
let pending: Promise<GeoMeta> | undefined;

/** Optional display metadata only; never used to decide authentication or access. */
export function getGeoMeta(): Promise<GeoMeta> {
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.value);
  if (pending) return pending;
  pending = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      if (!res.ok) return fallback;
      const data = await res.json() as { country_name?: unknown; city?: unknown };
      return {
        country: typeof data.country_name === 'string' && data.country_name.trim() ? data.country_name : fallback.country,
        city: typeof data.city === 'string' && data.city.trim() ? data.city : fallback.city,
      };
    } catch { return fallback; }
    finally { window.clearTimeout(timeout); }
  })().then(value => {
    cached = { value, expires: Date.now() + (value.country === fallback.country ? 60_000 : 30 * 60_000) };
    pending = undefined;
    return value;
  });
  return pending;
}
