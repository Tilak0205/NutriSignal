import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

const router = Router();
router.use(requireAuth, requireRole([UserRole.SUPER_ADMIN]));

router.get("/restaurants", async (_req, res) => {
  const data = await prisma.restaurant.findMany({
    include: {
      subscriptionPlan: true,
      users: { select: { id: true, email: true, name: true, role: true } },
      _count: { select: { tables: true, orders: true, items: true } },
    },
  });
  res.json(data);
});

router.post("/restaurants", async (req, res) => {
  const { name, email, ownerName, phone, address } = req.body as {
    name: string; email: string; ownerName: string; phone?: string; address?: string;
  };
  if (!name?.trim() || !email?.trim() || !ownerName?.trim()) {
    return res.status(400).json({ message: "Name, email and owner name are required" });
  }
  const exists = await prisma.restaurantUser.findUnique({ where: { email } });
  if (exists) return res.status(400).json({ message: "Email already in use" });

  const tempPassword = crypto.randomBytes(4).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const restaurant = await prisma.restaurant.create({
    data: { name: name.trim(), phone: phone?.trim(), address: address?.trim() },
  });
  const user = await prisma.restaurantUser.create({
    data: { name: ownerName.trim(), email: email.trim().toLowerCase(), passwordHash, role: UserRole.OWNER, restaurantId: restaurant.id },
  });

  res.status(201).json({
    restaurant,
    credentials: { email: user.email, tempPassword, ownerName: user.name },
  });
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
  const [restaurants, activeSessions, orders, analyses, totalTables, totalMenuItems, totalFeedbacks] = await Promise.all([
    prisma.restaurant.count(),
    prisma.customerSession.count(),
    prisma.order.count(),
    prisma.moodAnalysis.groupBy({ by: ["sentiment"], _count: true }),
    prisma.restaurantTable.count(),
    prisma.menuItem.count(),
    prisma.feedback.count(),
  ]);
  res.json({ restaurants, activeSessions, orders, moodDistribution: analyses, totalTables, totalMenuItems, totalFeedbacks });
});

export default router;
