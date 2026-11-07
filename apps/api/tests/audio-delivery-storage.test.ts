import { describe, expect, it } from "vitest";
import { MAX_AUDIO_DELIVERY_BYTES, validateAudioDelivery } from "../src/lib/audio-delivery-storage";

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
