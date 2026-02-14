/**
 * CAD/CAM Software Integration
 * ============================
 * تكامل حقيقي مع برامج التصميم - تصدير وفتح الملفات
 */

import type { DentalCase, CaseAttachment } from "./api";

export interface CADSoftwareConfig {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  extensions: string[];
  /** Protocol for desktop launch (e.g. exocad://) - optional */
  protocol?: string;
  /** Folder structure for export */
  exportFolder?: string;
  /** File naming convention */
  filePrefix?: string;
}

export const CAD_SOFTWARES: CADSoftwareConfig[] = [
  {
    id: "exocad",
    name: "Exocad DentalCAD",
    nameAr: "إيكو كاد",
    icon: "🦷",
    extensions: [".stl", ".dental", ".job"],
    protocol: "exocad",
    exportFolder: "Exocad_Jobs",
    filePrefix: "case",
  },
  {
    id: "3shape",
    name: "3Shape Dental System",
    nameAr: "ثري شيب",
    icon: "📐",
    extensions: [".stl", ".3sh", ".dcm"],
    protocol: "3shape",
    exportFolder: "3Shape_Import",
    filePrefix: "case",
  },
  {
    id: "dentalwings",
    name: "DentalWings",
    nameAr: "دينتال وينجز",
    icon: "🔬",
    extensions: [".stl", ".dwxml"],
    protocol: "dentalwings",
    exportFolder: "DentalWings",
    filePrefix: "case",
  },
  {
    id: "zbrush",
    name: "ZBrush (Sculpting)",
    nameAr: "زي برش",
    icon: "🎨",
    extensions: [".stl", ".obj", ".ztl"],
    protocol: "zbrush",
    exportFolder: "ZBrush_Import",
    filePrefix: "case",
  },
  {
    id: "meshmixer",
    name: "Meshmixer",
    nameAr: "ميش ميكسر",
    icon: "🔧",
    extensions: [".stl", ".obj", ".amf"],
    protocol: "meshmixer",
    exportFolder: "Meshmixer",
    filePrefix: "case",
  },
  {
    id: "blender",
    name: "Blender CAD",
    nameAr: "بلندر",
    icon: "💎",
    extensions: [".stl", ".obj", ".blend"],
    protocol: "blender",
    exportFolder: "Blender_Import",
    filePrefix: "case",
  },
  {
    id: "other",
    name: "أخرى",
    nameAr: "أخرى",
    icon: "📁",
    extensions: [".stl", ".obj", ".ply"],
    exportFolder: "CAD_Export",
    filePrefix: "case",
  },
];

export interface CaseExportPackage {
  caseNumber: string;
  caseId: string;
  patientName: string;
  doctorName: string;
  workType: string;
  teethNumbers: string;
  shadeColor: string;
  software: string;
  designParams: {
    marginType?: string;
    cementGap?: number;
    spacerThickness?: number;
    wallThickness?: number;
    connectorSize?: number;
  };
  designFiles: { fileName: string; fileUrl: string; fileType: string }[];
  exportedAt: string;
}

/**
 * Build export package for external CAD software
 */
export function buildExportPackage(
  caseData: DentalCase,
  designFiles: CaseAttachment[],
  designParams: Record<string, any>
): CaseExportPackage {
  return {
    caseNumber: caseData.caseNumber,
    caseId: caseData.id,
    patientName: caseData.patientName,
    doctorName: caseData.doctorName,
    workType: caseData.workType,
    teethNumbers: caseData.teethNumbers,
    shadeColor: caseData.shadeColor,
    software: caseData.cadData?.software || "exocad",
    designParams: {
      marginType: designParams.marginType,
      cementGap: designParams.cementGap,
      spacerThickness: designParams.spacerThickness,
      wallThickness: designParams.wallThickness,
      connectorSize: designParams.connectorSize,
    },
    designFiles: designFiles.map((f) => ({
      fileName: f.fileName,
      fileUrl: f.fileUrl,
      fileType: f.fileType || "stl",
    })),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Download a file from URL (blob or data)
 */
export async function downloadFile(url: string, fileName: string): Promise<void> {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download JSON as file
 */
export function downloadJson(data: object, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  downloadFile(url, fileName);
  URL.revokeObjectURL(url);
}

/**
 * Export case for selected CAD software - downloads manifest + triggers file downloads
 */
export async function exportForSoftware(
  pkg: CaseExportPackage,
  softwareId: string
): Promise<{ success: boolean; message: string }> {
  const sw = CAD_SOFTWARES.find((s) => s.id === softwareId) || CAD_SOFTWARES[0];
  const safeCaseNum = pkg.caseNumber.replace(/[/\\?%*:|"<>]/g, "_");

  // 1. Download manifest JSON
  const manifest = {
    ...pkg,
    _exportFormat: sw.name,
    _instructions: `افتح الملفات في ${sw.nameAr} - ${sw.name}`,
  };
  downloadJson(manifest, `${safeCaseNum}_manifest.json`);

  // 2. Download design files (blob URLs work)
  for (const f of pkg.designFiles) {
    if (f.fileUrl && f.fileUrl.startsWith("blob:")) {
      try {
        const res = await fetch(f.fileUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        await downloadFile(blobUrl, `${safeCaseNum}_${f.fileName}`);
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback: open in new tab
        window.open(f.fileUrl, "_blank");
      }
    }
  }

  return {
    success: true,
    message: `تم التصدير لـ ${sw.nameAr} - افتح الملفات في البرنامج`,
  };
}

/**
 * Try to launch external software via custom protocol (desktop only)
 */
export function tryLaunchSoftware(softwareId: string, caseNumber: string): void {
  const sw = CAD_SOFTWARES.find((s) => s.id === softwareId);
  if (!sw?.protocol) return;

  const url = `${sw.protocol}://open?case=${encodeURIComponent(caseNumber)}`;
  window.location.href = url;
}
