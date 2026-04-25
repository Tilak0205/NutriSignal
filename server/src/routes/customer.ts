import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { analyzeMood } from "../services/moodAnalysis.js";
import { SessionStatus } from "@prisma/client";

const router = Router();

router.get("/table/:uuid", async (req, res) => {
  const table = await prisma.restaurantTable.findUnique({
    where: { qrCodeData: req.params.uuid },
    include: { restaurant: true },
  });
  if (!table || !table.isActive) return res.status(404).json({ message: "Table not found" });
  res.json({
    tableId: table.id,
    tableNumber: table.tableNumber,
    restaurant: {
      id: table.restaurant.id,
      name: table.restaurant.name,
      logo: table.restaurant.logo,
      brandPrimaryColor: table.restaurant.brandPrimaryColor,
      brandSecondaryColor: table.restaurant.brandSecondaryColor,
    },
  });
});

router.post("/session", async (req, res) => {
  const parsed = z.object({ tableId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const table = await prisma.restaurantTable.findUnique({ where: { id: parsed.data.tableId } });
  if (!table) return res.status(404).json({ message: "Table not found" });
  const session = await prisma.customerSession.create({
    data: {
      tableId: table.id,
      restaurantId: table.restaurantId,
      sessionToken: crypto.randomUUID(),
    },
  });
  res.status(201).json(session);
});

router.post("/questionnaire", async (req, res) => {
  const parsed = z
    .object({
      sessionId: z.string(),
      emotionalState: z.string(),
      dayContext: z.string(),
      energy: z.string(),
      occasion: z.string(),
      cravings: z.string(),
      dietaryPreference: z.string(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const session = await prisma.customerSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!session) return res.status(404).json({ message: "Session not found" });

  await prisma.questionnaireResponse.upsert({
    where: { sessionId: session.id },
    update: { responses: parsed.data },
    create: { sessionId: session.id, responses: parsed.data },
  });

  const analysis = await analyzeMood(parsed.data);
  await prisma.moodAnalysis.upsert({
    where: { sessionId: session.id },
    update: {
      sentiment: analysis.sentiment,
      keyInsights: analysis.keyInsights,
      interactionTips: analysis.interactionTips,
      serviceApproach: analysis.serviceApproach,
    },
    create: {
      sessionId: session.id,
      tableId: session.tableId,
      restaurantId: session.restaurantId,
      sentiment: analysis.sentiment,
      keyInsights: analysis.keyInsights,
      interactionTips: analysis.interactionTips,
      serviceApproach: analysis.serviceApproach,
    },
  });

  await prisma.customerSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.MENU },
  });
  res.json({ message: "Questionnaire submitted" });
});

router.get("/menu/:restaurantId", async (req, res) => {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: req.params.restaurantId },
    include: { items: true },
    orderBy: { displayOrder: "asc" },
  });
  res.json(categories);
});

router.post("/order", async (req, res) => {
  const parsed = z
    .object({
      sessionId: z.string(),
      notes: z.string().optional(),
      items: z.array(z.object({ menuItemId: z.string(), quantity: z.number().min(1), specialInstructions: z.string().optional() })),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const session = await prisma.customerSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!session) return res.status(404).json({ message: "Session not found" });

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.menuItemId) } },
  });
  const priceMap = new Map<string, number>(menuItems.map((m) => [m.id, m.price]));
  const totalAmount = parsed.data.items.reduce<number>(
    (sum, item) => sum + (priceMap.get(item.menuItemId) ?? 0) * item.quantity,
    0,
  );

  const order = await prisma.order.create({
    data: {
      sessionId: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      notes: parsed.data.notes,
      totalAmount,
      items: {
        create: parsed.data.items,
      },
    },
    include: { items: true },
  });
  await prisma.customerSession.update({ where: { id: session.id }, data: { status: SessionStatus.ORDERED } });
  res.status(201).json(order);
});

router.post("/feedback", async (req, res) => {
  const parsed = z
    .object({
      sessionId: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const session = await prisma.customerSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!session) return res.status(404).json({ message: "Session not found" });

  const feedback = await prisma.feedback.upsert({
    where: { sessionId: session.id },
    update: { rating: parsed.data.rating, comment: parsed.data.comment },
    create: {
      sessionId: session.id,
      restaurantId: session.restaurantId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });
  await prisma.customerSession.update({ where: { id: session.id }, data: { status: SessionStatus.COMPLETED } });
  res.status(201).json(feedback);
});

export default router;
