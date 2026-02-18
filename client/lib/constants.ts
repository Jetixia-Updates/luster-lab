/**
 * Application constants - Labels, mappings, and configuration
 */

import type {
  CaseStatus, CaseWorkType, UserRole,
  RemovableProstheticType, OrthoRemovableType, RemovableFinalStatus,
} from "@shared/api";

export const STATUS_LABELS: Record<CaseStatus, { en: string; ar: string; color: string }> = {
  reception: { en: "Reception", ar: "الاستقبال", color: "bg-blue-100 text-blue-800" },
  cad_design: { en: "CAD Design", ar: "التصميم", color: "bg-purple-100 text-purple-800" },
  cam_milling: { en: "CAM/Milling", ar: "التفريز", color: "bg-orange-100 text-orange-800" },
  finishing: { en: "Porcelain", ar: "البورسلين", color: "bg-yellow-100 text-yellow-800" },
  removable: { en: "Removable Prosthetics", ar: "التركيبات المتحركة", color: "bg-teal-100 text-teal-800" },
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

/** المواد المستخدمة في معمل الأسنان */
export const DENTAL_MATERIALS = [
  // زركونيا
  { value: "Zirconia Multilayer", label: "زركونيا متعدد الطبقات" },
  { value: "Zirconia HT", label: "زركونيا شفاف HT" },
  { value: "Zirconia ST", label: "زركونيا فائق الشفافية ST" },
  { value: "Zirconia 3Y", label: "زركونيا 3Y" },
  { value: "Zirconia 5Y", label: "زركونيا 5Y" },
  { value: "Full Contour Zirconia", label: "زركونيا كونتور كامل" },
  // PFM ومعادن
  { value: "PFM (Metal Ceramic)", label: "PFM معدن/بورسلين" },
  { value: "Nickel Chrome", label: "نيكل كروم" },
  { value: "Cobalt Chrome", label: "كوبالت كروم" },
  { value: "Gold Alloy", label: "سبيكة ذهب" },
  // إي ماكس
  { value: "IPS e.max Press", label: "IPS e.max ضغط" },
  { value: "IPS e.max CAD", label: "IPS e.max CAD" },
  { value: "IPS e.max LT", label: "IPS e.max LT شفاف" },
  { value: "IPS e.max HT", label: "IPS e.max HT عالي الشفافية" },
  // زراعة
  { value: "Zirconia on Ti-Base", label: "زركونيا على قاعدة تيتانيوم" },
  { value: "Titanium Abutment", label: "قاعدة تيتانيوم" },
  { value: "Zirconia Abutment", label: "قاعدة زركونيا" },
  // تركيبات متحركة
  { value: "Acrylic Denture", label: "طقم أسنان أكريليك" },
  { value: "Flexible (Valplast)", label: "فليكس بلست/مرن" },
  { value: "Chrome Cobalt Partial", label: "جزئي كوبالت كروم" },
  { value: "Acrylic Partial", label: "جزئي أكريليك" },
  // كمبوزيت ومواد أخرى
  { value: "Composite Resin", label: "ريزن كمبوزيت" },
  { value: "Nanofill Composite", label: "كمبوزيت نانوفيل" },
  { value: "PMMA Temporary", label: "PMMA طربوش مؤقت" },
  { value: "Wax", label: "شمع" },
  { value: "Model Resin", label: "ريزن نماذج" },
  { value: "Other", label: "أخرى" },
];

export const WORKFLOW_ORDER: CaseStatus[] = [
  "reception", "cad_design", "cam_milling", "finishing", "removable",
  "quality_control", "accounting", "ready_for_delivery", "delivered",
];

/** أنواع التركيبات المتحركة */
export const REMOVABLE_PROSTHETIC_LABELS: Record<RemovableProstheticType, { ar: string }> = {
  denture_soft: { ar: "طقم سوفت" },
  denture_hard: { ar: "طقم هارد" },
  denture_repair: { ar: "تصليح طقم" },
  add_teeth: { ar: "إضافة أسنان" },
  soft_relining: { ar: "تبطين طقم ببطانه سوفت" },
  base_change: { ar: "تغيير قاعدة" },
  temp_acrylic_crown: { ar: "طربوش مؤقت اكريل" },
  other: { ar: "أخرى" },
};

/** أنواع التقويم مع التركيبات المتحركة */
export const ORTHO_REMOVABLE_LABELS: Record<OrthoRemovableType, { ar: string }> = {
  twin_block: { ar: "توين بلوك" },
  expansion_appliance: { ar: "جهاز توسيع" },
  hawley_retainer: { ar: "هاولي ريتينر" },
  space_maintainer: { ar: "حافظ مسافة" },
};

/** مراحل قسم التركيبات المتحركة */
export const REMOVABLE_STAGES = [
  { id: "arrange", name: "Tooth Arrangement", nameAr: "رص الأسنان" },
  { id: "cook", name: "Acrylic/Flex Cooking", nameAr: "طبخ الأكريل / الفليكس" },
  { id: "ready", name: "Ready", nameAr: "جاهز" },
];

/** الحالة النهائية للتركيبات المتحركة */
export const REMOVABLE_FINAL_LABELS: Record<RemovableFinalStatus, { ar: string }> = {
  try_in: { ar: "Try-In" },
  delivery: { ar: "Delivery" },
};
