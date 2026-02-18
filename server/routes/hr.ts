/**
 * HR Module - الموارد البشرية
 * احتياجات الأقسام، الوظائف الشاغرة، طلبات التوظيف
 */

import { RequestHandler } from "express";
import {
  hrDepartmentNeeds,
  hrPositions,
  hrApplications,
  persistHRNeed,
  persistHRPosition,
  persistHRApplication,
  removeHRNeed,
  removeHRPosition,
  removeHRApplication,
} from "../data/hr-store";
import type {
  HRDepartmentNeed,
  HRJobPosition,
  HRApplication,
  HRDepartment,
  HRNeedStatus,
  HRApplicationStatus,
} from "@shared/api";

const DEPT_LABELS: Record<HRDepartment, string> = {
  reception: "الاستقبال",
  cad: "التصميم CAD",
  cam: "التفريز CAM",
  finishing: "البورسلين",
  removable: "التركيبات المتحركة",
  quality_control: "مراقبة الجودة",
  accounting: "الحسابات",
  delivery: "التسليم",
  management: "الإدارة",
};

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// GET /api/hr/needs
export const getHRNeeds: RequestHandler = (_req, res) => {
  res.json({ success: true, data: [...hrDepartmentNeeds].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
};

// POST /api/hr/needs
export const createHRNeed: RequestHandler = (req, res) => {
  const body = req.body;
  const need: HRDepartmentNeed = {
    id: genId("hrneed"),
    department: body.department as HRDepartment,
    departmentNameAr: DEPT_LABELS[body.department] || body.department,
    positionTitle: body.positionTitle || "Position",
    positionTitleAr: body.positionTitleAr || body.positionTitle || "وظيفة",
    requiredCount: parseInt(body.requiredCount) || 1,
    filledCount: parseInt(body.filledCount) || 0,
    description: body.description,
    skills: Array.isArray(body.skills) ? body.skills : (body.skills ? body.skills.split(",").map((s: string) => s.trim()) : undefined),
    minExperience: body.minExperience,
    salaryRange: body.salaryRange,
    status: (body.status as HRNeedStatus) || "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  persistHRNeed(need);
  res.status(201).json({ success: true, data: need });
};

// PUT /api/hr/needs/:id
export const updateHRNeed: RequestHandler = (req, res) => {
  const id = String(req.params.id || "");
  const need = hrDepartmentNeeds.find((n) => n.id === id);
  if (!need) return res.status(404).json({ success: false, error: "الاحتياج غير موجود" });
  const body = req.body;
  const updated: HRDepartmentNeed = {
    ...need,
    ...body,
    departmentNameAr: DEPT_LABELS[body.department || need.department] || need.departmentNameAr,
    requiredCount: body.requiredCount != null ? parseInt(body.requiredCount) : need.requiredCount,
    filledCount: body.filledCount != null ? parseInt(body.filledCount) : need.filledCount,
    status: body.status || need.status,
    updatedAt: new Date().toISOString(),
  };
  persistHRNeed(updated);
  res.json({ success: true, data: updated });
};

// DELETE /api/hr/needs/:id
export const deleteHRNeed: RequestHandler = (req, res) => {
  removeHRNeed(String(req.params.id || ""));
  res.json({ success: true, deleted: req.params.id });
};

// GET /api/hr/positions
export const getHRPositions: RequestHandler = (_req, res) => {
  res.json({ success: true, data: [...hrPositions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
};

// POST /api/hr/positions
export const createHRPosition: RequestHandler = (req, res) => {
  const body = req.body;
  const pos: HRJobPosition = {
    id: genId("hrpos"),
    needId: body.needId,
    department: body.department as HRDepartment,
    title: body.title || "Position",
    titleAr: body.titleAr || body.title || "وظيفة",
    description: body.description,
    requirements: Array.isArray(body.requirements) ? body.requirements : undefined,
    status: body.status || "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  persistHRPosition(pos);
  res.status(201).json({ success: true, data: pos });
};

// PUT /api/hr/positions/:id
export const updateHRPosition: RequestHandler = (req, res) => {
  const id = String(req.params.id || "");
  const pos = hrPositions.find((p) => p.id === id);
  if (!pos) return res.status(404).json({ success: false, error: "الوظيفة غير موجودة" });
  const updated: HRJobPosition = {
    ...pos,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  persistHRPosition(updated);
  res.json({ success: true, data: updated });
};

// DELETE /api/hr/positions/:id
export const deleteHRPosition: RequestHandler = (req, res) => {
  removeHRPosition(String(req.params.id || ""));
  res.json({ success: true, deleted: req.params.id });
};

// GET /api/hr/applications
export const getHRApplications: RequestHandler = (req, res) => {
  let list = [...hrApplications];
  if (req.query.positionId) list = list.filter((a) => a.positionId === req.query.positionId);
  if (req.query.status) list = list.filter((a) => a.status === req.query.status);
  list.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  res.json({ success: true, data: list });
};

// POST /api/hr/applications
export const createHRApplication: RequestHandler = (req, res) => {
  const body = req.body;
  const pos = hrPositions.find((p) => p.id === body.positionId);
  const app: HRApplication = {
    id: genId("hrapp"),
    positionId: body.positionId,
    positionTitle: pos?.titleAr || pos?.title || body.positionTitle || "وظيفة",
    department: pos ? DEPT_LABELS[pos.department] || pos.department : body.department || "",
    applicantName: body.applicantName || "",
    applicantNameAr: body.applicantNameAr || body.applicantName || "",
    phone: body.phone || "",
    email: body.email,
    resumeNotes: body.resumeNotes,
    experience: body.experience,
    education: body.education,
    status: (body.status as HRApplicationStatus) || "new",
    appliedAt: body.appliedAt || new Date().toISOString(),
    notes: body.notes,
    updatedAt: new Date().toISOString(),
  };
  persistHRApplication(app);
  res.status(201).json({ success: true, data: app });
};

// PUT /api/hr/applications/:id
export const updateHRApplication: RequestHandler = (req, res) => {
  const id = String(req.params.id || "");
  const app = hrApplications.find((a) => a.id === id);
  if (!app) return res.status(404).json({ success: false, error: "الطلب غير موجود" });
  const updated: HRApplication = {
    ...app,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  persistHRApplication(updated);
  res.json({ success: true, data: updated });
};

// DELETE /api/hr/applications/:id
export const deleteHRApplication: RequestHandler = (req, res) => {
  removeHRApplication(String(req.params.id || ""));
  res.json({ success: true, deleted: req.params.id });
};
