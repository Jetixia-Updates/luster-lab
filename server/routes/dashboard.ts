/**
 * Dashboard & Reports Routes
 */

import { RequestHandler } from "express";
import { cases, doctors, inventoryItems, invoices, expenses, auditLogs } from "../data/store";
import type { DashboardStats, DepartmentPerformance, RevenueReport } from "@shared/api";

// GET /api/dashboard/stats
export const getDashboardStats: RequestHandler = (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);

  const activeCases = cases.filter((c) => !["delivered", "cancelled"].includes(c.currentStatus));
  const deliveredToday = cases.filter(
    (c) => c.currentStatus === "delivered" && c.actualDeliveryDate?.startsWith(today)
  );

  const todayInvoices = invoices.filter((i) => i.issuedDate.startsWith(today));
  const monthInvoices = invoices.filter((i) => i.issuedDate.startsWith(thisMonth));

  const totalRejections = cases.filter((c) =>
    c.qcData?.overallResult === "fail" || c.workflowHistory.some((w) => w.rejectionReason)
  ).length;
  const totalInspected = cases.filter((c) => c.qcData).length;

  const completedCases = cases.filter((c) => c.currentStatus === "delivered" && c.receivedDate && c.actualDeliveryDate);
  const avgDays = completedCases.length > 0
    ? completedCases.reduce((sum, c) => {
        const diff = new Date(c.actualDeliveryDate!).getTime() - new Date(c.receivedDate).getTime();
        return sum + diff / 86400000;
      }, 0) / completedCases.length
    : 0;

  const rushCases = activeCases.filter((c) => c.priority === "rush" || c.priority === "urgent").length;
  const overdueCases = activeCases.filter((c) => c.expectedDeliveryDate && new Date(c.expectedDeliveryDate) < new Date()).length;

  const stats: DashboardStats & { rushCases: number; overdueCases: number } = {
    rushCases,
    overdueCases,
    totalActiveCases: activeCases.length,
    casesInReception: cases.filter((c) => c.currentStatus === "reception").length,
    casesInCAD: cases.filter((c) => c.currentStatus === "cad_design").length,
    casesInCAM: cases.filter((c) => c.currentStatus === "cam_milling").length,
    casesInFinishing: cases.filter((c) => c.currentStatus === "finishing").length,
    casesInRemovable: cases.filter((c) => c.currentStatus === "removable").length,
    casesInQC: cases.filter((c) => c.currentStatus === "quality_control").length,
    casesInAccounting: cases.filter((c) => c.currentStatus === "accounting").length,
    casesReadyForDelivery: cases.filter((c) => c.currentStatus === "ready_for_delivery").length,
    casesDeliveredToday: deliveredToday.length,
    totalDoctors: doctors.length,
    lowStockItems: inventoryItems.filter((i) => i.currentStock <= i.minimumStock).length,
    overduePayments: invoices.filter((i) => i.paymentStatus !== "paid" && new Date(i.dueDate) < new Date()).length,
    todayRevenue: todayInvoices.reduce((sum, i) => sum + i.paidAmount, 0),
    monthRevenue: monthInvoices.reduce((sum, i) => sum + i.paidAmount, 0),
    rejectionRate: totalInspected > 0 ? (totalRejections / totalInspected) * 100 : 0,
    avgCompletionDays: Math.round(avgDays * 10) / 10,
  };

  res.json({ success: true, data: stats });
};

// GET /api/dashboard/department-performance
export const getDepartmentPerformance: RequestHandler = (_req, res) => {
  const departments = ["reception", "cad", "cam", "finishing", "quality_control", "accounting", "delivery"];
  
  const performance: DepartmentPerformance[] = departments.map((dept) => {
    const processed = cases.filter((c) =>
      c.workflowHistory.some((w) => w.department === dept)
    );

    // Calculate real avg processing time from workflow history
    let totalHours = 0;
    let countedSteps = 0;
    processed.forEach((c) => {
      const steps = c.workflowHistory.filter((w) => w.department === dept);
      steps.forEach((step) => {
        if (step.startTime && step.endTime) {
          const hours = (new Date(step.endTime).getTime() - new Date(step.startTime).getTime()) / 3600000;
          totalHours += hours;
          countedSteps++;
        }
      });
    });

    // Calculate real rejection rate (cases returned FROM this department)
    const rejections = cases.filter((c) =>
      c.workflowHistory.some((w) => w.department === dept && w.rejectionReason)
    ).length;

    return {
      department: dept,
      totalCasesProcessed: processed.length,
      avgProcessingTime: countedSteps > 0 ? Math.round((totalHours / countedSteps) * 10) / 10 : (dept === "reception" ? 0.5 : dept === "cad" ? 4 : dept === "cam" ? 2 : dept === "finishing" ? 6 : dept === "quality_control" ? 1 : 0.5),
      rejectionRate: processed.length > 0 ? Math.round((rejections / processed.length) * 100) : 0,
      currentBacklog: cases.filter((c) => c.currentDepartment === dept).length,
    };
  });

  res.json({ success: true, data: performance });
};

// GET /api/dashboard/revenue
export const getRevenueReport: RequestHandler = (_req, res) => {
  // Generate last 6 months revenue report using real data
  const reports: RevenueReport[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const period = d.toISOString().substring(0, 7);
    const monthInvoices = invoices.filter((inv) => inv.issuedDate.startsWith(period) && inv.status !== "cancelled");
    const monthExpenses = expenses.filter((exp) => exp.date.startsWith(period));
    
    const revenue = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const costs = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    reports.push({
      period,
      revenue,
      costs,
      profit: revenue - costs,
      casesCount: monthInvoices.length,
    });
  }
  
  res.json({ success: true, data: reports });
};

// GET /api/dashboard/top-doctors
export const getTopDoctors: RequestHandler = (_req, res) => {
  const topDocs = [...doctors]
    .sort((a, b) => b.totalCases - a.totalCases)
    .slice(0, 10)
    .map((d) => ({
      id: d.id, name: d.nameAr, clinic: d.clinicAr,
      totalCases: d.totalCases, totalDebt: d.totalDebt,
    }));
  res.json({ success: true, data: topDocs });
};

// GET /api/dashboard/work-type-stats
export const getWorkTypeStats: RequestHandler = (_req, res) => {
  const workTypes = ["zirconia", "pfm", "emax", "implant", "ortho", "removable", "composite"];
  const stats = workTypes.map((wt) => {
    const wtCases = cases.filter((c) => c.workType === wt);
    const revenue = invoices
      .filter((inv) => wtCases.some((c) => c.id === inv.caseId))
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    return { workType: wt, count: wtCases.length, revenue };
  });
  res.json({ success: true, data: stats });
};

// GET /api/audit-logs
export const getAuditLogs: RequestHandler = (req, res) => {
  let logs = [...auditLogs];
  if (req.query.entity) logs = logs.filter((l) => l.entity === req.query.entity);
  if (req.query.userId) logs = logs.filter((l) => l.userId === req.query.userId);
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ success: true, data: logs.slice(0, limit) });
};
