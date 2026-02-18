/**
 * Attendance & Payroll - حضور وإنصراف، رواتب، خصومات
 * يدعم استيراد CSV من أي جهاز بصمة (ZKteco, ANVIZ, إلخ)
 */

import { RequestHandler } from "express";
import {
  users,
  attendanceRecords,
  payrollPeriods,
  payrollEntries,
  generateId,
  persistAttendanceRecord,
  persistPayrollPeriod,
  persistPayrollEntry,
  removeAttendanceRecordFromDB,
} from "../data/store";
import type {
  AttendanceRecord,
  PayrollEntry,
  PayrollPeriod,
  EmployeeAttendanceReport,
  EmployeeAttendanceDay,
} from "@shared/api";

const DEFAULT_WORK_START = "09:00";
const DEFAULT_WORK_END = "17:00";

function parseTime(t: string): number {
  if (!t || t.length < 5) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// GET /api/attendance/report - تقرير حضور موظف (حضور، انصراف، وقت إضافي، تأخير)
export const getAttendanceReport: RequestHandler = (req, res) => {
  const { userId, from, to } = req.query;
  if (!userId || !from || !to) {
    return res.status(400).json({ success: false, error: "userId, from, to مطلوبة" });
  }
  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ success: false, error: "الموظف غير موجود" });

  const workStart = user.workStartTime || DEFAULT_WORK_START;
  const workEnd = user.workEndTime || DEFAULT_WORK_END;
  const workStartMins = parseTime(workStart);
  const workEndMins = parseTime(workEnd);
  const workDayMins = workEndMins > workStartMins ? workEndMins - workStartMins : (24 * 60 - workStartMins) + workEndMins;

  const recs = attendanceRecords.filter(
    (a) => a.userId === userId && a.date >= (from as string) && a.date <= (to as string)
  );
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const r of recs) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }

  const days: EmployeeAttendanceDay[] = [];
  const fromD = new Date(from as string);
  const toD = new Date(to as string);
  for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dayRecs = (byDate.get(dateStr) || []).sort((a, b) => `${a.checkIn || ""}`.localeCompare(`${b.checkIn || ""}`));
    const checkIn = dayRecs.map((r) => r.checkIn).filter(Boolean).sort()[0] || null;
    const checkOut = dayRecs.map((r) => r.checkOut).filter(Boolean).pop() || null;
    const present = dayRecs.length > 0;
    let lateMinutes = 0;
    let overtimeMinutes = 0;
    let workMinutes = 0;
    if (present && checkIn) {
      const ci = parseTime(checkIn);
      if (ci > workStartMins) lateMinutes = ci - workStartMins;
    }
    if (present && checkOut) {
      const co = parseTime(checkOut);
      if (co > workEndMins) overtimeMinutes = co - workEndMins;
      const ci = parseTime(checkIn || workStart);
      workMinutes = Math.max(0, co - ci);
    }
    days.push({
      date: dateStr,
      checkIn,
      checkOut,
      lateMinutes,
      overtimeMinutes,
      workMinutes,
      present,
    });
  }

  const totalPresent = days.filter((d) => d.present).length;
  const totalAbsent = days.filter((d) => !d.present).length;
  const totalLate = days.reduce((s, d) => s + d.lateMinutes, 0);
  const totalOvertime = days.reduce((s, d) => s + d.overtimeMinutes, 0);

  const report: EmployeeAttendanceReport = {
    userId: user.id,
    userName: user.fullNameAr || user.fullName,
    from: from as string,
    to: to as string,
    workStartTime: workStart,
    workEndTime: workEnd,
    days,
    totalPresentDays: totalPresent,
    totalAbsentDays: totalAbsent,
    totalLateMinutes: totalLate,
    totalOvertimeMinutes: totalOvertime,
    avgLateMinutes: totalPresent > 0 ? Math.round(totalLate / totalPresent) : 0,
    avgOvertimeMinutes: totalPresent > 0 ? Math.round(totalOvertime / totalPresent) : 0,
  };
  res.json({ success: true, data: report });
};

