import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { UserRole } from "@prisma/client";

const router = Router();

const registerSchema = z.object({
  restaurantName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { restaurantName, ownerName, email, password } = parsed.data;

  const exists = await prisma.restaurantUser.findUnique({ where: { email } });
  if (exists) return res.status(400).json({ message: "Email already exists" });

  const hash = await bcrypt.hash(password, 10);
  const restaurant = await prisma.restaurant.create({ data: { name: restaurantName } });
  const user = await prisma.restaurantUser.create({
    data: { name: ownerName, email, passwordHash: hash, role: UserRole.OWNER, restaurantId: restaurant.id },
  });

  const token = jwt.sign({ sub: user.id, role: user.role, restaurantId: user.restaurantId }, env.jwtSecret, {
    expiresIn: "7d",
  });
  res.status(201).json({ token, user, restaurant });
});

router.post("/login", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const user = await prisma.restaurantUser.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ sub: user.id, role: user.role, restaurantId: user.restaurantId }, env.jwtSecret, {
    expiresIn: "7d",
  });
  res.json({ token, user });
});

router.post("/bootstrap-super-admin", async (req, res) => {
  const parsed = z
    .object({ key: z.string(), name: z.string().min(2), email: z.string().email(), password: z.string().min(6) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  if (parsed.data.key !== env.adminBootstrapKey) {
    return res.status(403).json({ message: "Invalid bootstrap key" });
  }
  const count = await prisma.restaurantUser.count({ where: { role: UserRole.SUPER_ADMIN } });
  if (count > 0) return res.status(400).json({ message: "Super admin already exists" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.restaurantUser.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });
  res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

export default router;
