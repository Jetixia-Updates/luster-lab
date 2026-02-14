/**
 * Case Management Routes - Core of the ERP
 * Handles full lifecycle: Reception → CAD → CAM → Finishing → QC → Delivery
 */

import { RequestHandler } from "express";
import {
  cases,
  doctors,
  generateId,
  generateCaseNumber,
  persistCase,
  persistDoctor,
  persistAuditLog,
  removeCaseFromDB,
} from "../data/store";
import { logAudit } from "../middleware/audit";
import type {
  DentalCase, CaseStatus, ApiResponse, CreateCaseRequest,
  WorkflowStep,
} from "@shared/api";

// Status flow validation
const VALID_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  reception: ["cad_design", "cancelled"],
  cad_design: ["cam_milling", "reception", "cancelled"],
  cam_milling: ["finishing", "cad_design", "cancelled"],
  finishing: ["quality_control", "cam_milling", "cancelled"],
  quality_control: ["accounting", "finishing", "cam_milling", "cad_design", "cancelled"],
  accounting: ["ready_for_delivery"],
  ready_for_delivery: ["delivered"],
  delivered: ["returned"],
  returned: ["reception"],
  cancelled: [],
};

const STATUS_DEPARTMENT_MAP: Record<CaseStatus, string> = {
  reception: "reception",
  cad_design: "cad",
  cam_milling: "cam",
  finishing: "finishing",
  quality_control: "quality_control",
  accounting: "accounting",
  ready_for_delivery: "delivery",
  delivered: "delivery",
  returned: "reception",
  cancelled: "reception",
};

// GET /api/cases
export const getCases: RequestHandler = (req, res) => {
  let filtered = [...cases];

  // Filter by status
  if (req.query.status) {
    filtered = filtered.filter((c) => c.currentStatus === req.query.status);
  }
  // Filter by department
  if (req.query.department) {
    filtered = filtered.filter((c) => c.currentDepartment === req.query.department);
  }
  // Filter by doctor
  if (req.query.doctorId) {
    filtered = filtered.filter((c) => c.doctorId === req.query.doctorId);
  }
  // Filter by work type
  if (req.query.workType) {
    filtered = filtered.filter((c) => c.workType === req.query.workType);
  }
  // Filter by priority
  if (req.query.priority) {
    filtered = filtered.filter((c) => c.priority === req.query.priority);
  }
  // Search by case number or patient name
  if (req.query.search) {
    const s = (req.query.search as string).toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(s) ||
        c.patientName.toLowerCase().includes(s) ||
        c.doctorName.toLowerCase().includes(s)
    );
  }

  // Sort by date (newest first)
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, data: filtered, total: filtered.length });
};

// GET /api/cases/:id
export const getCase: RequestHandler = (req, res) => {
  const c = cases.find((c) => c.id === req.params.id || c.caseNumber === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: "Case not found" });
  res.json({ success: true, data: c });
};

// POST /api/cases
export const createCase: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const body = req.body as CreateCaseRequest;

  const doctor = doctors.find((d) => d.id === body.doctorId);
  const caseNumber = generateCaseNumber();

  const newCase: DentalCase = {
    id: generateId("case"),
    caseNumber,
    doctorId: body.doctorId,
    doctorName: doctor?.nameAr || body.doctorId,
    patientName: body.patientName,
    workType: body.workType,
    teethNumbers: body.teethNumbers,
    shadeColor: body.shadeColor,
    material: body.material,
    receivedDate: new Date().toISOString(),
    expectedDeliveryDate: body.expectedDeliveryDate,
    currentStatus: "reception",
    currentDepartment: "reception",
    priority: body.priority || "normal",
    doctorNotes: body.doctorNotes,
    attachments: [],
    workflowHistory: [],
    totalCost: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: user.id,
  };

  cases.unshift(newCase);
  persistCase(newCase);

  // Update doctor case count
  if (doctor) {
    doctor.totalCases++;
    persistDoctor(doctor);
  }

  const auditLog = logAudit(user.id, user.fullNameAr, "CREATE_CASE", "case", newCase.id,
    `Created case ${caseNumber} for ${newCase.patientName}`);
  persistAuditLog(auditLog);

  res.status(201).json({ success: true, data: newCase });
};

