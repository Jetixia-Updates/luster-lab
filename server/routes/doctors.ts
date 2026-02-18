/**
 * Doctor Management Routes
 */

import { RequestHandler } from "express";
import { doctors, patients, cases, invoices, generateId, persistDoctor, persistPatient, removeDoctorFromDB } from "../data/store";
import { logAudit } from "../middleware/audit";
import type { Doctor, Patient, ApiResponse } from "@shared/api";

export const getDoctors: RequestHandler = (req, res) => {
  const withAlerts = req.query.alerts === "1";
  if (!withAlerts) {
    return res.json({ success: true, data: doctors });
  }
  const today = new Date().toISOString().slice(0, 10);
  const enriched = doctors.map((d) => {
    const docCases = cases.filter((c) => c.doctorId === d.id && !["delivered", "cancelled"].includes(c.currentStatus) && c.expectedDeliveryDate < today);
    const docInvoices = invoices.filter((i) => i.doctorId === d.id && i.status !== "cancelled" && i.remainingAmount > 0 && i.dueDate < today);
    return {
      ...d,
      overdueInvoicesCount: docInvoices.length,
      overdueCasesCount: docCases.length,
      hasAlerts: d.totalDebt > 0 || docInvoices.length > 0 || docCases.length > 0,
    };
  });
  res.json({ success: true, data: enriched });
};

export const getDoctor: RequestHandler = (req, res) => {
  const doc = doctors.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Doctor not found" });
  res.json({ success: true, data: doc });
};

// GET /api/doctors/:id/overview - كل بيانات الطبيب مع التنبيهات
export const getDoctorOverview: RequestHandler = (req, res) => {
  const id = String(req.params.id || "");
  const doc = doctors.find((d) => d.id === id);
  if (!doc) return res.status(404).json({ success: false, error: "Doctor not found" });

  const docCases = cases.filter((c) => c.doctorId === id).sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  const docPatients = patients.filter((p) => p.doctorId === id);
  const docInvoices = invoices.filter((i) => i.doctorId === id && i.status !== "cancelled");

  const today = new Date().toISOString().slice(0, 10);
  const overdueInvoices = docInvoices.filter((i) => i.remainingAmount > 0 && i.dueDate < today);
  const overdueCases = docCases.filter((c) => !["delivered", "cancelled"].includes(c.currentStatus) && c.expectedDeliveryDate < today);

  const alerts: { type: string; title: string; count?: number; amount?: number; items?: any[] }[] = [];
  if (overdueInvoices.length > 0) {
    const total = overdueInvoices.reduce((s, i) => s + i.remainingAmount, 0);
    alerts.push({ type: "overdue_invoices", title: "فواتير متأخرة السداد", count: overdueInvoices.length, amount: total, items: overdueInvoices });
  }
  if (overdueCases.length > 0) {
    alerts.push({ type: "overdue_cases", title: "حالات متأخرة عن التسليم", count: overdueCases.length, items: overdueCases });
  }
  if (doc.totalDebt > 0) {
    alerts.push({ type: "debt", title: "مبلغ مدين", amount: doc.totalDebt });
  }

  const totalInvoiced = docInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = docInvoices.reduce((s, i) => s + i.paidAmount, 0);

  res.json({
    success: true,
    data: {
      doctor: doc,
      cases: docCases,
      patients: docPatients,
      invoices: docInvoices.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()),
      totalInvoiced,
      totalPaid,
      totalRemaining: totalInvoiced - totalPaid,
      collectionRate: totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0,
      alerts,
      overdueInvoicesCount: overdueInvoices.length,
      overdueCasesCount: overdueCases.length,
    },
  });
};

export const createDoctor: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const doc: Doctor = {
    id: generateId("doc"),
    ...req.body,
    totalCases: 0,
    totalDebt: 0,
    createdAt: new Date().toISOString(),
  };
  doctors.push(doc);
  persistDoctor(doc);
  logAudit(user.id, user.fullNameAr, "CREATE_DOCTOR", "doctor", doc.id, `Created doctor: ${doc.nameAr}`);
  res.status(201).json({ success: true, data: doc });
};

export const updateDoctor: RequestHandler = (req, res) => {
  const idx = doctors.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Doctor not found" });
  
  const user = (req as any).user;
  doctors[idx] = { ...doctors[idx], ...req.body };
  persistDoctor(doctors[idx]);
  logAudit(user.id, user.fullNameAr, "UPDATE_DOCTOR", "doctor", doctors[idx].id, `Updated doctor: ${doctors[idx].nameAr}`);
  res.json({ success: true, data: doctors[idx] });
};

export const deleteDoctor: RequestHandler = (req, res) => {
  const idx = doctors.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Doctor not found" });

  // Check if doctor has active cases
  const activeCases = cases.filter((c) => c.doctorId === req.params.id && !["delivered", "cancelled"].includes(c.currentStatus));
  if (activeCases.length > 0) {
    return res.status(400).json({ success: false, error: `لا يمكن حذف الطبيب - يوجد ${activeCases.length} حالات نشطة` });
  }

  const user = (req as any).user;
  const removed = doctors.splice(idx, 1)[0];
  removeDoctorFromDB(removed.id);
  logAudit(user.id, user.fullNameAr, "DELETE_DOCTOR", "doctor", removed.id, `Deleted doctor: ${removed.nameAr}`);
  res.json({ success: true, message: "Doctor deleted" });
};

// ── Patient Routes ──────────────────────────────

export const getPatients: RequestHandler = (req, res) => {
  let filtered = [...patients];
  if (req.query.doctorId) filtered = filtered.filter((p) => p.doctorId === req.query.doctorId);
  if (req.query.search) {
    const s = (req.query.search as string).toLowerCase();
    filtered = filtered.filter((p) => p.nameAr.includes(s) || p.name.toLowerCase().includes(s));
  }
  res.json({ success: true, data: filtered });
};

export const createPatient: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const patient: Patient = {
    id: generateId("pat"),
    ...req.body,
  };
  patients.push(patient);
  persistPatient(patient);
  logAudit(user.id, user.fullNameAr, "CREATE_PATIENT", "patient", patient.id, `Created patient: ${patient.nameAr}`);
  res.status(201).json({ success: true, data: patient });
};

export const updatePatient: RequestHandler = (req, res) => {
  const idx = patients.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Patient not found" });
  patients[idx] = { ...patients[idx], ...req.body };
  persistPatient(patients[idx]);
  res.json({ success: true, data: patients[idx] });
};
