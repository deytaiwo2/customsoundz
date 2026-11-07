import { randomBytes } from "node:crypto";
import { Router, raw } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../lib/async";
import { createNotification } from "../notifications/notifications.service";
import { readAudioDelivery, storeAudioDelivery } from "../../lib/audio-delivery-storage";

export const productionProjectsRouter = Router();
const priceNaira: Record<string, number> = {
  song: 180000, jingle: 95000, voiceover: 45000, beat: 85000,
  mix: 55000, master: 30000, studio: 40000,
};
const serviceNames: Record<string, string> = {
  song: "Original song production", jingle: "Brand / advert jingle", voiceover: "Voice-over",
  beat: "Custom instrumental / beat", mix: "Mixing", master: "Mastering", studio: "Studio recording session",
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

productionProjectsRouter.use(requireAuth);

productionProjectsRouter.post("/", asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const genre = typeof body.genre === "string" ? body.genre.trim() : "";
  const mood = typeof body.mood === "string" ? body.mood.trim() : "";
  const musicalKey = typeof body.musicalKey === "string" ? body.musicalKey.trim() : "";
  const duration = typeof body.duration === "string" ? body.duration.trim() : "";
  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  const bpm = Number(body.bpm);
  const keys = Array.isArray(body.services) ? [...new Set(body.services.map((item: any) => typeof item?.key === "string" ? item.key : ""))] : [];
  if (title.length < 2 || title.length > 100 || !genre || genre.length > 60 || !mood || mood.length > 60 ||
      !musicalKey || musicalKey.length > 30 || !Number.isInteger(bpm) || bpm < 60 || bpm > 200 ||
      !["15 seconds", "30 seconds", "60 seconds"].includes(duration) || brief.length > 1500 ||
      !keys.length || keys.length > Object.keys(priceNaira).length || keys.some((key: string) => !priceNaira[key])) {
    return res.status(400).json({ error: { code: "INVALID_PROJECT_BRIEF", message: "Complete the project details and choose one or more valid production services." } });
  }
  const services = keys.map((key: string) => ({ key, label: serviceNames[key], unitPriceMinor: String(priceNaira[key] * 100) }));
  const estimatedTotalMinor = keys.reduce((sum: number, key: string) => sum + priceNaira[key] * 100, 0);
  const reference = `DV-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const project = await prisma.productionProject.create({
    data: {
      reference, customerId: req.user!.id, title, genre, mood, musicalKey, bpm, duration,
      brief: brief || null, services, estimatedTotalMinor: BigInt(estimatedTotalMinor), currency: "NGN",
    },
  });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  await Promise.allSettled(admins.map(admin => createNotification({
    userId: admin.id, type: "PRODUCTION_PROJECT_ASSIGNED", category: "BOOKING",
    title: "New Dublu Vé production project",
    body: `${reference}: ${title} · ${moneyNaira(estimatedTotalMinor)} estimate`,
    data: { projectId: project.id, reference },
  })));
  res.status(201).json({ project: { id: project.id, reference: project.reference, status: project.status, estimatedTotalMinor: project.estimatedTotalMinor.toString(), currency: project.currency, assignedTeam: project.assignedTeam } });
}));

productionProjectsRouter.get("/", asyncHandler(async (req, res) => {
  const items = await prisma.productionProject.findMany({
    where: { customerId: req.user!.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, reference: true, title: true, genre: true, mood: true, services: true, estimatedTotalMinor: true, currency: true, status: true, createdAt: true, readyAt: true, deliveryFileName: true },
  });
  res.json({ items: items.map(item => ({ ...item, estimatedTotalMinor: item.estimatedTotalMinor.toString() })) });
}));

productionProjectsRouter.get("/admin/queue", requireRole("ADMIN"), asyncHandler(async (_req, res) => {
  const items = await prisma.productionProject.findMany({ orderBy: { createdAt: "asc" }, include: { customer: { select: { id: true, name: true, email: true } } } });
  res.json({ items: items.map(item => ({ ...item, estimatedTotalMinor: item.estimatedTotalMinor.toString(), deliverySizeBytes: item.deliverySizeBytes?.toString() ?? null })) });
}));

productionProjectsRouter.patch("/:projectId/status", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const status = typeof req.body?.status === "string" ? req.body.status : "";
  if (!uuidPattern.test(projectId) || !["IN_PRODUCTION", "REVIEW", "CANCELLED"].includes(status)) {
    return res.status(400).json({ error: { code: "INVALID_PROJECT_STATUS", message: "Use IN_PRODUCTION, REVIEW or CANCELLED and a valid project ID." } });
  }
  const project = await prisma.productionProject.update({ where: { id: projectId }, data: { status } });
  await createNotification({ userId: project.customerId, type: "PRODUCTION_PROJECT_UPDATED", category: "BOOKING", title: "Your Dublu Vé project has been updated", body: `${project.reference} is now ${status.replace("_", " ").toLowerCase()}.`, data: { projectId, reference: project.reference } });
  res.json({ project: { id: project.id, reference: project.reference, status: project.status } });
}));

productionProjectsRouter.put("/:projectId/deliverable", raw({ type: "audio/*", limit: "25mb" }), requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!uuidPattern.test(projectId)) return res.status(400).json({ error: { code: "INVALID_PROJECT_ID", message: "Project ID is invalid." } });
  const project = await prisma.productionProject.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Production project not found." } });
  const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const contentType = typeof req.headers["content-type"] === "string" ? req.headers["content-type"] : "";
  const fileName = typeof req.query.fileName === "string" ? req.query.fileName : "Dublu-Ve-final-master";
  const asset = await storeAudioDelivery({ bookingId: project.id, bytes, contentType, fileName });
  const updated = await prisma.productionProject.update({
    where: { id: project.id },
    data: { deliveryStorageRef: asset.storageRef, deliveryFileName: asset.fileName, deliveryMimeType: asset.mimeType, deliverySizeBytes: BigInt(asset.sizeBytes), status: "READY", readyAt: new Date() },
  });
  await createNotification({ userId: project.customerId, type: "PRODUCTION_PROJECT_READY", category: "BOOKING", title: "Your finished audio is ready to download", body: `${project.reference} is complete. Sign in to your Dublu Vé account to download the final production.`, data: { projectId: project.id, reference: project.reference, downloadPath: `/production-projects/${project.id}/download` } });
  res.status(201).json({ project: { id: updated.id, reference: updated.reference, status: updated.status, fileName: asset.fileName } });
}));

productionProjectsRouter.get("/:projectId/download", asyncHandler(async (req, res) => {
  if (!uuidPattern.test(req.params.projectId)) return res.status(400).json({ error: { code: "INVALID_PROJECT_ID", message: "Project ID is invalid." } });
  const project = await prisma.productionProject.findUnique({ where: { id: req.params.projectId } });
  if (!project || (project.customerId !== req.user!.id && req.user!.role !== "ADMIN")) {
    return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project or deliverable not found." } });
  }
  if (project.status !== "READY" || !project.deliveryStorageRef) return res.status(409).json({ error: { code: "DELIVERABLE_NOT_READY", message: "Your finished audio is not available yet." } });
  const bytes = await readAudioDelivery(project.deliveryStorageRef);
  res.setHeader("Content-Type", project.deliveryMimeType || "application/octet-stream");
  res.setHeader("Content-Length", bytes.length);
  res.setHeader("Content-Disposition", `attachment; filename="${(project.deliveryFileName || "Dublu-Ve-audio").replace(/["\\r\\n]/g, "")}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(bytes);
}));

function moneyNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}
