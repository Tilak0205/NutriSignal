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
  const { name, email, ownerName, phone, address, subscriptionPlanId } = req.body as {
    name: string; email: string; ownerName: string; phone?: string; address?: string; subscriptionPlanId?: string;
  };
  if (!name?.trim() || !email?.trim() || !ownerName?.trim()) {
    return res.status(400).json({ message: "Name, email and owner name are required" });
  }
  const exists = await prisma.restaurantUser.findUnique({ where: { email } });
  if (exists) return res.status(400).json({ message: "Email already in use" });

  const tempPassword = crypto.randomBytes(4).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const restaurantData: Record<string, unknown> = { name: name.trim(), phone: phone?.trim(), address: address?.trim() };
  if (subscriptionPlanId) restaurantData.subscriptionPlanId = subscriptionPlanId;

  const restaurant = await prisma.restaurant.create({ data: restaurantData as Parameters<typeof prisma.restaurant.create>[0]["data"] });
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

router.get("/questionnaire-stats", async (_req, res) => {
  const responses = await prisma.questionnaireResponse.findMany({ select: { responses: true } });
  const stats: Record<string, Record<string, number>> = {};
  for (const r of responses) {
    const data = r.responses as Record<string, string>;
    for (const [key, value] of Object.entries(data)) {
      if (!stats[key]) stats[key] = {};
      stats[key][value] = (stats[key][value] ?? 0) + 1;
    }
  }
  res.json({ totalResponses: responses.length, questionStats: stats });
});

router.get("/restaurants/:id/analytics", async (req, res) => {
  const id = req.params.id;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      subscriptionPlan: true,
      users: { select: { id: true, email: true, name: true, role: true } },
    },
  });
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

  const [orderCount, tableCount, menuItemCount, feedbackCount, sessionCount, moodDist, recentOrders, feedbacks, questionnaireResponses] = await Promise.all([
    prisma.order.count({ where: { restaurantId: id } }),
    prisma.restaurantTable.count({ where: { restaurantId: id } }),
    prisma.menuItem.count({ where: { restaurantId: id } }),
    prisma.feedback.count({ where: { restaurantId: id } }),
    prisma.customerSession.count({ where: { restaurantId: id } }),
    prisma.moodAnalysis.groupBy({ by: ["sentiment"], _count: true, where: { restaurantId: id } }),
    prisma.order.findMany({ where: { restaurantId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { items: { include: { menuItem: true } } } }),
    prisma.feedback.findMany({ where: { restaurantId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.questionnaireResponse.findMany({
      where: { session: { restaurantId: id } },
      select: { responses: true },
    }),
  ]);

  const avgRating = feedbacks.length ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length : 0;

  const qStats: Record<string, Record<string, number>> = {};
  for (const r of questionnaireResponses) {
    const data = r.responses as Record<string, string>;
    for (const [key, value] of Object.entries(data)) {
      if (!qStats[key]) qStats[key] = {};
      qStats[key][value] = (qStats[key][value] ?? 0) + 1;
    }
  }

  res.json({
    restaurant,
    stats: { orders: orderCount, tables: tableCount, menuItems: menuItemCount, feedbacks: feedbackCount, sessions: sessionCount, avgRating },
    moodDistribution: moodDist,
    recentOrders,
    feedbackList: feedbacks,
    questionnaireStats: { totalResponses: questionnaireResponses.length, questionStats: qStats },
  });
});

export default router;
