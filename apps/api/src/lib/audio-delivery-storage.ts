import { createHash, createHmac, randomUUID } from "node:crypto";
import { HttpError } from "./errors";

export const AUDIO_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
] as const;

export const MAX_AUDIO_DELIVERY_BYTES = 25 * 1024 * 1024;
const STORAGE_SCHEME = "dublu-audio://";

type AudioType = { extension: string; contentType: string; valid: (bytes: Buffer) => boolean };
const AUDIO_TYPES: Record<string, AudioType> = {
  "audio/mpeg": {
    extension: "mp3",
    contentType: "audio/mpeg",
    valid: (b) => b.length >= 3 && (
      b.subarray(0, 3).toString("ascii") === "ID3" ||
      (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)
    ),
  },
  "audio/wav": {
    extension: "wav",
    contentType: "audio/wav",
    valid: (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WAVE",
  },
  "audio/x-wav": {
    extension: "wav",
    contentType: "audio/wav",
    valid: (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WAVE",
  },
  "audio/mp4": {
    extension: "m4a",
    contentType: "audio/mp4",
    valid: (b) => b.length >= 12 && b.subarray(4, 8).toString("ascii") === "ftyp",
  },
  "audio/aac": {
    extension: "aac",
    contentType: "audio/aac",
    valid: (b) => b.length >= 7 && b[0] === 0xff && (b[1] & 0xf6) === 0xf0,
  },
  "audio/ogg": {
    extension: "ogg",
    contentType: "audio/ogg",
    valid: (b) => b.length >= 4 && b.subarray(0, 4).toString("ascii") === "OggS",
  },
  "audio/flac": {
    extension: "flac",
    contentType: "audio/flac",
    valid: (b) => b.length >= 4 && b.subarray(0, 4).toString("ascii") === "fLaC",
  },
};

type StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function config(): StorageConfig {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  // Reuse the existing private S3-compatible account/bucket by default.
  // A separate audio bucket can be configured without changing credentials.
  const bucket = (process.env.AUDIO_STORAGE_BUCKET || process.env.KYC_STORAGE_BUCKET || "").trim();
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new HttpError(503, "AUDIO_STORAGE_NOT_CONFIGURED", "Private audio storage is not configured. Set AUDIO_STORAGE_BUCKET or reuse the configured KYC storage bucket.");
  }
  let parsed: URL;
  try { parsed = new URL(endpoint); } catch {
    throw new HttpError(503, "AUDIO_STORAGE_MISCONFIGURED", "Audio storage endpoint is invalid.");
  }
  if (parsed.protocol !== "https:" || parsed.search || parsed.hash) {
    throw new HttpError(503, "AUDIO_STORAGE_MISCONFIGURED", "Audio storage endpoint must be an HTTPS origin.");
  }
  return { endpoint: parsed.toString().replace(/\/$/, ""), region, accessKeyId, secretAccessKey, bucket };
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function objectUrl(cfg: StorageConfig, key: string): URL {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return new URL(`${cfg.endpoint}/${encodeURIComponent(cfg.bucket)}/${encodedKey}`);
}

async function signedRequest(method: "PUT" | "GET" | "DELETE", key: string, body?: Buffer, contentType?: string): Promise<Response> {
  const cfg = config();
  const url = objectUrl(cfg, key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");
  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((name) => `${name}:${headers[name].trim()}\n`).join("");
  const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const dateKey = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, cfg.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const requestHeaders: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    authorization,
  };
  if (contentType) requestHeaders["content-type"] = contentType;
  return fetch(url, {
    method,
    headers: requestHeaders,
    body: method === "PUT" && body ? new Uint8Array(body) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
}

export function validateAudioDelivery(bytes: Buffer, suppliedContentType: string): AudioType {
  const contentType = suppliedContentType.split(";")[0].trim().toLowerCase();
  const type = AUDIO_TYPES[contentType];
  if (!type) throw new HttpError(415, "UNSUPPORTED_AUDIO_TYPE", "Upload an MP3, WAV, M4A, AAC, OGG or FLAC audio file.");
  if (!Buffer.isBuffer(bytes) || bytes.length < 128 || bytes.length > MAX_AUDIO_DELIVERY_BYTES) {
    throw new HttpError(413, "AUDIO_FILE_SIZE_INVALID", "Audio delivery must be between 128 bytes and 25 MB.");
  }
  if (!type.valid(bytes)) throw new HttpError(400, "AUDIO_CONTENT_MISMATCH", "The audio file content does not match its declared file type.");
  return type;
}

function safeFileName(value: string, extension: string): string {
  const base = value.replace(/\\/g, "/").split("/").pop() || "audio-delivery";
  const safe = base.normalize("NFKC").replace(/[^a-zA-Z0-9._ -]/g, "").replace(/\.{2,}/g, ".").trim().slice(0, 100);
  const withoutExtension = safe.replace(/\.[^.]*$/, "").replace(/[. ]+$/, "") || "audio-delivery";
  return `${withoutExtension}.${extension}`;
}

export async function storeAudioDelivery(input: {
  bookingId: string;
  bytes: Buffer;
  contentType: string;
  fileName: string;
}): Promise<{ storageRef: string; fileName: string; mimeType: string; sizeBytes: number }> {
  if (!/^[a-f0-9-]{36}$/i.test(input.bookingId)) {
    throw new HttpError(400, "INVALID_BOOKING_ID", "Booking ID is invalid.");
  }
  const type = validateAudioDelivery(input.bytes, input.contentType);
  const fileName = safeFileName(input.fileName, type.extension);
  const key = `audio-deliveries/${input.bookingId}/${randomUUID()}.${type.extension}`;
  let response: Response;
  try {
    response = await signedRequest("PUT", key, input.bytes, type.contentType);
  } catch {
    throw new HttpError(503, "AUDIO_STORAGE_UNAVAILABLE", "Private audio storage is temporarily unavailable.");
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new HttpError(503, "AUDIO_STORAGE_UNAVAILABLE", "Private audio storage could not accept the file.");
  }
  return { storageRef: `${STORAGE_SCHEME}${key}`, fileName, mimeType: type.contentType, sizeBytes: input.bytes.length };
}

export async function readAudioDelivery(storageRef: string): Promise<Buffer> {
  if (!storageRef.startsWith(STORAGE_SCHEME)) throw new HttpError(404, "AUDIO_NOT_FOUND", "Audio deliverable not found.");
  const key = storageRef.slice(STORAGE_SCHEME.length);
  if (!/^audio-deliveries\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(key)) {
    throw new HttpError(404, "AUDIO_NOT_FOUND", "Audio deliverable not found.");
  }
  let response: Response;
  try { response = await signedRequest("GET", key); } catch {
    throw new HttpError(503, "AUDIO_STORAGE_UNAVAILABLE", "Private audio storage is temporarily unavailable.");
  }
  if (response.status === 404) throw new HttpError(404, "AUDIO_NOT_FOUND", "Audio deliverable not found.");
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new HttpError(503, "AUDIO_STORAGE_UNAVAILABLE", "Private audio storage could not retrieve the file.");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_AUDIO_DELIVERY_BYTES) {
    throw new HttpError(502, "AUDIO_FILE_INVALID", "Stored audio deliverable failed validation.");
  }
  return bytes;
}

export async function deleteAudioDelivery(storageRef: string): Promise<void> {
  if (!storageRef.startsWith(STORAGE_SCHEME)) return;
  const key = storageRef.slice(STORAGE_SCHEME.length);
  if (!/^audio-deliveries\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(key)) return;
  try {
    const response = await signedRequest("DELETE", key);
    await response.body?.cancel().catch(() => undefined);
  } catch {
    // The original request error is more useful; an orphan can be reconciled later.
  }
}
