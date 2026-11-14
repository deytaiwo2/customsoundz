import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyPaystackWebhookSignature } from "../src/modules/payments/webhookVerification";

describe("Paystack timestamped webhook signatures", () => {
  const secret = "whsec_customsoundz_test_secret";
  const timestamp = 1_800_000_000;
  const rawBody = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "dv-test-1" } }));

  function header(body = rawBody, at = timestamp) {
    const signature = createHmac("sha512", secret)
      .update(`${at}.`)
      .update(body)
      .digest("hex");
    return `t=${at},v1=whk_test:${signature}`;
  }

  it("accepts a correctly signed recent webhook", () => {
    expect(verifyPaystackWebhookSignature(rawBody, header(), secret, timestamp)).toBe(true);
  });

  it("rejects a webhook outside the timestamp tolerance", () => {
    expect(verifyPaystackWebhookSignature(rawBody, header(), secret, timestamp + 301)).toBe(false);
  });

  it("rejects a modified raw body", () => {
    expect(verifyPaystackWebhookSignature(Buffer.from("tampered"), header(), secret, timestamp)).toBe(false);
  });

  it("rejects missing, malformed and duplicate timestamps", () => {
    expect(verifyPaystackWebhookSignature(rawBody, "", secret, timestamp)).toBe(false);
    expect(verifyPaystackWebhookSignature(rawBody, "t=bad,v1=whk_test:abc", secret, timestamp)).toBe(false);
    expect(verifyPaystackWebhookSignature(rawBody, `t=${timestamp},t=${timestamp},v1=whk_test:${"0".repeat(128)}`, secret, timestamp)).toBe(false);
  });
});
