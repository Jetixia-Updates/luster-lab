/**
 * Authentication Routes
 * POST /api/auth/login
 * GET  /api/auth/me
 * GET  /api/users
 */

import { RequestHandler } from "express";
import { users, generateId, persistUser } from "../data/store";
import { generateToken } from "../middleware/auth";
import { logAudit } from "../middleware/audit";
import type { AuthLoginResponse, ApiResponse, User } from "@shared/api";

export const login: RequestHandler = (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid credentials" } as ApiResponse<null>);
  }

  const token = generateToken(user.id);
  logAudit(user.id, user.fullNameAr, "LOGIN", "user", user.id, `User ${user.username} logged in`);

  const { password: _p, ...safeUser } = user;
  const response: ApiResponse<AuthLoginResponse> = {
    success: true,
    data: {
      token,
      user: safeUser,
    },
  };
  res.json(response);
};

export const getMe: RequestHandler = (req, res) => {
  const user = (req as any).user;
  res.json({ success: true, data: user } as ApiResponse<Omit<User, "password">>);
};

export const getUsers: RequestHandler = (_req, res) => {
  const safeUsers = users.map(({ password, ...u }) => u);
  res.json({ success: true, data: safeUsers });
};

export const createUser: RequestHandler = (req, res) => {
  const currentUser = (req as any).user;
  const { username, password, fullName, fullNameAr, email, role, department, phone } = req.body;

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ success: false, error: "اسم المستخدم موجود بالفعل" });
  }

  const newUser: User = {
    id: generateId("user"),
    username,
    password: password || "pass123",
    fullName: fullName || "",
    fullNameAr,
    email: email || "",
    role,
    department: department || role,
    phone: phone || "",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(newUser);
  persistUser(newUser);

  logAudit(currentUser.id, currentUser.fullNameAr, "CREATE_USER", "user", newUser.id, `Created user: ${newUser.fullNameAr} (${newUser.role})`);
  const { password: _, ...safe } = newUser;
  res.status(201).json({ success: true, data: safe });
};

export const updateUser: RequestHandler = (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "User not found" });

  const currentUser = (req as any).user;
  const { password, ...updates } = req.body;
  users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
  if (password) users[idx].password = password;
  persistUser(users[idx]);

  logAudit(currentUser.id, currentUser.fullNameAr, "UPDATE_USER", "user", users[idx].id, `Updated user: ${users[idx].fullNameAr}`);
  const { password: _, ...safe } = users[idx];
  res.json({ success: true, data: safe });
};

export const toggleUserActive: RequestHandler = (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "User not found" });

  const currentUser = (req as any).user;
  if (users[idx].id === currentUser.id) {
    return res.status(400).json({ success: false, error: "لا يمكنك تعطيل حسابك" });
  }

  users[idx].active = !users[idx].active;
  users[idx].updatedAt = new Date().toISOString();
  persistUser(users[idx]);

  const action = users[idx].active ? "تفعيل" : "تعطيل";
  logAudit(currentUser.id, currentUser.fullNameAr, "TOGGLE_USER", "user", users[idx].id, `${action} المستخدم: ${users[idx].fullNameAr}`);
  const { password: _, ...safe } = users[idx];
  res.json({ success: true, data: safe });
};
