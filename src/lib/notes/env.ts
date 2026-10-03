/**
 * Dynamic env access so Next does not inline empty BLOB_* values at build time.
 * Prefer bracket access / runtime lookups over process.env.BLOB_READ_WRITE_TOKEN.
 */

const TOKEN_KEYS = [
  "BLOB_READ_WRITE_TOKEN",
  "AIV_NOTES_BLOB_READ_WRITE_TOKEN",
  // Vercel sometimes prefixes by store name when multiple Blob stores are linked
  "aiv_notes_blob_READ_WRITE_TOKEN",
] as const;

function env(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** True on Vercel builds/runtime (Hobby, Preview, Production). */
export function isVercelRuntime(): boolean {
  return Boolean(env("VERCEL") || env("VERCEL_ENV"));
}

/** Static read-write token, if any (checked under common aliases). */
export function readBlobReadWriteToken(): string | undefined {
  for (const key of TOKEN_KEYS) {
    const v = env(key);
    if (v) return v;
  }
  // Scan for *BLOB*READ_WRITE_TOKEN style keys without baking names at build
  for (const key of Object.keys(process.env)) {
    if (!/BLOB.*READ_WRITE_TOKEN/i.test(key)) continue;
    const v = env(key);
    if (v) return v;
  }
  return undefined;
}

/** OIDC pair used by @vercel/blob when running on a connected Vercel project. */
export function hasBlobOidcCredentials(): boolean {
  return Boolean(env("BLOB_STORE_ID") && env("VERCEL_OIDC_TOKEN"));
}

export function hasBlobCredentials(): boolean {
  return Boolean(readBlobReadWriteToken() || hasBlobOidcCredentials());
}

/**
 * Blob access mode. Private store must use 'private' (no public CDN URLs).
 * Override with BLOB_ACCESS=public|private; defaults to private on Vercel.
 */
export function blobAccessMode(): "private" | "public" {
  const raw = env("BLOB_ACCESS")?.toLowerCase();
  if (raw === "public") return "public";
  if (raw === "private") return "private";
  return "private";
}

/** Options to pass into @vercel/blob calls (token only when present). */
export function blobAuthOptions(): { token?: string } {
  const token = readBlobReadWriteToken();
  return token ? { token } : {};
}

export const BLOB_NOT_CONFIGURED_MESSAGE =
  "Note storage is not configured on this deployment. Set BLOB_READ_WRITE_TOKEN (or connect the private Blob store for OIDC) and redeploy.";
