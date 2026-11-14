import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();
const run = process.env.RUN_DB_TESTS === "1";
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(tag: string, role: "CLIENT" | "VENDOR" = "CLIENT") {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
  const response = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "correct-horse-1",
    name: `User ${tag}`,
    role,
    ...(role === "VENDOR" ? { businessName: `Studio ${tag}` } : {}),
  });
  expect(response.status).toBe(201);
  return { token: response.body.accessToken as string, id: response.body.user.id as string };
}

describe.skipIf(!run)("Dublu Vé standalone creative-service checkout (DB)", () => {
  it("allows a customer to book an audio service without creating an event and holds wallet funds in escrow", async () => {
    const customer = await register("audio-customer");
    const artist = await register("audio-artist", "VENDOR");
    const profile = await prisma.vendorProfile.findUniqueOrThrow({ where: { userId: artist.id } });
    const category = await prisma.category.upsert({
      where: { slug: "dublu-audio-checkout-test" },
      update: {},
      create: { name: "Original Songs & Custom Music", slug: "dublu-audio-checkout-test" },
    });
    const listing = await prisma.listing.create({
      data: {
        vendorId: profile.id,
        categoryId: category.id,
        type: "SERVICE",
        title: "Original jingle production",
        description: "Custom audio production for a customer brand.",
        priceMinor: 250000n,
        currency: "NGN",
        status: "ACTIVE",
        mediaUrls: [],
      },
    });
    await prisma.vendorProfile.update({ where: { id: profile.id }, data: { verification: "VERIFIED" } });
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId_currency: { userId: customer.id, currency: "NGN" } } });
    let adminId: string | undefined;
    await prisma.wallet.update({ where: { id: wallet.id }, data: { availableMinor: 500000n, escrowMinor: 0n } });

    try {
      const cartResponse = await request(app).get("/api/v1/checkout/cart?currency=NGN").set(auth(customer.token));
      expect(cartResponse.status).toBe(200);
      const cartId = cartResponse.body.cart.id as string;

      const add = await request(app).post("/api/v1/checkout/cart/items").set(auth(customer.token))
        .send({ listingId: listing.id, quantity: 1 });
      expect(add.status).toBe(201);
      expect(add.body.cart.eventId).toBeNull();

      const sessionResponse = await request(app).post("/api/v1/checkout/checkout-sessions").set(auth(customer.token))
        .send({ cartId });
      expect(sessionResponse.status).toBe(201);
      const sessionId = sessionResponse.body.session.id as string;
      expect(sessionResponse.body.session.totalMinor).toBe("250000");

      const paid = await request(app).post(`/api/v1/checkout/checkout-sessions/${sessionId}/pay-with-wallet`)
        .set(auth(customer.token)).send({ idempotencyKey: `standalone-audio-${sessionId}` });
      expect(paid.status).toBe(200);
      expect(paid.body.status).toBe("paid");
      expect(paid.body.bookingIds).toHaveLength(1);

      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: paid.body.bookingIds[0] } });
      expect(booking.buyerId).toBe(customer.id);
      expect(booking.vendorId).toBe(profile.id);
      expect(booking.eventId).toBeNull();
      expect(booking.status).toBe("PAID");
      expect(booking.paidMinor).toBe(250000n);

      const updatedWallet = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(updatedWallet.availableMinor).toBe(250000n);
      expect(updatedWallet.escrowMinor).toBe(250000n);
      expect(await prisma.ledgerEntry.count({ where: { walletId: wallet.id, refType: "CHECKOUT_SESSION", refId: sessionId, type: "ESCROW_HOLD" } })).toBe(1);

      const replay = await request(app).post(`/api/v1/checkout/checkout-sessions/${sessionId}/pay-with-wallet`)
        .set(auth(customer.token)).send({ idempotencyKey: `standalone-audio-${sessionId}` });
      expect(replay.status).toBe(200);
      expect(replay.body.status).toBe("paid");
      expect(replay.body.bookingIds).toEqual([]);
      const afterReplay = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(afterReplay.availableMinor).toBe(250000n);
      expect(afterReplay.escrowMinor).toBe(250000n);
    } finally {
      await prisma.booking.deleteMany({ where: { buyerId: customer.id } });
      await prisma.checkoutSession.deleteMany({ where: { userId: customer.id } });
      await prisma.cart.deleteMany({ where: { userId: customer.id } });
      await prisma.ledgerEntry.deleteMany({ where: { walletId: wallet.id } });
      await prisma.listing.deleteMany({ where: { id: listing.id } });
      await prisma.user.deleteMany({ where: { id: { in: [customer.id, artist.id, ...(adminId ? [adminId] : [])] } } });
      await prisma.category.deleteMany({ where: { id: category.id } });
    }
  }, 30_000);
});
