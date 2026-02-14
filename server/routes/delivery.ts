/**
 * Delivery Management Routes
 */

import { RequestHandler } from "express";
import { deliveries, cases, generateId, persistDelivery, persistCase, persistAuditLog } from "../data/store";
import { logAudit } from "../middleware/audit";
import type { Delivery } from "@shared/api";

// GET /api/deliveries
export const getDeliveries: RequestHandler = (_req, res) => {
  res.json({ success: true, data: deliveries });
};

// POST /api/deliveries
export const createDelivery: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const { caseId, receivedBy, notes } = req.body;

  const dentalCase = cases.find((c) => c.id === caseId);
  if (!dentalCase) return res.status(404).json({ success: false, error: "Case not found" });

  if (dentalCase.currentStatus !== "ready_for_delivery") {
    return res.status(400).json({
      success: false,
      error: "Case must be in ready_for_delivery status",
    });
  }

  const delivery: Delivery = {
    id: generateId("del"),
    caseId: dentalCase.id,
    caseNumber: dentalCase.caseNumber,
    doctorId: dentalCase.doctorId,
    doctorName: dentalCase.doctorName,
    deliveryDate: new Date().toISOString(),
    receivedBy,
    paymentStatus: dentalCase.invoiceId ? "paid" : "unpaid",
    invoiceId: dentalCase.invoiceId,
    notes,
    archived: false,
    createdBy: user.id,
  };

  deliveries.unshift(delivery);
  persistDelivery(delivery);

  dentalCase.currentStatus = "delivered";
  dentalCase.actualDeliveryDate = delivery.deliveryDate;
  dentalCase.updatedAt = new Date().toISOString();
  persistCase(dentalCase);

  const log = logAudit(user.id, user.fullNameAr, "DELIVER_CASE", "delivery", delivery.id,
    `Delivered case ${dentalCase.caseNumber} to ${dentalCase.doctorName}`);
  persistAuditLog(log);

  res.status(201).json({ success: true, data: delivery });
};
