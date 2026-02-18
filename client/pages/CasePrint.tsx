/**
 * Case Barcode & QR Label Print Page
 * Code128 barcode + QR code - compatible with all scanners and phone cameras
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { WORK_TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight } from "lucide-react";
import { BarcodeDisplay, QRCodeDisplay } from "@/components/barcode";
import type { DentalCase } from "@shared/api";

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

  // Encode caseNumber - Code128 supports alphanumeric, phones scan QR
  const barcodeValue = dentalCase.caseNumber;

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

      {/* Print Label - Large with Barcode + QR */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 max-w-[600px] mx-auto print:border-black print:max-w-none">
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold">معمل لاستر لتقنيات الأسنان</h1>
          <p className="text-sm text-gray-600">Luster Dental Lab</p>
        </div>

        {/* Barcode + QR side by side */}
        <div className="flex items-center justify-center gap-8 my-6 flex-wrap">
          <div className="flex flex-col items-center">
            <BarcodeDisplay
              value={barcodeValue}
              format="CODE128"
              width={2}
              height={60}
              fontSize={14}
              className="max-w-full"
            />
            <span className="text-xs text-gray-500 mt-1">باركود</span>
          </div>
          <div className="flex flex-col items-center">
            <QRCodeDisplay value={barcodeValue} size={100} level="M" />
            <span className="text-xs text-gray-500 mt-1">QR</span>
          </div>
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

        {dentalCase.doctorNotes && (
          <div className="mt-4 pt-3 border-t">
            <span className="text-gray-500 text-sm">ملاحظات:</span>
            <p className="text-sm mt-1">{dentalCase.doctorNotes}</p>
          </div>
        )}

        <div className="mt-6 pt-3 border-t-2 border-black text-center text-xs text-gray-400">
          <p>تم الطباعة: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      {/* Mini Labels - 3 per row */}
      <div className="no-print">
        <h3 className="text-lg font-bold mb-3">ملصقات صغيرة (للطباعة المتعددة)</h3>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-2 border-dashed border-gray-300 rounded p-3 text-center">
              <div className="flex justify-center gap-2">
                <BarcodeDisplay value={barcodeValue} width={1.2} height={40} fontSize={10} />
                <QRCodeDisplay value={barcodeValue} size={60} />
              </div>
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