// PUT /api/cases/:id
export const updateCase: RequestHandler = (req, res) => {
  const idx = cases.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Case not found" });

  const user = (req as any).user;
  cases[idx] = { ...cases[idx], ...req.body, updatedAt: new Date().toISOString() };
  persistCase(cases[idx]);

  const auditLog = logAudit(user.id, user.fullNameAr, "UPDATE_CASE", "case", cases[idx].id,
    `Updated case ${cases[idx].caseNumber}`);
  persistAuditLog(auditLog);

  res.json({ success: true, data: cases[idx] });
};

// POST /api/cases/:id/transfer
export const transferCase: RequestHandler = (req, res) => {
  const c = cases.find((c) => c.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: "Case not found" });

  const { toStatus, assignedTo, notes, rejectionReason } = req.body;
  const user = (req as any).user;

  // Validate transition
  const validNext = VALID_TRANSITIONS[c.currentStatus];
  if (!validNext?.includes(toStatus)) {
    return res.status(400).json({
      success: false,
      error: `Cannot transfer from ${c.currentStatus} to ${toStatus}. Valid: ${validNext?.join(", ")}`,
    });
  }

  // For invoicing, case must have passed QC
  if (toStatus === "accounting") {
    if (!c.qcData || c.qcData.overallResult !== "pass") {
      return res.status(400).json({
        success: false,
        error: "Cannot proceed to accounting - QC must pass first",
      });
    }
  }

  // Record workflow step
  const step: WorkflowStep = {
    id: generateId("wf"),
    caseId: c.id,
    fromStatus: c.currentStatus,
    toStatus,
    department: STATUS_DEPARTMENT_MAP[toStatus],
    assignedTo,
    startTime: new Date().toISOString(),
    notes,
    rejectionReason,
    createdBy: user.id,
  };

  c.workflowHistory.push(step);
  c.currentStatus = toStatus;
  c.currentDepartment = STATUS_DEPARTMENT_MAP[toStatus];
  c.updatedAt = new Date().toISOString();
  persistCase(c);

  const auditLog = logAudit(user.id, user.fullNameAr, "TRANSFER_CASE", "case", c.id,
    `Transferred case ${c.caseNumber} from ${step.fromStatus} to ${toStatus}`);
  persistAuditLog(auditLog);

  res.json({ success: true, data: c });
};

// PUT /api/cases/:id/cad
export const updateCADData: RequestHandler = (req, res) => {
  const c = cases.find((c) => c.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: "Case not found" });
  
  c.cadData = { ...c.cadData, ...req.body };
  c.updatedAt = new Date().toISOString();
  persistCase(c);
  res.json({ success: true, data: c });
};

// PUT /api/cases/:id/cam
export const updateCAMData: RequestHandler = (req, res) => {
  const c = cases.find((c) => c.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: "Case not found" });

  c.camData = { ...c.camData, ...req.body };
  c.updatedAt = new Date().toISOString();
  persistCase(c);
  res.json({ success: true, data: c });
};

// PUT /api/cases/:id/finishing
export const updateFinishingData: RequestHandler = (req, res) => {
  const c = cases.find((c) => c.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: "Case not found" });

  c.finishingData = { ...c.finishingData, ...req.body };
  c.updatedAt = new Date().toISOString();
  persistCase(c);
  res.json({ success: true, data: c });
};

// PUT /api/cases/:id/qc
export const updateQCData: RequestHandler = (req, res) => {
  const c = cases.find((c) => c.id === req.params.id);
  if (!c) return res.status(404).json({ success: false, error: "Case not found" });

  const user = (req as any).user;
  c.qcData = {
    ...req.body,
    inspectorId: user.id,
    inspectorName: user.fullNameAr,
    inspectionDate: new Date().toISOString(),
  };
  c.updatedAt = new Date().toISOString();
  persistCase(c);

  const auditLog = logAudit(user.id, user.fullNameAr, "QC_INSPECTION", "case", c.id,
    `QC ${req.body.overallResult} for case ${c.caseNumber}`);
  persistAuditLog(auditLog);

  res.json({ success: true, data: c });
};

// DELETE /api/cases/:id
export const deleteCase: RequestHandler = (req, res) => {
  const idx = cases.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Case not found" });
  
  const user = (req as any).user;
  const removed = cases.splice(idx, 1)[0];
  removeCaseFromDB(removed.id);

  const auditLog = logAudit(user.id, user.fullNameAr, "DELETE_CASE", "case", removed.id,
    `Deleted case ${removed.caseNumber}`);
  persistAuditLog(auditLog);

  res.json({ success: true, message: "Case deleted" });
};
