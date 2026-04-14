import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

const router = Router();
router.use(requireAuth, requireRole([UserRole.SUPER_ADMIN]));

router.get("/restaurants", async (_req, res) => {
  const data = await prisma.restaurant.findMany({ include: { subscriptionPlan: true } });
  res.json(data);
});

router.post("/restaurants", async (req, res) => {
  const data = await prisma.restaurant.create({ data: req.body });
  res.status(201).json(data);
});

router.put("/restaurants/:id", async (req, res) => {
  const data = await prisma.restaurant.update({ where: { id: req.params.id }, data: req.body });
  res.json(data);
});

router.delete("/restaurants/:id", async (req, res) => {
  await prisma.restaurant.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get("/subscriptions", async (_req, res) => {
  const data = await prisma.subscriptionPlan.findMany();
  res.json(data);
});

router.post("/subscriptions", async (req, res) => {
  const data = await prisma.subscriptionPlan.create({ data: req.body });
  res.status(201).json(data);
});

router.put("/subscriptions/:id", async (req, res) => {
  const data = await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data: req.body });
  res.json(data);
});

router.get("/analytics", async (_req, res) => {
  const [restaurants, activeSessions, orders, analyses] = await Promise.all([
    prisma.restaurant.count(),
    prisma.customerSession.count(),
    prisma.order.count(),
    prisma.moodAnalysis.groupBy({ by: ["sentiment"], _count: true }),
  ]);
  res.json({ restaurants, activeSessions, orders, moodDistribution: analyses });
});

export default router;
