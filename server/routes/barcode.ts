/**
 * Barcode & QR Module - Full Management API
 * الملصقات، السجلات، وسجل العمليات
 */

import { RequestHandler } from "express";
import {
  barcodeLabels,
  barcodeLogs,
  generateId,
  persistBarcodeLabel,
  persistBarcodeLog,
  removeBarcodeLabelFromDB,
} from "../data/store";
import type { BarcodeLabel, BarcodeLog } from "@shared/api";

function addLog(
  action: BarcodeLog["action"],
  barcodeValue: string,
  user: { id: string; fullNameAr?: string; fullName?: string },
  extra?: Partial<BarcodeLog>
) {
  const log: BarcodeLog = {
    id: generateId("bclog"),
    action,
    barcodeValue,
    performedBy: user.id,
    performedByName: (user.fullNameAr || user.fullName) || "",
    createdAt: new Date().toISOString(),
    ...extra,
  };
  barcodeLogs.unshift(log);
  persistBarcodeLog(log);
}

// GET /api/barcode/labels
export const getBarcodeLabels: RequestHandler = (req, res) => {
  let list = [...barcodeLabels];
  const search = (req.query.search as string)?.toLowerCase();
  if (req.query.labelType) list = list.filter((l) => (l.labelType || "case") === req.query.labelType);
  if (search) {
    list = list.filter(
      (l) =>
        l.barcodeValue.toLowerCase().includes(search) ||
        (l.labelName || "").toLowerCase().includes(search) ||
        (l.patientName || "").toLowerCase().includes(search) ||
        (l.caseNumber || "").toLowerCase().includes(search) ||
        (l.productName || "").toLowerCase().includes(search)
    );
  }
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, data: list });
};

// GET /api/barcode/labels/:id
export const getBarcodeLabel: RequestHandler = (req, res) => {
  const label = barcodeLabels.find((l) => l.id === req.params.id);
  if (!label) return res.status(404).json({ success: false, error: "الملصق غير موجود" });
  res.json({ success: true, data: label });
};

// POST /api/barcode/labels
export const createBarcodeLabel: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const body = req.body as Partial<BarcodeLabel>;

  const label: BarcodeLabel = {
    id: generateId("bclabel"),
    labelType: body.labelType || "case",
    barcodeValue: body.barcodeValue || "",
    labelName: body.labelName,
    caseId: body.caseId,
    caseNumber: body.caseNumber,
    patientName: body.patientName,
    doctorName: body.doctorName,
    receivedDate: body.receivedDate,
    productName: body.productName,
    weightKg: body.weightKg,
    weightGrams: body.weightGrams,
    quantity: body.quantity,
    quantityUnit: body.quantityUnit,
    expectedDeliveryDate: body.expectedDeliveryDate,
    actualDeliveryDate: body.actualDeliveryDate,
    notes: body.notes,
    createdBy: user.id,
    createdByName: (user.fullNameAr || (user as any).fullName) || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  barcodeLabels.unshift(label);
  persistBarcodeLabel(label);
  addLog("create", label.barcodeValue, user, { labelId: label.id, labelName: label.labelName });

  res.status(201).json({ success: true, data: label });
};

// PUT /api/barcode/labels/:id
export const updateBarcodeLabel: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const idx = barcodeLabels.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "الملصق غير موجود" });

  const body = req.body as Partial<BarcodeLabel>;
  const prev = barcodeLabels[idx];
  barcodeLabels[idx] = {
    ...prev,
    ...body,
    id: prev.id,
    barcodeValue: body.barcodeValue ?? prev.barcodeValue,
    updatedAt: new Date().toISOString(),
    updatedBy: user.id,
    updatedByName: (user.fullNameAr || (user as any).fullName) || "",
  };

  persistBarcodeLabel(barcodeLabels[idx]);
  addLog("edit", barcodeLabels[idx].barcodeValue, user, { labelId: prev.id });

  res.json({ success: true, data: barcodeLabels[idx] });
};

// DELETE /api/barcode/labels/:id
export const deleteBarcodeLabel: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const idx = barcodeLabels.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "الملصق غير موجود" });

  const removed = barcodeLabels.splice(idx, 1)[0];
  removeBarcodeLabelFromDB(removed.id);
  addLog("delete", removed.barcodeValue, user, { labelId: removed.id });

  res.json({ success: true, message: "تم الحذف" });
};

// GET /api/barcode/logs
export const getBarcodeLogs: RequestHandler = (req, res) => {
  let list = [...barcodeLogs];
  const action = req.query.action as string;
  if (action) list = list.filter((l) => l.action === action);
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  list = list.slice(0, limit);
  res.json({ success: true, data: list });
};

// POST /api/barcode/log - تسجيل عملية (مسح، توليد، طباعة)
export const logBarcodeAction: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const { action, barcodeValue, labelId, labelName, caseId, caseNumber, metadata } = req.body;

  addLog(action, barcodeValue || "", user, {
    labelId,
    labelName,
    caseId,
    caseNumber,
    metadata,
  });

  res.json({ success: true });
};