// GET /api/attendance/reports - تقارير كل الموظفين
export const getAttendanceReports: RequestHandler = (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, error: "from, to مطلوبة" });
  }
  const empIds = [...new Set(attendanceRecords.map((a) => a.userId))];
  const activeUsers = users.filter((u) => u.active && (u.fingerprintId || empIds.includes(u.id)));
  const reports: EmployeeAttendanceReport[] = [];
  for (const u of activeUsers) {
    const user = users.find((x) => x.id === u.id)!;
    const workStart = user.workStartTime || DEFAULT_WORK_START;
    const workEnd = user.workEndTime || DEFAULT_WORK_END;
    const workStartMins = parseTime(workStart);
    const workEndMins = parseTime(workEnd);

    const recs = attendanceRecords.filter(
      (a) => a.userId === u.id && a.date >= (from as string) && a.date <= (to as string)
    );
    const byDate = new Map<string, AttendanceRecord[]>();
    for (const r of recs) {
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date)!.push(r);
    }

    const fromD = new Date(from as string);
    const toD = new Date(to as string);
    const days: EmployeeAttendanceDay[] = [];
    for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayRecs = (byDate.get(dateStr) || []).sort((a, b) => `${a.checkIn || ""}`.localeCompare(`${b.checkIn || ""}`));
      const checkIn = dayRecs.map((r) => r.checkIn).filter(Boolean).sort()[0] || null;
      const checkOut = dayRecs.map((r) => r.checkOut).filter(Boolean).pop() || null;
      const present = dayRecs.length > 0;
      let lateMinutes = 0;
      let overtimeMinutes = 0;
      let workMinutes = 0;
      if (present && checkIn) {
        const ci = parseTime(checkIn);
        if (ci > workStartMins) lateMinutes = ci - workStartMins;
      }
      if (present && checkOut) {
        const co = parseTime(checkOut);
        if (co > workEndMins) overtimeMinutes = co - workEndMins;
        const ci = parseTime(checkIn || workStart);
        workMinutes = Math.max(0, co - ci);
      }
      days.push({ date: dateStr, checkIn, checkOut, lateMinutes, overtimeMinutes, workMinutes, present });
    }

    const totalPresent = days.filter((d) => d.present).length;
    const totalAbsent = days.filter((d) => !d.present).length;
    const totalLate = days.reduce((s, d) => s + d.lateMinutes, 0);
    const totalOvertime = days.reduce((s, d) => s + d.overtimeMinutes, 0);

    reports.push({
      userId: u.id,
      userName: user.fullNameAr || user.fullName,
      from: from as string,
      to: to as string,
      workStartTime: workStart,
      workEndTime: workEnd,
      days,
      totalPresentDays: totalPresent,
      totalAbsentDays: totalAbsent,
      totalLateMinutes: totalLate,
      totalOvertimeMinutes: totalOvertime,
      avgLateMinutes: totalPresent > 0 ? Math.round(totalLate / totalPresent) : 0,
      avgOvertimeMinutes: totalPresent > 0 ? Math.round(totalOvertime / totalPresent) : 0,
    });
  }
  res.json({ success: true, data: reports });
};

// GET /api/attendance
export const getAttendance: RequestHandler = (req, res) => {
  let list = [...attendanceRecords];
  if (req.query.userId) list = list.filter((a) => a.userId === req.query.userId);
  if (req.query.date) list = list.filter((a) => a.date === req.query.date);
  if (req.query.from) list = list.filter((a) => a.date >= (req.query.from as string));
  if (req.query.to) list = list.filter((a) => a.date <= (req.query.to as string));
  list.sort((a, b) => `${b.date}${b.checkIn || ""}`.localeCompare(`${a.date}${a.checkIn || ""}`));
  res.json({ success: true, data: list });
};

// POST /api/attendance - تسجيل يدوي
export const createAttendance: RequestHandler = (req, res) => {
  const body = req.body;
  const user = users.find((u) => u.id === body.userId || u.fingerprintId === body.fingerprintId);
  if (!user) return res.status(400).json({ success: false, error: "الموظف غير موجود" });

  const rec: AttendanceRecord = {
    id: generateId("att"),
    userId: user.id,
    userName: user.fullNameAr || user.fullName,
    fingerprintId: user.fingerprintId,
    date: body.date || new Date().toISOString().slice(0, 10),
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    punchType: body.punchType,
    source: "manual",
    notes: body.notes,
    createdAt: new Date().toISOString(),
  };
  attendanceRecords.push(rec);
  persistAttendanceRecord(rec);
  res.status(201).json({ success: true, data: rec });
};

