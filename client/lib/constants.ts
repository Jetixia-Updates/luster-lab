/**
 * Application constants - Labels, mappings, and configuration
 */

import type { CaseStatus, CaseWorkType, UserRole } from "@shared/api";

export const STATUS_LABELS: Record<CaseStatus, { en: string; ar: string; color: string }> = {
  reception: { en: "Reception", ar: "الاستقبال", color: "bg-blue-100 text-blue-800" },
  cad_design: { en: "CAD Design", ar: "التصميم", color: "bg-purple-100 text-purple-800" },
  cam_milling: { en: "CAM/Milling", ar: "التفريز", color: "bg-orange-100 text-orange-800" },
  finishing: { en: "Finishing", ar: "التشطيب والتلوين", color: "bg-yellow-100 text-yellow-800" },
  quality_control: { en: "Quality Control", ar: "مراقبة الجودة", color: "bg-cyan-100 text-cyan-800" },
  accounting: { en: "Accounting", ar: "الحسابات", color: "bg-green-100 text-green-800" },
  ready_for_delivery: { en: "Ready for Delivery", ar: "جاهز للتسليم", color: "bg-emerald-100 text-emerald-800" },
  delivered: { en: "Delivered", ar: "تم التسليم", color: "bg-green-200 text-green-900" },
  returned: { en: "Returned", ar: "مرتجع", color: "bg-red-100 text-red-800" },
  cancelled: { en: "Cancelled", ar: "ملغي", color: "bg-gray-100 text-gray-800" },
};

export const WORK_TYPE_LABELS: Record<CaseWorkType, { en: string; ar: string }> = {
  zirconia: { en: "Zirconia", ar: "زركونيا" },
  pfm: { en: "PFM", ar: "PFM معدن/بورسلين" },
  emax: { en: "E-max", ar: "إي ماكس" },
  implant: { en: "Implant", ar: "زراعة" },
  ortho: { en: "Orthodontics", ar: "تقويم" },
  removable: { en: "Removable", ar: "متحركة" },
  composite: { en: "Composite", ar: "كمبوزيت" },
  metal_framework: { en: "Metal Framework", ar: "هيكل معدني" },
  denture: { en: "Denture", ar: "طقم أسنان" },
  other: { en: "Other", ar: "أخرى" },
};

export const ROLE_LABELS: Record<UserRole, { en: string; ar: string }> = {
  admin: { en: "Admin", ar: "مدير النظام" },
  receptionist: { en: "Receptionist", ar: "موظف استقبال" },
  designer: { en: "Designer", ar: "مصمم" },
  technician: { en: "Technician", ar: "فني" },
  qc_manager: { en: "QC Manager", ar: "مدير الجودة" },
  accountant: { en: "Accountant", ar: "محاسب" },
  delivery_staff: { en: "Delivery", ar: "موظف تسليم" },
};

export const PRIORITY_LABELS = {
  normal: { en: "Normal", ar: "عادي", color: "bg-gray-100 text-gray-700" },
  urgent: { en: "Urgent", ar: "مستعجل", color: "bg-amber-100 text-amber-800" },
  rush: { en: "Rush", ar: "عاجل جداً", color: "bg-red-100 text-red-800" },
};

export const SHADE_COLORS = [
  "A1", "A2", "A3", "A3.5", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D2", "D3", "D4",
  "BL1", "BL2", "BL3", "BL4",
];

export const WORKFLOW_ORDER: CaseStatus[] = [
  "reception", "cad_design", "cam_milling", "finishing",
  "quality_control", "accounting", "ready_for_delivery", "delivered",
];
