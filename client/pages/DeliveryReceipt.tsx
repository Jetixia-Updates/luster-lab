/**
 * Delivery Receipt - Printable receipt for case delivery
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { WORK_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Printer } from "lucide-react";
import type { Delivery, DentalCase } from "@shared/api";

export default function DeliveryReceipt() {
  const { id } = useParams();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [dentalCase, setDentalCase] = useState<DentalCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get<any>("/deliveries").then((res) => {
        const found = (res.data || []).find((d: Delivery) => d.id === id || d.caseId === id);
        setDelivery(found || null);
        if (found) {
          api.get<any>(`/cases/${found.caseId}`).then((r) => setDentalCase(r.data));
        }
      }).catch(() => toast.error("خطأ"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!delivery) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">إيصال التسليم غير موجود</p>
        <Link to="/delivery"><Button variant="outline" className="mt-4">رجوع</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6 no-print">
        <Link to="/delivery">
          <Button variant="outline" className="gap-2"><ArrowRight className="w-4 h-4" /> رجوع</Button>
        </Link>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> طباعة الإيصال
        </Button>
      </div>

      {/* Receipt */}
      <div className="border-2 border-dashed rounded-xl p-8 bg-white">
        {/* Header */}
        <div className="text-center border-b-2 pb-4 mb-4">
          <h1 className="text-2xl font-bold">معمل لاستر لطب الأسنان</h1>
          <p className="text-sm text-muted-foreground">Luster Dental Laboratory</p>
          <p className="text-xs text-muted-foreground mt-1">القاهرة - مصر | +20 123 456 7890</p>
          <div className="mt-3 inline-block border-2 border-primary rounded-lg px-6 py-2">
            <p className="text-lg font-bold text-primary">إيصال تسليم</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28">رقم الحالة:</span>
              <span className="font-mono font-bold text-primary">{delivery.caseNumber}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28">الطبيب:</span>
              <span className="font-medium">{delivery.doctorName}</span>
            </div>
            {dentalCase && (
              <>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28">المريض:</span>
                  <span>{dentalCase.patientName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28">نوع العمل:</span>
                  <span>{WORK_TYPE_LABELS[dentalCase.workType]?.ar}</span>
                </div>
              </>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28">تاريخ التسليم:</span>
              <span className="font-medium">{new Date(delivery.deliveryDate).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28">الوقت:</span>
              <span>{new Date(delivery.deliveryDate).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28">المستلم:</span>
              <span className="font-bold">{delivery.receivedBy || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-28">حالة الدفع:</span>
              <span className={`font-bold ${delivery.paymentStatus === "paid" ? "text-green-600" : "text-red-600"}`}>
                {delivery.paymentStatus === "paid" ? "مسدد" : "غير مسدد"}
              </span>
            </div>
          </div>
        </div>

        {dentalCase && (
          <div className="border rounded-lg p-4 mb-6 text-sm">
            <p className="font-medium mb-2">تفاصيل العمل:</p>
            <div className="grid grid-cols-3 gap-2 text-muted-foreground">
              <span>الأسنان: <strong className="text-foreground">{dentalCase.teethNumbers}</strong></span>
              <span>اللون: <strong className="text-foreground">{dentalCase.shadeColor}</strong></span>
              {dentalCase.material && <span>المادة: <strong className="text-foreground">{dentalCase.material}</strong></span>}
            </div>
          </div>
        )}

        {delivery.notes && (
          <div className="border rounded-lg p-4 mb-6 text-sm bg-muted/30">
            <p className="text-muted-foreground">ملاحظات: {delivery.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t">
          <div className="text-center">
            <div className="border-b-2 border-dashed mb-2 h-16" />
            <p className="text-sm text-muted-foreground">توقيع المسلّم</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-dashed mb-2 h-16" />
            <p className="text-sm text-muted-foreground">توقيع المستلم</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t text-xs text-muted-foreground">
          <p>شكراً لثقتكم في معمل لاستر لطب الأسنان</p>
          <p className="mt-1">تم الطباعة: {new Date().toLocaleString("ar-EG")}</p>
        </div>
      </div>
    </div>
  );
}
