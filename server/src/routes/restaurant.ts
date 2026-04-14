import { Router } from "express";
import crypto from "node:crypto";
import { UserRole } from "@prisma/client";
import QRCode from "qrcode";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

const router = Router();
router.use(requireAuth, requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF]));

router.get("/profile", async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user?.restaurantId ?? "" } });
  res.json(restaurant);
});

router.put("/profile", async (req, res) => {
  const restaurant = await prisma.restaurant.update({
    where: { id: req.user?.restaurantId ?? "" },
    data: req.body,
  });
  res.json(restaurant);
});

router.get("/menu/categories", async (req, res) => {
  const data = await prisma.menuCategory.findMany({
    where: { restaurantId: req.user?.restaurantId ?? "" },
    include: { items: true },
    orderBy: { displayOrder: "asc" },
  });
  res.json(data);
});

router.post("/menu/categories", async (req, res) => {
  const category = await prisma.menuCategory.create({
    data: { name: req.body.name, displayOrder: req.body.displayOrder ?? 0, restaurantId: req.user?.restaurantId ?? "" },
  });
  res.status(201).json(category);
});

router.post("/menu/items", async (req, res) => {
  const item = await prisma.menuItem.create({
    data: { ...req.body, restaurantId: req.user?.restaurantId ?? "" },
  });
  res.status(201).json(item);
});

router.put("/menu/items/:id", async (req, res) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, restaurantId: req.user?.restaurantId ?? "" },
  });
  if (!existing) return res.status(404).json({ message: "Menu item not found" });
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(item);
});

router.delete("/menu/items/:id", async (req, res) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, restaurantId: req.user?.restaurantId ?? "" },
  });
  if (!existing) return res.status(404).json({ message: "Menu item not found" });
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.put("/menu/categories/:id", async (req, res) => {
  const existing = await prisma.menuCategory.findFirst({
    where: { id: req.params.id, restaurantId: req.user?.restaurantId ?? "" },
  });
  if (!existing) return res.status(404).json({ message: "Category not found" });
  const category = await prisma.menuCategory.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(category);
});

router.delete("/menu/categories/:id", async (req, res) => {
  const existing = await prisma.menuCategory.findFirst({
    where: { id: req.params.id, restaurantId: req.user?.restaurantId ?? "" },
  });
  if (!existing) return res.status(404).json({ message: "Category not found" });
  await prisma.menuCategory.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get("/tables", async (req, res) => {
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: req.user?.restaurantId ?? "" },
    orderBy: { tableNumber: "asc" },
  });
  res.json(tables);
});

router.post("/tables", async (req, res) => {
  const table = await prisma.restaurantTable.create({
    data: {
      tableNumber: req.body.tableNumber,
      restaurantId: req.user?.restaurantId ?? "",
      qrCodeData: crypto.randomUUID(),
    },
  });
  res.status(201).json(table);
});

router.delete("/tables/:id", async (req, res) => {
  const existing = await prisma.restaurantTable.findFirst({
    where: { id: req.params.id, restaurantId: req.user?.restaurantId ?? "" },
  });
  if (!existing) return res.status(404).json({ message: "Table not found" });
  await prisma.restaurantTable.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.get("/tables/:id/qr", async (req, res) => {
  const table = await prisma.restaurantTable.findUnique({ where: { id: req.params.id } });
  if (!table) return res.status(404).json({ message: "Table not found" });
  const url = `${process.env.CLIENT_URL ?? "http://localhost:5173"}/t/${table.qrCodeData}`;
  const qr = await QRCode.toDataURL(url);
  res.json({ tableId: table.id, url, qr });
});

router.get("/mood-insights", async (req, res) => {
  const data = await prisma.moodAnalysis.findMany({
    where: { restaurantId: req.user?.restaurantId ?? "" },
    orderBy: { createdAt: "desc" },
    include: { table: true },
  });
  res.json(data);
});

router.get("/mood-insights/history", async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const data = await prisma.moodAnalysis.findMany({
    where: {
      restaurantId: req.user?.restaurantId ?? "",
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "desc" },
    include: { table: true },
  });
  res.json(data);
});

router.get("/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { restaurantId: req.user?.restaurantId ?? "" },
    include: { items: { include: { menuItem: true } }, table: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

router.put("/orders/:id/status", async (req, res) => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  res.json(order);
});

router.get("/feedbacks", async (req, res) => {
  const feedbacks = await prisma.feedback.findMany({
    where: { restaurantId: req.user?.restaurantId ?? "" },
    orderBy: { createdAt: "desc" },
  });
  res.json(feedbacks);
});

export default router;
