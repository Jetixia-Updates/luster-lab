/**
 * Case Detail - Full case view with workflow tracker, actions & timeline
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { STATUS_LABELS, WORK_TYPE_LABELS, WORKFLOW_ORDER } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowRight, CheckCircle, Clock, User, Calendar,
  Palette, Hash, FileText, Send, Printer, Receipt,
  Eye, ArrowLeft, AlertTriangle, Tag, Box, Cpu,
  PenTool, Paintbrush, ShieldCheck, Truck,
} from "lucide-react";
import type { DentalCase } from "@shared/api";

const DEPT_ICONS: Record<string, any> = {
  reception: Tag, cad_design: PenTool, cam_milling: Cpu,
  finishing: Paintbrush, quality_control: ShieldCheck,
  accounting: Receipt, ready_for_delivery: Truck, delivered: CheckCircle,
};

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dentalCase, setCase] = useState<DentalCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get<any>(`/cases/${id}`)
        .then((r) => setCase(r.data))
        .catch(() => toast.error("الحالة غير موجودة"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dentalCase) {
    return <div className="text-center py-12 text-muted-foreground">الحالة غير موجودة</div>;
  }

  const c = dentalCase;
  const currentStepIndex = WORKFLOW_ORDER.indexOf(c.currentStatus);

  // Calculate elapsed time
  const elapsedDays = Math.floor((Date.now() - new Date(c.receivedDate).getTime()) / 86400000);
  const isOverdue = c.expectedDeliveryDate && new Date(c.expectedDeliveryDate) < new Date() && c.currentStatus !== "delivered";

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono">{c.caseNumber}</h1>
            <Badge className={`${STATUS_LABELS[c.currentStatus]?.color}`}>
              {STATUS_LABELS[c.currentStatus]?.ar}
            </Badge>
            <Badge className={c.priority === "rush" ? "bg-red-500 text-white" : c.priority === "urgent" ? "bg-amber-500 text-white" : "bg-gray-200"}>
              {c.priority === "rush" ? "عاجل جداً" : c.priority === "urgent" ? "مستعجل" : "عادي"}
            </Badge>
            {isOverdue && (
              <Badge className="bg-red-100 text-red-700 gap-1">
                <AlertTriangle className="w-3 h-3" /> متأخر
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {WORK_TYPE_LABELS[c.workType]?.ar} - {c.patientName} | مضى {elapsedDays} يوم
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={`/cases/${c.id}/print`}>
            <Button variant="outline" size="sm" className="gap-1"><Printer className="w-3.5 h-3.5" /> طباعة باركود</Button>
          </Link>
          {c.invoiceId && (
            <Link to={`/invoices/${c.invoiceId}/print`}>
              <Button variant="outline" size="sm" className="gap-1"><Receipt className="w-3.5 h-3.5" /> الفاتورة</Button>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> رجوع
          </Button>
        </div>
      </div>

      {/* Workflow Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">مسار الحالة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center overflow-x-auto pb-2 gap-1">
            {WORKFLOW_ORDER.map((status, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const label = STATUS_LABELS[status];
              const Icon = DEPT_ICONS[status] || Tag;
              return (
                <div key={status} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[80px] px-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isCompleted ? "bg-green-500 text-white" : isCurrent ? "bg-primary text-white ring-4 ring-primary/20 scale-110" : "bg-muted text-muted-foreground"}`}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs mt-1.5 text-center ${isCurrent ? "font-bold text-primary" : isCompleted ? "text-green-700 font-medium" : "text-muted-foreground"}`}>
                      {label.ar}
                    </span>
                  </div>
                  {idx < WORKFLOW_ORDER.length - 1 && (
                    <div className={`w-8 h-0.5 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Case Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">بيانات الحالة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={Hash} label="رقم الحالة" value={c.caseNumber} highlight />
            <InfoRow icon={User} label="المريض" value={c.patientName} />
            <InfoRow icon={User} label="الطبيب" value={c.doctorName} />
            <InfoRow icon={FileText} label="نوع العمل" value={WORK_TYPE_LABELS[c.workType]?.ar} />
            <InfoRow icon={Hash} label="أرقام الأسنان" value={c.teethNumbers} />
            <InfoRow icon={Palette} label="درجة اللون" value={c.shadeColor} />
            {c.material && <InfoRow icon={Box} label="المادة" value={c.material} />}
            <Separator />
            <InfoRow icon={Calendar} label="تاريخ الاستلام" value={new Date(c.receivedDate).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })} />
            <InfoRow icon={Calendar} label="تاريخ التسليم المتوقع" value={new Date(c.expectedDeliveryDate).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })} warn={isOverdue} />
            {c.actualDeliveryDate && (
              <InfoRow icon={CheckCircle} label="تاريخ التسليم الفعلي" value={new Date(c.actualDeliveryDate).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })} />
            )}
            {c.totalCost > 0 && (
              <InfoRow icon={Receipt} label="إجمالي التكلفة" value={`${c.totalCost.toLocaleString()} ج.م`} highlight />
            )}
          </CardContent>
        </Card>

        {/* Department Details */}
        <div className="space-y-4">
          {c.doctorNotes && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="py-3"><CardTitle className="text-sm text-blue-700">ملاحظات الطبيب</CardTitle></CardHeader>
              <CardContent className="pt-0"><p className="text-sm">{c.doctorNotes}</p></CardContent>
            </Card>
          )}

          {c.cadData && (
            <Card className="border-purple-200">
              <CardHeader className="py-3"><CardTitle className="text-sm text-purple-700 flex items-center gap-1"><PenTool className="w-3.5 h-3.5" /> بيانات التصميم CAD</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1.5 text-sm">
                <p>المصمم: <strong>{c.cadData.designerName}</strong></p>
                <p>الحالة: <Badge variant="outline" className="text-[10px]">{c.cadData.status === "completed" ? "مكتمل" : c.cadData.status === "in_progress" ? "قيد العمل" : "معلق"}</Badge></p>
                {c.cadData.software && <p>البرنامج: {c.cadData.software}</p>}
                {c.cadData.startTime && <p>البدء: {new Date(c.cadData.startTime).toLocaleString("ar-EG")}</p>}
                {c.cadData.endTime && <p>الانتهاء: {new Date(c.cadData.endTime).toLocaleString("ar-EG")}</p>}
                {c.cadData.notes && <p className="text-muted-foreground">ملاحظات: {c.cadData.notes}</p>}
              </CardContent>
            </Card>
          )}

          {c.camData && (
            <Card className="border-orange-200">
              <CardHeader className="py-3"><CardTitle className="text-sm text-orange-700 flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> بيانات التفريز CAM</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1.5 text-sm">
                {c.camData.operatorName && <p>المشغل: <strong>{c.camData.operatorName}</strong></p>}
                <p>نوع البلوك: {c.camData.blockType}</p>
                {c.camData.machineName && <p>الماكينة: {c.camData.machineName}</p>}
                {c.camData.millingDuration && <p>مدة التشغيل: {c.camData.millingDuration} دقيقة</p>}
                <p>خصم المخزون: <Badge variant="outline" className={`text-[10px] ${c.camData.materialDeducted ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{c.camData.materialDeducted ? "نعم ✓" : "لا"}</Badge></p>
                {c.camData.notes && <p className="text-muted-foreground">ملاحظات: {c.camData.notes}</p>}
              </CardContent>
            </Card>
          )}

          {c.finishingData && (
            <Card className="border-yellow-200">
              <CardHeader className="py-3"><CardTitle className="text-sm text-yellow-700 flex items-center gap-1"><Paintbrush className="w-3.5 h-3.5" /> بيانات التشطيب</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1.5 text-sm">
                <p>الفني: <strong>{c.finishingData.technicianName}</strong></p>
                {c.finishingData.furnaceName && <p>الفرن: {c.finishingData.furnaceName}</p>}
                <p>دورات الحرق: <Badge variant="outline" className="text-[10px]">{c.finishingData.firingCycles}</Badge></p>
                {c.finishingData.qualityScore && (
                  <p>تقييم الجودة: <span className={`font-bold ${c.finishingData.qualityScore >= 7 ? "text-green-600" : "text-amber-600"}`}>{c.finishingData.qualityScore}/10</span></p>
                )}
                {c.finishingData.notes && <p className="text-muted-foreground">ملاحظات: {c.finishingData.notes}</p>}
              </CardContent>
            </Card>
          )}

          {c.qcData && (
            <Card className={c.qcData.overallResult === "pass" ? "border-green-200" : "border-red-200"}>
              <CardHeader className="py-3"><CardTitle className="text-sm text-cyan-700 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> بيانات الجودة</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2 text-sm">
                <p>المفتش: <strong>{c.qcData.inspectorName}</strong></p>
                <div className="grid grid-cols-2 gap-2">
                  <QCItem label="المقاسات" result={c.qcData.dimensionCheck} />
                  <QCItem label="اللون" result={c.qcData.colorCheck} />
                  <QCItem label="الإطباق" result={c.qcData.occlusionCheck} />
                  <QCItem label="الحواف" result={c.qcData.marginCheck} />
                </div>
                <p className="font-bold pt-1">
                  النتيجة: <Badge className={c.qcData.overallResult === "pass" ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                    {c.qcData.overallResult === "pass" ? "مقبول ✓" : "مرفوض ✗"}
                  </Badge>
                </p>
                {c.qcData.rejectionReason && <p className="text-red-600">سبب الرفض: {c.qcData.rejectionReason}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Workflow Timeline */}
      {c.workflowHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              الجدول الزمني للحالة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pr-8 space-y-0">
              {/* Vertical line */}
              <div className="absolute right-3 top-2 bottom-2 w-0.5 bg-muted" />

              {c.workflowHistory.map((step, idx) => {
                const isRejection = !!step.rejectionReason;
                const FromIcon = DEPT_ICONS[step.fromStatus] || Tag;
                const ToIcon = DEPT_ICONS[step.toStatus] || Tag;
                return (
                  <div key={step.id || idx} className="relative pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className={`absolute right-0 w-7 h-7 rounded-full flex items-center justify-center z-10
                      ${isRejection ? "bg-red-100 text-red-600 ring-2 ring-red-200" : "bg-green-100 text-green-600 ring-2 ring-green-200"}`}>
                      {isRejection ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="mr-12 p-3 rounded-lg border hover:bg-accent/20 transition-colors">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <FromIcon className="w-2.5 h-2.5" />
                          {STATUS_LABELS[step.fromStatus]?.ar}
                        </Badge>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <Badge className={`text-[10px] gap-0.5 ${isRejection ? "bg-red-100 text-red-800" : STATUS_LABELS[step.toStatus]?.color}`}>
                          <ToIcon className="w-2.5 h-2.5" />
                          {STATUS_LABELS[step.toStatus]?.ar}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground mr-auto">
                          {new Date(step.startTime).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {step.notes && <p className="text-xs text-muted-foreground">{step.notes}</p>}
                      {step.rejectionReason && (
                        <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> سبب الإرجاع: {step.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight, warn }: { icon: any; label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 shrink-0 ${warn ? "text-red-500" : "text-muted-foreground"}`} />
      <span className="text-sm text-muted-foreground w-36">{label}</span>
      <span className={`text-sm ${highlight ? "font-bold text-primary" : warn ? "font-bold text-red-600" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function QCItem({ label, result }: { label: string; result: string }) {
  const config = result === "pass" ? { color: "text-green-600", text: "مقبول" } : result === "fail" ? { color: "text-red-600", text: "مرفوض" } : { color: "text-amber-600", text: "مشروط" };
  return (
    <div className="flex justify-between p-1.5 rounded bg-accent/30">
      <span className="text-xs">{label}</span>
      <span className={`text-xs font-medium ${config.color}`}>{config.text}</span>
    </div>
  );
}
