import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();
const run = process.env.RUN_DB_TESTS === "1";
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe.skipIf(!run)("Dublu Vé artist account (DB)", () => {
  it("creates an artist profile and reuses the creative-provider workspace", async () => {
    const email = `artist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
    const registered = await request(app).post("/api/v1/auth/register").send({
      email,
      password: "correct-horse-1",
      name: "Test Artist",
      role: "ARTIST",
      businessName: "Test Artist Studio",
      registrationCategory: "Original songs",
      businessCity: "Ibadan",
      businessDescription: "Original music and audio production.",
    });
    expect(registered.status).toBe(201);
    expect(registered.body.user.role).toBe("ARTIST");
    const userId = registered.body.user.id as string;
    const token = registered.body.accessToken as string;

    try {
      const stored = await prisma.artistProfile.findUniqueOrThrow({ where: { userId } });
      expect(stored.displayName).toBe("Test Artist Studio");
      expect(stored.genres).toContain("Original songs");

      const profile = await request(app).get("/api/v1/artist/profile").set(auth(token));
      expect(profile.status).toBe(200);
      expect(profile.body.profile.displayName).toBe("Test Artist Studio");

      const updated = await request(app).patch("/api/v1/artist/profile").set(auth(token)).send({
        displayName: "Test Artist Studio Updated",
        bio: "Independent music and voice production.",
        genres: ["Jingles", "Voice-over"],
      });
      expect(updated.status).toBe(200);
      expect(updated.body.profile.genres).toEqual(["Jingles", "Voice-over"]);

      const providerProfile = await request(app).get("/api/v1/vendor/profile").set(auth(token));
      expect(providerProfile.status).toBe(200);
      expect(providerProfile.body.profile.businessName).toBe("Test Artist Studio");

      const listings = await request(app).get("/api/v1/vendor/listings").set(auth(token));
      expect(listings.status).toBe(200);
      expect(Array.isArray(listings.body.items)).toBe(true);

      const directory = await request(app).get("/api/v1/artists");
      expect(directory.status).toBe(200);
      expect(directory.body.items.some((item: { userId: string }) => item.userId === userId)).toBe(true);
    } finally {
      await prisma.user.delete({ where: { id: userId } });
    }
  }, 30_000);
});
