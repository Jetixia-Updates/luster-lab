/**
 * Doctor Management Routes
 */

import { RequestHandler } from "express";
import { doctors, patients, cases, generateId, persistDoctor, persistPatient, removeDoctorFromDB } from "../data/store";
import { logAudit } from "../middleware/audit";
import type { Doctor, Patient, ApiResponse } from "@shared/api";

export const getDoctors: RequestHandler = (_req, res) => {
  res.json({ success: true, data: doctors });
};

export const getDoctor: RequestHandler = (req, res) => {
  const doc = doctors.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: "Doctor not found" });
  res.json({ success: true, data: doc });
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
