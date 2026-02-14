/**
 * Quality Control Department
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { WORK_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle, XCircle, Eye, Send, Undo2 } from "lucide-react";
import type { DentalCase, QCCheckResult, CaseStatus } from "@shared/api";

export default function QualityControl() {
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [qcForm, setQcForm] = useState({
    dimensionCheck: "pass" as QCCheckResult,
    colorCheck: "pass" as QCCheckResult,
    occlusionCheck: "pass" as QCCheckResult,
    marginCheck: "pass" as QCCheckResult,
    overallResult: "pass" as QCCheckResult,
    rejectionReason: "",
    returnToDepartment: "finishing" as CaseStatus,
    notes: "",
  });

  useEffect(() => { loadCases(); }, []);

  const loadCases = () => {
    api.get<any>("/cases?status=quality_control")
      .then((r) => setCases(r.data || []))
      .finally(() => setLoading(false));
  };

  const submitInspection = async (caseId: string) => {
    try {
      await api.put<any>(`/cases/${caseId}/qc`, qcForm);

      if (qcForm.overallResult === "pass") {
        // Transfer to accounting
        await api.post<any>(`/cases/${caseId}/transfer`, {
          toStatus: "accounting",
          notes: "QC Passed - ready for invoicing",
        });
        toast.success("تم اعتماد الحالة وتحويلها للحسابات");
      } else {
        // Return to specified department
        await api.post<any>(`/cases/${caseId}/transfer`, {
          toStatus: qcForm.returnToDepartment,
          notes: `QC Rejected: ${qcForm.rejectionReason}`,
          rejectionReason: qcForm.rejectionReason,
        });
        toast.error("تم رفض الحالة وإعادتها");
      }

      setInspecting(null);
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-cyan-600" />
          قسم مراقبة الجودة
        </h1>
        <p className="text-muted-foreground">فحص واعتماد الحالات قبل إصدار الفواتير</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-cyan-600">{cases.length}</p>
          <p className="text-sm text-muted-foreground">حالات في انتظار الفحص</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">{cases.filter(c => c.qcData?.overallResult === "pass").length}</p>
          <p className="text-sm text-muted-foreground">تم الاعتماد</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">الحالات المعلقة ({cases.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : cases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد حالات في انتظار الفحص</p>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => (
                <div key={c.id} className="p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-primary">{c.caseNumber}</span>
                      <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                      <Badge variant="outline">اللون: {c.shadeColor}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/cases/${c.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {c.patientName} | {c.doctorName} | الأسنان: {c.teethNumbers}
                  </p>

                  {inspecting === c.id ? (
                    <div className="border rounded-lg p-4 bg-accent/20 space-y-4 mt-3">
                      <h4 className="font-semibold text-sm">نموذج فحص الجودة</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          ["dimensionCheck", "فحص المقاسات"],
                          ["colorCheck", "فحص اللون"],
                          ["occlusionCheck", "فحص الإطباق"],
                          ["marginCheck", "فحص الحواف"],
                        ] as const).map(([key, label]) => (
                          <div key={key}>
                            <Label className="text-xs">{label}</Label>
                            <Select value={qcForm[key]} onValueChange={(v: QCCheckResult) => setQcForm({ ...qcForm, [key]: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pass">مقبول</SelectItem>
                                <SelectItem value="fail">مرفوض</SelectItem>
                                <SelectItem value="conditional">مشروط</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>

                      <div>
                        <Label className="text-xs">النتيجة النهائية</Label>
                        <Select value={qcForm.overallResult} onValueChange={(v: QCCheckResult) => setQcForm({ ...qcForm, overallResult: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pass">مقبول - تحويل للحسابات</SelectItem>
                            <SelectItem value="fail">مرفوض - إعادة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {qcForm.overallResult === "fail" && (
                        <>
                          <div>
                            <Label className="text-xs">سبب الرفض</Label>
                            <Textarea
                              value={qcForm.rejectionReason}
                              onChange={(e) => setQcForm({ ...qcForm, rejectionReason: e.target.value })}
                              placeholder="سبب الرفض..."
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">إعادة لقسم</Label>
                            <Select value={qcForm.returnToDepartment} onValueChange={(v: CaseStatus) => setQcForm({ ...qcForm, returnToDepartment: v })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="finishing">التشطيب</SelectItem>
                                <SelectItem value="cam_milling">التفريز</SelectItem>
                                <SelectItem value="cad_design">التصميم</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => submitInspection(c.id)} className={qcForm.overallResult === "pass" ? "bg-green-600" : "bg-red-600"}>
                          {qcForm.overallResult === "pass" ? (
                            <><CheckCircle className="w-3 h-3 ml-1" /> اعتماد</>
                          ) : (
                            <><XCircle className="w-3 h-3 ml-1" /> رفض وإعادة</>
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setInspecting(null)}>إلغاء</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setInspecting(c.id)} className="gap-1 bg-cyan-600 hover:bg-cyan-700">
                      <ShieldCheck className="w-3 h-3" /> بدء الفحص
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
