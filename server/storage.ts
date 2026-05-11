/**
 * Storage module — supports two backends:
 *
 *  1. S3 / Cloudflare R2 / Backblaze B2 (any S3-compatible service)
 *     Set: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *     Optional: S3_REGION (default "auto"), S3_ENDPOINT (for R2/B2),
 *               S3_PUBLIC_URL (CDN / custom domain for serving files)
 *
 *  2. Local-disk fallback (development / no S3 configured)
 *     Files saved to ./uploads/ and served at /uploads/<key>
 */

import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── S3 client (lazy-initialised once) ────────────────────────────────────────
let _s3: S3Client | null = null;

function getS3(): S3Client | null {
  if (_s3) return _s3;

  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT; // e.g. https://ACCOUNT.r2.cloudflarestorage.com

  _s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });

  return _s3;
}

function s3Bucket(): string {
  return process.env.S3_BUCKET!;
}

/** Build the public URL for a stored file */
function s3PublicUrl(key: string): string {
  const custom = process.env.S3_PUBLIC_URL?.replace(/\/+$/, "");
  if (custom) return `${custom}/${key}`;

  const endpoint = process.env.S3_ENDPOINT?.replace(/\/+$/, "");
  const bucket = s3Bucket();
  if (endpoint) return `${endpoint}/${bucket}/${key}`;

  const region = process.env.S3_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// ── Local-disk fallback ───────────────────────────────────────────────────────
/** Absolute path to local uploads directory */
export const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

async function localPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
): Promise<{ key: string; url: string }> {
  ensureUploadsDir();
  const filePath = path.join(LOCAL_UPLOADS_DIR, relKey.replace(/^\/+/, ""));
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(filePath, data as any);
  // URL served by express.static at /uploads/…
  const url = `/uploads/${relKey.replace(/^\/+/, "")}`;
  return { key: relKey, url };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a file. Tries S3 first; falls back to local disk.
 * Returns { key, url } where url is the public URL of the stored file.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const s3 = getS3();
  const key = relKey.replace(/^\/+/, "");

  if (s3) {
    // ── S3 path ──────────────────────────────────────────────────────────────
    const body = typeof data === "string" ? Buffer.from(data) : data;

    const isR2 = !!process.env.S3_ENDPOINT?.includes("r2.cloudflarestorage.com");

    await s3.send(
      new PutObjectCommand({
        Bucket: s3Bucket(),
        Key: key,
        Body: body as Buffer,
        ContentType: contentType,
        // ACL only supported on AWS S3 — R2 uses bucket-level public access
        ...(!isR2 && { ACL: "public-read" }),
      }),
    );

    return { key, url: s3PublicUrl(key) };
  }

  // ── Local-disk fallback ───────────────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[storage] ⚠️  S3 not configured (set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY). " +
      "Falling back to local disk — files will be lost on redeploy.",
    );
  }

  return localPut(key, data);
}

/**
 * Returns whether S3 is configured and ready.
 * Used by the health check endpoint.
 */
export function storageIsS3(): boolean {
  return !!getS3();
}
