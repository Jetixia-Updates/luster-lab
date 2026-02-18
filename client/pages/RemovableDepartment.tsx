/**
 * قسم التركيبات المتحركة - Removable Prosthetics Department
 * ===========================================================
 * مراحل: رص الأسنان → طبخ الأكريل/الفليكس → جاهز
 * الحالة النهائية: Try-In | Delivery
 * منطق الإيقاف: Try-In أو Special Tray/bite يوقف الحالة
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  WORK_TYPE_LABELS,
  REMOVABLE_PROSTHETIC_LABELS,
  ORTHO_REMOVABLE_LABELS,
  REMOVABLE_STAGES,
  REMOVABLE_FINAL_LABELS,
} from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Send, Play, CheckCircle, Eye, ArrowRight, Workflow, Clock,
  PauseCircle, AlertTriangle, UserCog,
} from "lucide-react";
import { ScanCaseButton } from "@/components/barcode";
import type { DentalCase, RemovableData, RemovableProstheticType, OrthoRemovableType, RemovableFinalStatus, PauseRecord } from "@shared/api";

const PROSTHETIC_TYPES = (Object.keys(REMOVABLE_PROSTHETIC_LABELS) as RemovableProstheticType[]);
const ORTHO_TYPES = (Object.keys(ORTHO_REMOVABLE_LABELS) as OrthoRemovableType[]);

export default function RemovableDepartment() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<DentalCase | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "workspace">("list");

  const [prostheticType, setProstheticType] = useState<RemovableProstheticType>("denture_hard");
  const [materialVariant, setMaterialVariant] = useState<"soft" | "hard">("hard");
  const [sizeMm, setSizeMm] = useState<number | "">("");
  const [isRepair, setIsRepair] = useState(false);
  const [teethAddedCount, setTeethAddedCount] = useState<number | "">("");
  const [orthoType, setOrthoType] = useState<OrthoRemovableType | "">("");
  const [notes, setNotes] = useState("");
  const [currentStageId, setCurrentStageId] = useState("arrange");
  const [finalStatus, setFinalStatus] = useState<RemovableFinalStatus | "">("");
  const [pauseReason, setPauseReason] = useState("");

  const loadCases = () => {
    api.get<any>("/cases?status=removable").then((r) => setCases(r.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  const rd = selectedCase?.removableData;
  const isPaused = rd?.isPaused ?? false;

  const openWorkspace = (c: DentalCase) => {
    setSelectedCase(c);
    setViewMode("workspace");
    const rd = c.removableData;
    setProstheticType((rd?.prostheticType as RemovableProstheticType) || "denture_hard");
    setMaterialVariant(rd?.materialVariant || "hard");
    setSizeMm(rd?.sizeMm ?? "");
    setIsRepair(rd?.isRepair ?? false);
    setTeethAddedCount(rd?.teethAddedCount ?? "");
    setOrthoType((rd?.orthoType as OrthoRemovableType) || "");
    setNotes(rd?.notes || "");
    setCurrentStageId(rd?.currentStage || "arrange");
    setFinalStatus((rd?.finalStatus as RemovableFinalStatus) || "");
  };

  const saveRemovable = async () => {
    if (!selectedCase) return;
    try {
      await api.put<any>(`/cases/${selectedCase.id}/removable`, {
        technicianId: user?.id,
        technicianName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        prostheticType,
        prostheticTypeAr: REMOVABLE_PROSTHETIC_LABELS[prostheticType]?.ar,
        materialVariant,
        sizeMm: sizeMm === "" ? undefined : Number(sizeMm),
        isRepair,
        teethAddedCount: teethAddedCount === "" ? undefined : Number(teethAddedCount),
        orthoType: orthoType || undefined,
        orthoTypeAr: orthoType ? ORTHO_REMOVABLE_LABELS[orthoType]?.ar : undefined,
        notes,
        currentStage: currentStageId,
        startTime: rd?.startTime || new Date().toISOString(),
      });
      toast.success("تم حفظ بيانات التركيبات المتحركة");
      loadCases();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const startRemovable = async (c: DentalCase) => {
    try {
      await api.put<any>(`/cases/${c.id}/removable`, {
        technicianId: user?.id,
        technicianName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        startTime: new Date().toISOString(),
        prostheticType: "denture_hard",
        currentStage: "arrange",
      });
      toast.success("تم بدء العمل في قسم التركيبات المتحركة");
      openWorkspace({
        ...c,
        removableData: {
          status: "in_progress",
          startTime: new Date().toISOString(),
          prostheticType: "denture_hard",
          currentStage: "arrange",
        } as RemovableData,
      });
      loadCases();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const handlePause = async () => {
    if (!selectedCase || !pauseReason.trim()) {
      toast.error("يرجى إدخال سبب الإيقاف");
      return;
    }
    const record: PauseRecord = {
      id: `pause_${Date.now()}`,
      reason: pauseReason,
      pausedAt: new Date().toISOString(),
      pausedBy: user?.id || "",
      pausedByName: user?.fullNameAr || user?.fullName || "",
    };
    const records = [...(rd?.pauseRecords || []), record];
    try {
      await api.put<any>(`/cases/${selectedCase.id}/removable`, {
        ...rd,
        isPaused: true,
        pauseRecords: records,
        currentPauseReason: pauseReason,
        currentPauseDate: record.pausedAt,
        currentPauseBy: user?.id,
        finalStatus: "try_in",
      });
      toast.success("تم إيقاف الحالة مؤقتاً");
      setSelectedCase({ ...selectedCase, removableData: { ...rd, isPaused: true, pauseRecords: records, finalStatus: "try_in" } });
      loadCases();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const handleUnpause = async () => {
    if (!selectedCase || !isAdmin) return;
    const records = rd?.pauseRecords || [];
    const last = records[records.length - 1];
    if (last) {
      (last as any).resumedAt = new Date().toISOString();
      (last as any).resumedBy = user?.id;
      (last as any).resumedByName = user?.fullNameAr || user?.fullName;
    }
    try {
      await api.put<any>(`/cases/${selectedCase.id}/removable`, {
        ...rd,
        isPaused: false,
        pauseRecords: records,
        currentPauseReason: undefined,
        currentPauseDate: undefined,
        currentPauseBy: undefined,
      });
      toast.success("تم فك الإيقاف");
      setSelectedCase({ ...selectedCase, removableData: { ...rd, isPaused: false } });
      loadCases();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const handleTransferToQC = async () => {
    if (!selectedCase) return;
    try {
      await api.put<any>(`/cases/${selectedCase.id}/removable`, {
        technicianId: user?.id,
        technicianName: user?.fullNameAr || user?.fullName,
        status: "completed",
        prostheticType,
        prostheticTypeAr: REMOVABLE_PROSTHETIC_LABELS[prostheticType]?.ar,
        materialVariant,
        sizeMm: sizeMm === "" ? undefined : Number(sizeMm),
        isRepair,
        teethAddedCount: teethAddedCount === "" ? undefined : Number(teethAddedCount),
        orthoType: orthoType || undefined,
        orthoTypeAr: orthoType ? ORTHO_REMOVABLE_LABELS[orthoType]?.ar : undefined,
        notes,
        currentStage: "ready",
        finalStatus: "delivery",
        endTime: new Date().toISOString(),
        startTime: rd?.startTime || new Date().toISOString(),
      });
      await api.post<any>(`/cases/${selectedCase.id}/transfer`, {
        toStatus: "quality_control",
        notes: "التركيبات المتحركة مكتملة - تحويل لمراقبة الجودة",
      });
      toast.success("تم إكمال التشغيل والتحويل لمراقبة الجودة");
      setViewMode("list");
      loadCases();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const getElapsed = (startTime?: string) => {
    if (!startTime) return null;
    const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    if (mins < 60) return `${mins} دقيقة`;
    return `${Math.floor(mins / 60)} ساعة ${mins % 60} د`;
  };

  // ── WORKSPACE VIEW ─────────────────────────
  if (viewMode === "workspace" && selectedCase) {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col gap-2">
        <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2 rounded-lg">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700" onClick={() => { saveRemovable(); setViewMode("list"); }}>
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع
            </Button>
            <div className="h-6 w-px bg-gray-600" />
            <span className="font-mono text-sm text-teal-300">{selectedCase.caseNumber}</span>
            <Badge className="bg-teal-600">{WORK_TYPE_LABELS[selectedCase.workType]?.ar}</Badge>
            <span className="text-xs text-gray-400">{selectedCase.patientName}</span>
          </div>
          <div className="flex items-center gap-2">
            {rd?.startTime && (
              <Badge variant="outline" className="text-teal-300 border-teal-500 gap-1">
                <Clock className="w-3 h-3" /> {getElapsed(rd.startTime)}
              </Badge>
            )}
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700" onClick={saveRemovable}>حفظ</Button>
          </div>
        </div>

        {isPaused && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-amber-800">الحالة موقوفة مؤقتاً</span>
                <span className="text-sm text-amber-700">— {rd?.currentPauseReason}</span>
              </div>
              {isAdmin && (
                <Button size="sm" variant="outline" className="border-amber-600 text-amber-700" onClick={handleUnpause}>
                  <UserCog className="w-4 h-4 ml-1" /> فك الإيقاف (إدارة)
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex-1 flex gap-4 min-h-0 overflow-auto">
          <div className="w-80 flex flex-col gap-3 overflow-y-auto">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">نوع التركيبة المتحركة</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div>
                  <Label className="text-[10px]">النوع</Label>
                  <Select value={prostheticType} onValueChange={(v) => setProstheticType(v as RemovableProstheticType)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROSTHETIC_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{REMOVABLE_PROSTHETIC_LABELS[t]?.ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(prostheticType === "denture_soft" || prostheticType === "denture_hard") && (
                  <>
                    <div>
                      <Label className="text-[10px]">سوفت / هارد</Label>
                      <Select value={materialVariant} onValueChange={(v: "soft" | "hard") => setMaterialVariant(v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="soft">سوفت</SelectItem>
                          <SelectItem value="hard">هارد</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">المقاس (مم)</Label>
                      <Input type="number" value={sizeMm} onChange={(e) => setSizeMm(e.target.value === "" ? "" : +e.target.value)} placeholder="مم" className="h-8 text-xs" />
                    </div>
                  </>
                )}
                {prostheticType === "denture_repair" && (
                  <div>
                    <Label className="text-[10px]">تصليح طقم</Label>
                    <Badge variant="outline">نعم</Badge>
                  </div>
                )}
                {prostheticType === "add_teeth" && (
                  <div>
                    <Label className="text-[10px]">عدد الأسنان المضافة</Label>
                    <Input type="number" min={1} value={teethAddedCount} onChange={(e) => setTeethAddedCount(e.target.value === "" ? "" : +e.target.value)} className="h-8 text-xs" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">التقويم (اختياري)</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Select value={orthoType || "none"} onValueChange={(v) => setOrthoType(v === "none" ? "" : (v as OrthoRemovableType))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="بدون تقويم" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون تقويم</SelectItem>
                    {ORTHO_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{ORTHO_REMOVABLE_LABELS[t]?.ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">مراحل العمل</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {REMOVABLE_STAGES.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button
                      onClick={() => !isPaused && setCurrentStageId(s.id)}
                      className={`w-full text-right py-2 px-2 rounded text-xs font-medium border transition-all ${
                        currentStageId === s.id ? "bg-teal-100 border-teal-400" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {s.nameAr}
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">الإيقاف المؤقت (Try-In / Special Tray)</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <Input value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} placeholder="سبب الإيقاف..." className="h-8 text-xs" disabled={isPaused} />
                <Button size="sm" variant="outline" className="w-full gap-1 text-amber-700 border-amber-300" onClick={handlePause} disabled={isPaused}>
                  <PauseCircle className="w-3 h-3" /> إيقاف مؤقت
                </Button>
              </CardContent>
            </Card>

            {rd?.pauseRecords && rd.pauseRecords.length > 0 && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs">سجل الإيقافات السابقة</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2 max-h-32 overflow-y-auto">
                  {rd.pauseRecords.map((p: PauseRecord) => (
                    <div key={p.id} className="text-[10px] p-2 rounded bg-amber-50 border border-amber-200">
                      <p><strong>{p.reason}</strong></p>
                      <p className="text-muted-foreground">{new Date(p.pausedAt).toLocaleString("ar-EG")} — {p.pausedByName}</p>
                      {p.resumedAt && <p className="text-green-600">استؤنف {new Date(p.resumedAt).toLocaleString("ar-EG")}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button className="w-full gap-2 bg-teal-600 hover:bg-teal-700" onClick={handleTransferToQC} disabled={isPaused}>
              <Send className="w-4 h-4" /> إنهاء والتحويل لمراقبة الجودة
            </Button>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">ملاحظات</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات..." className="text-xs min-h-[80px] resize-none" disabled={isPaused} />
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-cyan-50 rounded-lg">
            <Workflow className="w-24 h-24 text-teal-500 opacity-50 mb-4" />
            <p className="text-lg font-bold text-teal-700">قسم التركيبات المتحركة</p>
            <p className="text-sm text-muted-foreground mt-1">{selectedCase.caseNumber} • {WORK_TYPE_LABELS[selectedCase.workType]?.ar}</p>
            <Badge variant="outline" className="mt-3 gap-1">{REMOVABLE_PROSTHETIC_LABELS[prostheticType]?.ar}</Badge>
            {orthoType && <Badge variant="outline" className="mt-2 gap-1">{ORTHO_REMOVABLE_LABELS[orthoType]?.ar}</Badge>}
            {rd?.startTime && <Badge variant="outline" className="mt-2 gap-1"><Clock className="w-3 h-3" /> {getElapsed(rd.startTime)}</Badge>}
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="w-7 h-7 text-teal-600" />
            قسم التركيبات المتحركة
          </h1>
          <p className="text-muted-foreground">رص الأسنان • طبخ الأكريل/الفليكس • جاهز</p>
        </div>
        <ScanCaseButton variant="outline" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-teal-600">{cases.length}</p>
          <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{cases.filter((c) => (c.removableData as any)?.isPaused).length}</p>
          <p className="text-sm text-muted-foreground">موقوفة</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="w-5 h-5 text-teal-600" />
            حالات التركيبات المتحركة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <Workflow className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-400">لا توجد حالات في قسم التركيبات المتحركة</p>
              <p className="text-sm text-gray-400">الحالات من نوع متحركة، تقويم، أو طقم أسنان تنتقل هنا من الاستقبال</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => {
                const rd = c.removableData;
                const elapsed = rd?.startTime ? Math.round((Date.now() - new Date(rd.startTime).getTime()) / 60000) : 0;
                return (
                  <div key={c.id} className="p-4 rounded-xl border-2 hover:shadow-md transition-all border-gray-200 hover:border-teal-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-teal-700 text-lg">{c.caseNumber}</span>
                        <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                        {rd?.prostheticTypeAr && <Badge variant="outline" className="text-[10px]">{rd.prostheticTypeAr}</Badge>}
                        {rd?.orthoTypeAr && <Badge variant="outline" className="text-[10px]">{rd.orthoTypeAr}</Badge>}
                        {(rd as any)?.isPaused && <Badge className="bg-amber-500 text-white">موقوفة</Badge>}
                        {rd?.startTime && (
                          <Badge variant="outline" className="gap-1 text-[10px] text-teal-600">
                            <Clock className="w-3 h-3" /> {elapsed < 60 ? `${elapsed} د` : `${Math.floor(elapsed / 60)} س ${elapsed % 60} د`}
                          </Badge>
                        )}
                      </div>
                      <Link to={`/cases/${c.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{c.patientName} | الطبيب: {c.doctorName}</p>
                    <div className="flex gap-2 flex-wrap">
                      {(!rd || rd.status === "pending" || rd.status === "in_progress") && !(rd as any)?.isPaused && (
                        <Button size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700" onClick={() => (rd ? openWorkspace(c) : startRemovable(c))}>
                          {rd?.status === "in_progress" ? (
                            <><Workflow className="w-3 h-3" /> فتح محطة العمل</>
                          ) : (
                            <><Play className="w-3 h-3" /> {rd ? "فتح محطة العمل" : "بدء العمل"}</>
                          )}
                        </Button>
                      )}
                      {(rd as any)?.isPaused && isAdmin && (
                        <Button size="sm" variant="outline" className="gap-1 text-amber-700" onClick={() => { openWorkspace(c); }}>
                          <UserCog className="w-3 h-3" /> فك الإيقاف
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
