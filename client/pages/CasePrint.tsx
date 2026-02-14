/**
 * Case Barcode & Label Print Page
 * Prints a label with case info and representative barcode
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { WORK_TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowRight } from "lucide-react";
import type { DentalCase } from "@shared/api";

function generateBarcodeSVG(text: string): string {
  // Simple Code128-like barcode representation
  const chars = text.split("");
  let bars = "11010011100"; // Start code
  for (const char of chars) {
    const code = char.charCodeAt(0);
    const pattern = ((code * 7 + 3) % 256).toString(2).padStart(8, "0")
      .replace(/0/g, "10").replace(/1/g, "110");
    bars += pattern.slice(0, 11);
  }
  bars += "1100011101011"; // Stop code

  const barWidth = 1.5;
  const height = 50;
  let x = 0;
  let svgBars = "";

  for (const bit of bars) {
    if (bit === "1") {
      svgBars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`;
    }
    x += barWidth;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${height + 20}" viewBox="0 0 ${x} ${height + 20}">
    ${svgBars}
    <text x="${x / 2}" y="${height + 16}" text-anchor="middle" font-family="monospace" font-size="12">${text}</text>
  </svg>`;
}

export default function CasePrint() {
  const { id } = useParams();
  const [dentalCase, setDentalCase] = useState<DentalCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get<any>(`/cases/${id}`)
        .then((res) => setDentalCase(res.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dentalCase) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الحالة غير موجودة</p>
        <Link to="/cases"><Button variant="outline" className="mt-4">رجوع</Button></Link>
      </div>
    );
  }

  const barcodeSVG = generateBarcodeSVG(dentalCase.caseNumber);

  return (
    <div className="space-y-4">
      {/* Controls - hide on print */}
      <div className="flex items-center justify-between no-print">
        <Link to={`/cases/${dentalCase.id}`}>
          <Button variant="outline" className="gap-2">
            <ArrowRight className="w-4 h-4" /> رجوع للحالة
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> طباعة الملصق
        </Button>
      </div>

      {/* Print Label - Large */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 max-w-[600px] mx-auto print:border-black print:max-w-none">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold">معمل لاستر لتقنيات الأسنان</h1>
          <p className="text-sm text-gray-600">Luster Dental Lab</p>
        </div>

        {/* Barcode */}
        <div className="text-center my-6">
          <div dangerouslySetInnerHTML={{ __html: barcodeSVG }} className="inline-block" />
        </div>

        {/* Case Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm border-t-2 border-black pt-4">
          <div className="border-b pb-2">
            <span className="text-gray-500">رقم الحالة:</span>
            <span className="font-bold font-mono text-lg mr-2">{dentalCase.caseNumber}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">نوع العمل:</span>
            <span className="font-bold mr-2">{WORK_TYPE_LABELS[dentalCase.workType]?.ar}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">المريض:</span>
            <span className="font-bold mr-2">{dentalCase.patientName}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">الطبيب:</span>
            <span className="font-bold mr-2">{dentalCase.doctorName}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">الأسنان:</span>
            <span className="font-bold mr-2">{dentalCase.teethNumbers}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">اللون:</span>
            <span className="font-bold mr-2">{dentalCase.shadeColor}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">الأولوية:</span>
            <span className="font-bold mr-2">{PRIORITY_LABELS[dentalCase.priority]?.ar}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">الحالة:</span>
            <span className="font-bold mr-2">{STATUS_LABELS[dentalCase.currentStatus]?.ar}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">تاريخ الاستلام:</span>
            <span className="font-bold mr-2">{new Date(dentalCase.receivedDate).toLocaleDateString("ar-EG")}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-500">تاريخ التسليم المتوقع:</span>
            <span className="font-bold mr-2">{new Date(dentalCase.expectedDeliveryDate).toLocaleDateString("ar-EG")}</span>
          </div>
        </div>

        {/* Notes */}
        {dentalCase.doctorNotes && (
          <div className="mt-4 pt-3 border-t">
            <span className="text-gray-500 text-sm">ملاحظات:</span>
            <p className="text-sm mt-1">{dentalCase.doctorNotes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t-2 border-black text-center text-xs text-gray-400">
          <p>تم الطباعة: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      {/* Mini Labels - 3 per row for batch printing */}
      <div className="no-print">
        <h3 className="text-lg font-bold mb-3">ملصقات صغيرة (للطباعة المتعددة)</h3>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-2 border-dashed border-gray-300 rounded p-3 text-center">
              <div dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(dentalCase.caseNumber) }}
                className="inline-block transform scale-75" />
              <div className="text-xs mt-1 space-y-0.5">
                <p className="font-bold">{dentalCase.caseNumber}</p>
                <p>{dentalCase.patientName}</p>
                <p className="text-gray-500">{WORK_TYPE_LABELS[dentalCase.workType]?.ar} | {dentalCase.shadeColor}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