// POST /api/attendance/punch - تسجيل حضور/انصراف بالبصمة (يعمل مع أي جهاز أو محاكاة)
export const punchAttendance: RequestHandler = (req, res) => {
  const { fingerprintId } = req.body;
  if (!fingerprintId) return res.status(400).json({ success: false, error: "رقم البصمة مطلوب" });

  const user = users.find((u) => u.active && (u.fingerprintId === String(fingerprintId).trim() || u.id === fingerprintId || u.username === fingerprintId));
  if (!user) return res.status(404).json({ success: false, error: "الموظف غير مسجل أو غير مفعل" });

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toTimeString().slice(0, 5);
  const todayRecords = attendanceRecords
    .filter((a) => a.userId === user.id && a.date === today)
    .sort((a, b) => `${b.date} ${b.checkIn || ""} ${b.checkOut || ""}`.localeCompare(`${a.date} ${a.checkIn || ""} ${a.checkOut || ""}`));

  const last = todayRecords[0];
  let action: "checkIn" | "checkOut";
  let record: AttendanceRecord;

  if (!last || last.checkOut) {
    action = "checkIn";
    record = {
      id: generateId("att"),
      userId: user.id,
      userName: user.fullNameAr || user.fullName,
      fingerprintId: user.fingerprintId,
      date: today,
      checkIn: now,
      punchType: "in",
      source: "fingerprint",
      deviceId: "web",
      createdAt: new Date().toISOString(),
    };
    attendanceRecords.push(record);
    persistAttendanceRecord(record);
  } else {
    action = "checkOut";
    last.checkOut = now;
    last.punchType = "out";
    persistAttendanceRecord(last);
    record = last;
  }

  res.json({ success: true, action, data: record, userName: user.fullNameAr || user.fullName });
};

// GET /api/attendance/kiosk-data - بيانات محطة البصمة (عام - بدون تسجيل دخول)
export const getKioskData: RequestHandler = (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const kioskUsers = users.filter((u) => u.active && (u.fingerprintId || (u as any).faceDescriptor));
  const todayRecs = attendanceRecords.filter((a) => a.date === today);
  const usersMin = kioskUsers.map((u) => ({
    id: u.id,
    fullNameAr: u.fullNameAr || u.fullName,
    fingerprintId: u.fingerprintId,
    faceDescriptor: (u as any).faceDescriptor,
  }));
  const status = kioskUsers.map((u) => {
    const recs = todayRecs.filter((r) => r.userId === u.id);
    const last = recs.sort((a, b) => `${b.checkIn || ""}${b.checkOut || ""}`.localeCompare(`${a.checkIn || ""}${a.checkOut || ""}`))[0];
    const isIn = last && last.checkIn && !last.checkOut;
    const checkIn = recs.map((r) => r.checkIn).filter(Boolean).sort()[0];
    const checkOut = recs.map((r) => r.checkOut).filter(Boolean).pop();
    return {
      userId: u.id,
      userName: u.fullNameAr || u.fullName,
      fingerprintId: u.fingerprintId,
      present: recs.length > 0,
      isCurrentlyIn: isIn,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      lastPunch: last ? (last.checkOut || last.checkIn) : null,
    };
  });
  res.json({ success: true, data: { users: usersMin, todayStatus: status, date: today } });
};

// POST /api/attendance/punch - also accepts userId for face recognition
// GET /api/attendance/today - حالة الحضور اليوم لجميع الموظفين
export const getTodayStatus: RequestHandler = (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const withFingerprint = users.filter((u) => u.active && u.fingerprintId);
  const todayRecs = attendanceRecords.filter((a) => a.date === today);
  const status = withFingerprint.map((u) => {
    const recs = todayRecs.filter((r) => r.userId === u.id);
    const last = recs.sort((a, b) => `${b.checkIn || ""}${b.checkOut || ""}`.localeCompare(`${a.checkIn || ""}${a.checkOut || ""}`))[0];
    const isIn = last && last.checkIn && !last.checkOut;
    const checkIn = recs.map((r) => r.checkIn).filter(Boolean).sort()[0];
    const checkOut = recs.map((r) => r.checkOut).filter(Boolean).pop();
    return {
      userId: u.id,
      userName: u.fullNameAr || u.fullName,
      fingerprintId: u.fingerprintId,
      present: recs.length > 0,
      isCurrentlyIn: isIn,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      lastPunch: last ? (last.checkOut || last.checkIn) : null,
    };
  });
  res.json({ success: true, data: status, date: today });
};

