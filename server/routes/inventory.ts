/**
 * Inventory Management Routes
 * Handles stock tracking, auto-deduction, and low-stock alerts
 */

import { RequestHandler } from "express";
import { inventoryItems, inventoryTransactions, generateId } from "../data/store";
import { logAudit } from "../middleware/audit";
import type { InventoryItem, InventoryTransaction, ApiResponse } from "@shared/api";

// GET /api/inventory
export const getInventory: RequestHandler = (req, res) => {
  let items = [...inventoryItems];
  
  if (req.query.category) {
    items = items.filter((i) => i.category === req.query.category);
  }
  if (req.query.lowStock === "true") {
    items = items.filter((i) => i.currentStock <= i.minimumStock);
  }
  if (req.query.search) {
    const s = (req.query.search as string).toLowerCase();
    items = items.filter((i) => 
      i.name.toLowerCase().includes(s) || 
      i.nameAr.includes(s) ||
      i.sku.toLowerCase().includes(s)
    );
  }

  res.json({ success: true, data: items });
};

// GET /api/inventory/:id
export const getInventoryItem: RequestHandler = (req, res) => {
  const item = inventoryItems.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: "Item not found" });
  res.json({ success: true, data: item });
};

// POST /api/inventory
export const createInventoryItem: RequestHandler = (req, res) => {
  const user = (req as any).user;
  const item: InventoryItem = {
    id: generateId("inv_item"),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  inventoryItems.push(item);
  logAudit(user.id, user.fullNameAr, "CREATE_INVENTORY", "inventory", item.id, `Added item: ${item.nameAr}`);
  res.status(201).json({ success: true, data: item });
};

// PUT /api/inventory/:id
export const updateInventoryItem: RequestHandler = (req, res) => {
  const idx = inventoryItems.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Item not found" });

  const user = (req as any).user;
  inventoryItems[idx] = { ...inventoryItems[idx], ...req.body, updatedAt: new Date().toISOString() };
  logAudit(user.id, user.fullNameAr, "UPDATE_INVENTORY", "inventory", inventoryItems[idx].id, `Updated item: ${inventoryItems[idx].nameAr}`);
  res.json({ success: true, data: inventoryItems[idx] });
};

// POST /api/inventory/:id/deduct - Auto deduction for cases
export const deductStock: RequestHandler = (req, res) => {
  const item = inventoryItems.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: "Item not found" });

  const { quantity, caseId, caseNumber, reason } = req.body;
  const user = (req as any).user;

  if (item.currentStock < quantity) {
    return res.status(400).json({ success: false, error: `Insufficient stock. Available: ${item.currentStock}` });
  }

  const prevStock = item.currentStock;
  item.currentStock -= quantity;
  item.updatedAt = new Date().toISOString();

  const tx: InventoryTransaction = {
    id: generateId("itx"),
    itemId: item.id,
    itemName: item.nameAr,
    type: "deduction",
    quantity,
    previousStock: prevStock,
    newStock: item.currentStock,
    caseId,
    caseNumber,
    reason: reason || `Auto deduction for case ${caseNumber}`,
    performedBy: user.id,
    performedByName: user.fullNameAr,
    createdAt: new Date().toISOString(),
  };
  inventoryTransactions.unshift(tx);

  logAudit(user.id, user.fullNameAr, "DEDUCT_STOCK", "inventory", item.id,
    `Deducted ${quantity} ${item.unit} of ${item.nameAr} for case ${caseNumber}`);

  // Check low stock alert
  const lowStockAlert = item.currentStock <= item.minimumStock;

  res.json({ success: true, data: { item, transaction: tx, lowStockAlert } });
};

// POST /api/inventory/:id/restock
export const restockItem: RequestHandler = (req, res) => {
  const item = inventoryItems.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: "Item not found" });

  const { quantity, reason } = req.body;
  const user = (req as any).user;

  const prevStock = item.currentStock;
  item.currentStock += quantity;
  item.lastRestockedAt = new Date().toISOString();
  item.updatedAt = new Date().toISOString();

  const tx: InventoryTransaction = {
    id: generateId("itx"),
    itemId: item.id,
    itemName: item.nameAr,
    type: "addition",
    quantity,
    previousStock: prevStock,
    newStock: item.currentStock,
    reason: reason || "Manual restock",
    performedBy: user.id,
    performedByName: user.fullNameAr,
    createdAt: new Date().toISOString(),
  };
  inventoryTransactions.unshift(tx);

  logAudit(user.id, user.fullNameAr, "RESTOCK", "inventory", item.id,
    `Restocked ${quantity} ${item.unit} of ${item.nameAr}`);

  res.json({ success: true, data: { item, transaction: tx } });
};

// DELETE /api/inventory/:id
export const deleteInventoryItem: RequestHandler = (req, res) => {
  const idx = inventoryItems.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Item not found" });
  
  const user = (req as any).user;
  const removed = inventoryItems.splice(idx, 1)[0];
  logAudit(user.id, user.fullNameAr, "DELETE_INVENTORY", "inventory", removed.id, `Deleted item: ${removed.nameAr}`);
  res.json({ success: true, message: "Item deleted" });
};

