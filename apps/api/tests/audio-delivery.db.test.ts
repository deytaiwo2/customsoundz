import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();
const run = process.env.RUN_DB_TESTS === "1";
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(tag: string, role: "CLIENT" | "VENDOR") {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
  const response = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "correct-horse-1",
    name: `Audio test ${tag}`,
    role,
    ...(role === "VENDOR" ? { businessName: `Audio test studio ${tag}` } : {}),
  });
  expect(response.status).toBe(201);
  return { id: response.body.user.id as string, token: response.body.accessToken as string };
}

describe.skipIf(!run)("private booking audio delivery (DB)", () => {
  it("does not let a provider mark a booking delivered without an audio file", async () => {
    const customer = await register("audio-customer", "CLIENT");
    const provider = await register("audio-provider", "VENDOR");
    const outsider = await register("audio-outsider", "CLIENT");
    const vendorProfile = await prisma.vendorProfile.findUniqueOrThrow({ where: { userId: provider.id } });
    const booking = await prisma.booking.create({
      data: {
        buyerId: customer.id,
        vendorId: vendorProfile.id,
        status: "PAID",
        currency: "NGN",
        subtotalMinor: 500000n,
        totalMinor: 500000n,
        paidMinor: 500000n,
      },
    });

    try {
      const noteOnly = await request(app)
        .post(`/api/v1/payments/bookings/${booking.id}/deliver`)
        .set(auth(provider.token))
        .send({ deliveryNote: "The completed audio project is ready." });
      expect(noteOnly.status).toBe(409);
      expect(noteOnly.body.error.code).toBe("AUDIO_DELIVERABLE_REQUIRED");

      const fakeMp3 = Buffer.alloc(256);
      fakeMp3.write("ID3", 0, "ascii");
      const unauthorizedUpload = await request(app)
        .post(`/api/v1/payments/bookings/${booking.id}/deliverables?fileName=final.mp3`)
        .set(auth(customer.token))
        .set("Content-Type", "audio/mpeg")
        .send(fakeMp3);
      expect(unauthorizedUpload.status).toBe(403);

      const outsiderDownload = await request(app)
        .get(`/api/v1/payments/bookings/${booking.id}/deliverables/not-an-asset`)
        .set(auth(outsider.token));
      expect(outsiderDownload.status).toBe(403);

      const customerBeforeDelivery = await request(app)
        .get(`/api/v1/payments/bookings/${booking.id}/deliverables/not-an-asset`)
        .set(auth(customer.token));
      expect(customerBeforeDelivery.status).toBe(409);
    } finally {
      await prisma.booking.delete({ where: { id: booking.id } });
      await prisma.user.deleteMany({ where: { id: { in: [customer.id, provider.id, outsider.id] } } });
    }
  }, 30_000);
});