// PUT /api/attendance/:id
export const updateAttendance: RequestHandler = (req, res) => {
  const idx = attendanceRecords.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "السجل غير موجود" });
  const { date, checkIn, checkOut } = req.body;
  if (date) attendanceRecords[idx].date = date;
  if (checkIn !== undefined) attendanceRecords[idx].checkIn = checkIn || undefined;
  if (checkOut !== undefined) attendanceRecords[idx].checkOut = checkOut || undefined;
  persistAttendanceRecord(attendanceRecords[idx]);
  res.json({ success: true, data: attendanceRecords[idx] });
};

// DELETE /api/attendance/:id
export const deleteAttendance: RequestHandler = (req, res) => {
  const idx = attendanceRecords.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "السجل غير موجود" });
  const [rec] = attendanceRecords.splice(idx, 1);
  removeAttendanceRecordFromDB(rec.id);
  res.json({ success: true, deleted: rec.id });
};

// POST /api/attendance/import - استيراد من CSV (أي جهاز بصمة)
export const importAttendanceCSV: RequestHandler = (req, res) => {
  const { rows, mapping } = req.body as {
    rows: string[][];
    mapping?: { userId?: number; userName?: number; date?: number; time?: number; punch?: number };
  };
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, error: "لا توجد بيانات للاستيراد" });
  }

  const col = mapping || { userId: 0, userName: 1, date: 2, time: 3, punch: 4 };
  const idx = (k: keyof typeof col) => col[k] ?? 0;
  const imported: AttendanceRecord[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const rawUserId = String(row[idx("userId")] ?? row[0] ?? "").trim();
    const rawDate = String(row[idx("date")] ?? row[2] ?? "").trim();
    const rawTime = String(row[idx("time")] ?? row[3] ?? "").trim();
    const rawPunch = String(row[idx("punch")] ?? row[4] ?? "in").trim().toLowerCase();
    if (!rawUserId || !rawDate) continue;

    const user = users.find(
      (u) =>
        u.id === rawUserId ||
        u.fingerprintId === rawUserId ||
        String(u.username) === rawUserId ||
        (u.fullNameAr && u.fullNameAr.includes(rawUserId))
    );
    if (!user) {
      errors.push(`السطر ${i + 1}: الموظف "${rawUserId}" غير موجود`);
      continue;
    }

    let dateStr = rawDate;
    if (rawDate.includes("/")) dateStr = rawDate.split("/").reverse().join("-");
    else if (rawDate.length === 8) dateStr = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6)}`;

    const timeStr = rawTime ? (rawTime.length <= 5 ? rawTime : rawTime.slice(0, 5)) : undefined;
    const isOut = rawPunch === "out" || rawPunch === "0" || rawPunch === "خروج";

    const rec: AttendanceRecord = {
      id: generateId("att"),
      userId: user.id,
      userName: user.fullNameAr || user.fullName,
      fingerprintId: user.fingerprintId || rawUserId,
      date: dateStr,
      checkIn: !isOut ? timeStr : undefined,
      checkOut: isOut ? timeStr : undefined,
      punchType: isOut ? "out" : "in",
      source: "import",
      deviceId: "csv",
      createdAt: new Date().toISOString(),
    };
    attendanceRecords.push(rec);
    persistAttendanceRecord(rec);
    imported.push(rec);
  }

  res.json({ success: true, imported: imported.length, errors, data: imported });
};

// GET /api/payroll/periods
export const getPayrollPeriods: RequestHandler = (_req, res) => {
  const list = [...payrollPeriods].sort((a, b) => b.year - a.year || b.month - a.month);
  res.json({ success: true, data: list });
};

// GET /api/payroll/periods/:id
export const getPayrollPeriod: RequestHandler = (req, res) => {
  const period = payrollPeriods.find((p) => p.id === req.params.id);
  if (!period) return res.status(404).json({ success: false, error: "الدورة غير موجودة" });
  const entries = payrollEntries.filter((e) => e.periodId === period.id);
  res.json({ success: true, data: { ...period, entries } });
};

// POST /api/payroll/periods - إنشاء دورة وحساب تلقائي
export const createPayrollPeriod: RequestHandler = (req, res) => {
  const { year, month } = req.body;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  if (payrollPeriods.some((p) => p.year === y && p.month === m)) {
    return res.status(400).json({ success: false, error: "الدورة موجودة مسبقاً" });
  }

  const period: PayrollPeriod = {
    id: generateId("payperiod"),
    year: y,
    month: m,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  payrollPeriods.push(period);
  persistPayrollPeriod(period);

  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const toLast = new Date(y, m, 0);
  const to = `${y}-${String(m).padStart(2, "0")}-${String(toLast.getDate()).padStart(2, "0")}`;
  const records = attendanceRecords.filter((a) => a.date >= from && a.date <= to);

  const entries: PayrollEntry[] = [];
  const activeUsers = users.filter((u) => u.active && (u.baseSalary ?? 0) > 0);
  const WORK_DAY_HOURS = 8;
  const LATE_THRESHOLD = 15;

  for (const u of activeUsers) {
    const userRecs = records.filter((r) => r.userId === u.id);
    const daysPresent = new Set(userRecs.map((r) => r.date)).size;
    const totalDays = toLast.getDate();
    const absenceDays = Math.max(0, totalDays - daysPresent);

    const workStart = u.workStartTime || DEFAULT_WORK_START;
    const expectedMins = parseTime(workStart);
    let lateMinutes = 0;
    for (const r of userRecs) {
      if (r.checkIn) {
        const mins = parseTime(r.checkIn);
        if (mins > expectedMins) lateMinutes += mins - expectedMins;
      }
    }

    const baseSalary = u.baseSalary ?? 0;
    const daySalary = totalDays > 0 ? baseSalary / totalDays : 0;
    const absenceDeduction = Math.round(absenceDays * daySalary);
    const lateDeduction = Math.round((lateMinutes / 60) * (daySalary / WORK_DAY_HOURS));
    const otherDeductions = 0;
    const totalDeductions = absenceDeduction + lateDeduction + otherDeductions;
    const netSalary = Math.max(0, baseSalary - totalDeductions);

    const entry: PayrollEntry = {
      id: generateId("payentry"),
      periodId: period.id,
      userId: u.id,
      userName: u.fullNameAr || u.fullName,
      baseSalary,
      overtime: 0,
      allowances: 0,
      absenceDays,
      absenceDeduction,
      lateMinutes,
      lateDeduction,
      otherDeductions,
      totalDeductions,
      netSalary,
      createdAt: new Date().toISOString(),
    };
    payrollEntries.push(entry);
    persistPayrollEntry(entry);
    entries.push(entry);
  }

  res.status(201).json({ success: true, data: { ...period, entries } });
};

// PUT /api/payroll/periods/:id/status
export const updatePayrollStatus: RequestHandler = (req, res) => {
  const p = payrollPeriods.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ success: false, error: "الدورة غير موجودة" });
  const { status } = req.body;
  if (["draft", "approved", "paid"].includes(status)) {
    p.status = status;
    persistPayrollPeriod(p);
  }
  res.json({ success: true, data: p });
};

// PUT /api/payroll/entries/:id
export const updatePayrollEntry: RequestHandler = (req, res) => {
  const idx = payrollEntries.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "السجل غير موجود" });
  const body = req.body;
  const e = payrollEntries[idx];
  const base = body.baseSalary ?? e.baseSalary;
  const overtime = body.overtime ?? e.overtime;
  const allowances = body.allowances ?? e.allowances;
  const absenceDeduction = body.absenceDeduction ?? e.absenceDeduction;
  const lateDeduction = body.lateDeduction ?? e.lateDeduction;
  const otherDeductions = body.otherDeductions ?? e.otherDeductions;
  payrollEntries[idx] = {
    ...e,
    ...body,
    baseSalary: base,
    overtime,
    allowances,
    absenceDeduction,
    lateDeduction,
    otherDeductions,
    totalDeductions: absenceDeduction + lateDeduction + otherDeductions,
    netSalary: Math.max(0, base + overtime + allowances - (absenceDeduction + lateDeduction + otherDeductions)),
  };
  persistPayrollEntry(payrollEntries[idx]);
  res.json({ success: true, data: payrollEntries[idx] });
};
