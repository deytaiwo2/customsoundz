import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAudioDelivery, MAX_AUDIO_DELIVERY_BYTES, readAudioDelivery, storeAudioDelivery, validateAudioDelivery } from "../src/lib/audio-delivery-storage";

describe("private audio delivery validation", () => {
  it("accepts a correctly identified MP3 file", () => {
    const bytes = Buffer.alloc(256);
    bytes.write("ID3", 0, "ascii");
    expect(validateAudioDelivery(bytes, "audio/mpeg").extension).toBe("mp3");
  });

  it("accepts WAV files only when the RIFF/WAVE signature is present", () => {
    const bytes = Buffer.alloc(256);
    bytes.write("RIFF", 0, "ascii");
    bytes.write("WAVE", 8, "ascii");
    expect(validateAudioDelivery(bytes, "audio/wav").extension).toBe("wav");
  });

  it("rejects an audio MIME type that does not match the file signature", () => {
    const bytes = Buffer.alloc(256);
    expect(() => validateAudioDelivery(bytes, "audio/mpeg")).toThrow(/does not match/i);
  });

  it("rejects unsupported file types and files larger than the upload limit", () => {
    const bytes = Buffer.alloc(256);
    bytes.write("ID3", 0, "ascii");
    expect(() => validateAudioDelivery(bytes, "application/pdf")).toThrow(/MP3, WAV/i);
    expect(() => validateAudioDelivery(Buffer.alloc(MAX_AUDIO_DELIVERY_BYTES + 1), "audio/mpeg")).toThrow(/25 MB/i);
  });
});

describe("private audio object storage", () => {
  const keys = ["AWS_ENDPOINT_URL_S3", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AUDIO_STORAGE_BUCKET"];
  const original = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of keys) original.set(key, process.env[key]);
    process.env.AWS_ENDPOINT_URL_S3 = "https://objects.test.invalid";
    process.env.AWS_REGION = "eu-west-1";
    process.env.AWS_ACCESS_KEY_ID = "test-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.AUDIO_STORAGE_BUCKET = "dublu-ve-private-audio";
  });

  afterEach(() => {
    for (const key of keys) {
      const value = original.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
  });

  it("stores, retrieves and deletes files through authenticated private object requests", async () => {
    const audio = Buffer.alloc(256);
    audio.write("ID3", 0, "ascii");
    const fetched: Array<{ method: string; authorization: string; url: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET";
      const headers = new Headers(init?.headers);
      fetched.push({
        method,
        authorization: headers.get("authorization") || "",
        url: String(input),
      });
      return method === "GET"
        ? new Response(audio, { status: 200 })
        : new Response(null, { status: 200 });
    }));

    const stored = await storeAudioDelivery({
      bookingId: "11111111-1111-4111-8111-111111111111",
      bytes: audio,
      contentType: "audio/mpeg",
      fileName: "../Final Mix.mp3",
    });
    expect(stored.fileName).toBe("Final Mix.mp3");
    expect(stored.storageRef).toMatch(/^dublu-audio:\/\/audio-deliveries\//);
    expect(fetched[0].method).toBe("PUT");
    expect(fetched[0].authorization).toContain("AWS4-HMAC-SHA256");
    expect(fetched[0].url).toContain("dublu-ve-private-audio");

    const retrieved = await readAudioDelivery(stored.storageRef);
    expect(retrieved.equals(audio)).toBe(true);
    await deleteAudioDelivery(stored.storageRef);
    expect(fetched.map((entry) => entry.method)).toEqual(["PUT", "GET", "DELETE"]);
  });
});
