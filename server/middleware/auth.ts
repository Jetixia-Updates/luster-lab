/**
 * Authentication & Authorization Middleware
 * JWT-based auth with Role-Based Access Control (RBAC)
 */

import { RequestHandler } from "express";
import { users } from "../data/store";
import type { UserRole } from "@shared/api";

// Simple JWT-like token (in production, use proper JWT library)
const TOKEN_SECRET = "luster-dental-lab-secret-2026";

export function generateToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 86400000 })).toString("base64");
  return `${payload}.${Buffer.from(TOKEN_SECRET).toString("base64")}`;
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const [payloadB64] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    // For demo, allow unauthenticated access with default admin user
    (req as any).user = users[0];
    return next();
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }

  const user = users.find((u) => u.id === decoded.userId);
  if (!user || !user.active) {
    return res.status(401).json({ success: false, error: "User not found or inactive" });
  }

  (req as any).user = { ...user, password: undefined };
  next();
};

export function authorize(...roles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }
    next();
  };
}