// GET /api/inventory/transactions
export const getTransactions: RequestHandler = (req, res) => {
  let txs = [...inventoryTransactions];
  if (req.query.itemId) txs = txs.filter((t) => t.itemId === req.query.itemId);
  if (req.query.caseId) txs = txs.filter((t) => t.caseId === req.query.caseId);
  res.json({ success: true, data: txs });
};

// GET /api/inventory/low-stock
export const getLowStockItems: RequestHandler = (_req, res) => {
  const lowStock = inventoryItems.filter((i) => i.currentStock <= i.minimumStock);
  res.json({ success: true, data: lowStock });
};

// ══════════════════════════════════════════
// INVENTORY ANALYTICS
// ══════════════════════════════════════════

// GET /api/inventory/analytics/category-summary
export const getCategorySummary: RequestHandler = (_req, res) => {
  const categoryLabels: Record<string, string> = {
    blocks: "بلوكات", raw_materials: "مواد خام", consumables: "مستلزمات", tools: "أدوات",
  };
  const cats: Record<string, { count: number; totalStock: number; totalValue: number; lowStockCount: number }> = {};
  inventoryItems.forEach((item) => {
    if (!cats[item.category]) cats[item.category] = { count: 0, totalStock: 0, totalValue: 0, lowStockCount: 0 };
    cats[item.category].count++;
    cats[item.category].totalStock += item.currentStock;
    cats[item.category].totalValue += item.currentStock * item.costPerUnit;
    if (item.currentStock <= item.minimumStock) cats[item.category].lowStockCount++;
  });
  const data = Object.entries(cats).map(([cat, d]) => ({
    category: cat,
    categoryAr: categoryLabels[cat] || cat,
    ...d,
  }));
  res.json({ success: true, data });
};

// GET /api/inventory/analytics/consumption
export const getConsumptionReport: RequestHandler = (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const recentTx = inventoryTransactions.filter((t) => t.type === "deduction" && t.createdAt >= since);

  // By item
  const byItem: Record<string, { itemName: string; totalUsed: number; txCount: number; cost: number }> = {};
  recentTx.forEach((tx) => {
    if (!byItem[tx.itemId]) byItem[tx.itemId] = { itemName: tx.itemName, totalUsed: 0, txCount: 0, cost: 0 };
    byItem[tx.itemId].totalUsed += tx.quantity;
    byItem[tx.itemId].txCount++;
    const item = inventoryItems.find((i) => i.id === tx.itemId);
    if (item) byItem[tx.itemId].cost += tx.quantity * item.costPerUnit;
  });

  const data = Object.entries(byItem)
    .map(([id, d]) => ({ itemId: id, ...d }))
    .sort((a, b) => b.totalUsed - a.totalUsed);

  res.json({ success: true, data, totalDeductions: recentTx.length });
};

// GET /api/inventory/analytics/supplier-summary
export const getSupplierSummary: RequestHandler = (_req, res) => {
  const suppliers: Record<string, { name: string; nameAr: string; itemCount: number; totalValue: number; items: string[] }> = {};
  inventoryItems.forEach((item) => {
    const key = item.supplier || "unknown";
    if (!suppliers[key]) suppliers[key] = { name: key, nameAr: (item as any).supplierAr || key, itemCount: 0, totalValue: 0, items: [] };
    suppliers[key].itemCount++;
    suppliers[key].totalValue += item.currentStock * item.costPerUnit;
    suppliers[key].items.push(item.nameAr);
  });
  const data = Object.values(suppliers).sort((a, b) => b.totalValue - a.totalValue);
  res.json({ success: true, data });
};

// GET /api/inventory/analytics/expiring
export const getExpiringItems: RequestHandler = (req, res) => {
  const daysAhead = parseInt(req.query.days as string) || 90;
  const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString();
  const items = inventoryItems
    .filter((i) => i.expiryDate && i.expiryDate <= cutoff)
    .map((i) => ({
      ...i,
      daysUntilExpiry: Math.ceil((new Date(i.expiryDate!).getTime() - Date.now()) / 86400000),
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  res.json({ success: true, data: items });
};

// GET /api/inventory/analytics/stock-levels
export const getStockLevels: RequestHandler = (_req, res) => {
  const levels = inventoryItems.map((item) => ({
    id: item.id,
    nameAr: item.nameAr,
    sku: item.sku,
    category: item.category,
    currentStock: item.currentStock,
    minimumStock: item.minimumStock,
    costPerUnit: item.costPerUnit,
    stockValue: item.currentStock * item.costPerUnit,
    stockPercent: item.minimumStock > 0 ? Math.round((item.currentStock / (item.minimumStock * 3)) * 100) : 100,
    status: item.currentStock <= 0 ? "out" : item.currentStock <= item.minimumStock ? "low" : item.currentStock <= item.minimumStock * 2 ? "ok" : "good",
  })).sort((a, b) => a.stockPercent - b.stockPercent);
  res.json({ success: true, data: levels });
};
