import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "@prisma/client";

type TokenPayload = { sub: string; role: UserRole; restaurantId?: string | null };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const token = auth.replace("Bearer ", "");
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.user = { id: payload.sub, role: payload.role, restaurantId: payload.restaurantId };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
