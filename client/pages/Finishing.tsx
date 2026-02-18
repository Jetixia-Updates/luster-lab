/**
 * Finishing & Coloring Department - Full Workflow with Stages
 * ===========================================================
 * مراحل التشطيب والتلوين الكاملة:
 * - استقبال القطعة
 * - التنظيف الابتدائي
 * - التلوين الأساسي
 * - التلوين الإضافي
 * - إعداد الفرن
 * - دورة الحرق الأولى
 * - دورات حرق إضافية
 * - التلميع
 * - الفحص البصري
 * - جاهز لمراقبة الجودة
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { WORK_TYPE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Paintbrush, Send, Play, CheckCircle, Eye, Flame, Clock, Star,
  ArrowRight, Workflow, XCircle,
} from "lucide-react";
import { ScanCaseButton } from "@/components/barcode";
import type { DentalCase } from "@shared/api";

const FURNACES = [
  { id: "furnace_1", name: "Programat P710" },
  { id: "furnace_2", name: "Vita Vacumat 6000 M" },
  { id: "furnace_3", name: "Dekema Austromat 654" },
];

export default function Finishing() {
  const { user } = useAuth();
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<DentalCase | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "workspace">("list");

  // Workspace state
  const [notes, setNotes] = useState("");
  const [pieceReceived, setPieceReceived] = useState(false);
  const [initialCleanDone, setInitialCleanDone] = useState(false);
  const [baseColoringDone, setBaseColoringDone] = useState(false);
  const [extraColoringDone, setExtraColoringDone] = useState(false);
  const [furnaceReady, setFurnaceReady] = useState(false);
  const [selectedFurnace, setSelectedFurnace] = useState("furnace_1");
  const [firstFiringDone, setFirstFiringDone] = useState(false);
  const [firingCycles, setFiringCycles] = useState(1);
  const [polishingDone, setPolishingDone] = useState(false);
  const [visualCheckPassed, setVisualCheckPassed] = useState<boolean | null>(null);
  const [visualCheckNotes, setVisualCheckNotes] = useState("");
  const [qualityScore, setQualityScore] = useState(8);

  const loadCases = () => {
    api.get<any>("/cases?status=finishing")
      .then((r) => setCases(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  const openWorkspace = (c: DentalCase) => {
    setSelectedCase(c);
    setViewMode("workspace");
    const fd = c.finishingData;
    setNotes(fd?.notes || "");
    setPieceReceived((fd as any)?.pieceReceived ?? false);
    setInitialCleanDone((fd as any)?.initialCleanDone ?? false);
    setBaseColoringDone((fd as any)?.baseColoringDone ?? false);
    setExtraColoringDone((fd as any)?.extraColoringDone ?? false);
    setFurnaceReady((fd as any)?.furnaceReady ?? false);
    setSelectedFurnace(fd?.furnaceId || "furnace_1");
    setFirstFiringDone((fd as any)?.firstFiringDone ?? false);
    setFiringCycles(fd?.firingCycles ?? 1);
    setPolishingDone((fd as any)?.polishingDone ?? false);
    setVisualCheckPassed((fd as any)?.visualCheckPassed ?? null);
    setVisualCheckNotes((fd as any)?.visualCheckNotes || "");
    setQualityScore(fd?.qualityScore ?? 8);
  };

  const saveFinishing = async () => {
    if (!selectedCase) return;
    try {
      const furnace = FURNACES.find((f) => f.id === selectedFurnace) || FURNACES[0];
      await api.put<any>(`/cases/${selectedCase.id}/finishing`, {
        technicianId: user?.id,
        technicianName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        stages: [],
        currentStage: "",
        furnaceId: furnace.id,
        furnaceName: furnace.name,
        firingCycles,
        notes,
        pieceReceived,
        initialCleanDone,
        baseColoringDone,
        extraColoringDone,
        furnaceReady,
        firstFiringDone,
        polishingDone,
        visualCheckPassed,
        visualCheckNotes,
        qualityScore,
        startTime: selectedCase.finishingData?.startTime || new Date().toISOString(),
      });
      toast.success("تم حفظ بيانات التشطيب");
      loadCases();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const addFiringCycle = () => {
    setFiringCycles((prev) => prev + 1);
    toast.success(`دورات الحرق: ${firingCycles + 1}`);
  };

  const handleTransferToQC = async () => {
    if (!selectedCase) return;
    const furnace = FURNACES.find((f) => f.id === selectedFurnace) || FURNACES[0];
    try {
      await api.put<any>(`/cases/${selectedCase.id}/finishing`, {
        technicianId: user?.id,
        technicianName: user?.fullNameAr || user?.fullName,
        status: "completed",
        stages: [],
        currentStage: "",
        furnaceId: furnace.id,
        furnaceName: furnace.name,
        firingCycles,
        qualityScore,
        notes,
        pieceReceived,
        initialCleanDone,
        baseColoringDone,
        extraColoringDone,
        furnaceReady,
        firstFiringDone,
        polishingDone,
        visualCheckPassed,
        visualCheckNotes,
        endTime: new Date().toISOString(),
        startTime: selectedCase.finishingData?.startTime || new Date().toISOString(),
      });
      await api.post<any>(`/cases/${selectedCase.id}/transfer`, {
        toStatus: "quality_control",
        notes: "التشطيب مكتمل - تحويل لمراقبة الجودة",
      });
      toast.success("تم إكمال التشطيب والتحويل لمراقبة الجودة");
      setViewMode("list");
      loadCases();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const startFinishing = async (c: DentalCase) => {
    const furnace = FURNACES.find((f) => f.id === "furnace_1") || FURNACES[0];
    try {
      await api.put<any>(`/cases/${c.id}/finishing`, {
        technicianId: user?.id,
        technicianName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        startTime: new Date().toISOString(),
        stages: [],
        currentStage: "",
        furnaceId: furnace.id,
        furnaceName: furnace.name,
        firingCycles: 0,
        coloringStages: [],
      });
      toast.success("تم بدء التشطيب");
      openWorkspace({
        ...c,
        finishingData: {
          ...c.finishingData,
          technicianId: user?.id || "",
          technicianName: user?.fullNameAr || user?.fullName || "",
          status: "in_progress",
          startTime: new Date().toISOString(),
          stages: [],
          furnaceId: furnace.id,
          furnaceName: furnace.name,
          firingCycles: 0,
          coloringStages: [],
        } as any,
      });
      loadCases();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const transferToQC = async (caseId: string) => {
    try {
      await api.post<any>(`/cases/${caseId}/transfer`, {
        toStatus: "quality_control",
        notes: "Finishing completed - transferred to QC",
      });
      toast.success("تم تحويل الحالة لمراقبة الجودة");
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
            <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700" onClick={() => { saveFinishing(); setViewMode("list"); }}>
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع
            </Button>
            <div className="h-6 w-px bg-gray-600" />
            <span className="font-mono text-sm text-yellow-300">{selectedCase.caseNumber}</span>
            <Badge className="bg-yellow-600">{WORK_TYPE_LABELS[selectedCase.workType]?.ar}</Badge>
            <span className="text-xs text-gray-400">{selectedCase.patientName} | اللون: {selectedCase.shadeColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700 gap-1 text-xs" onClick={saveFinishing}>
              حفظ
            </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          <div className="w-80 flex flex-col gap-3 overflow-y-auto">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">الفرن ودورات الحرق</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div>
                  <Label className="text-[10px]">الفرن</Label>
                  <Select value={selectedFurnace} onValueChange={setSelectedFurnace}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FURNACES.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px]">دورات الحرق</Label>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="gap-1"><Flame className="w-3 h-3" /> {firingCycles}</Badge>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addFiringCycle}>+</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">التقييم والفحص</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div>
                  <Label className="text-[10px]">التقييم (1-10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={qualityScore}
                    onChange={(e) => setQualityScore(Math.min(10, Math.max(1, +e.target.value)))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={visualCheckPassed === true ? "default" : "outline"} className="flex-1 h-7 text-xs" onClick={() => setVisualCheckPassed(true)}>
                    <CheckCircle className="w-3 h-3" /> مقبول
                  </Button>
                  <Button size="sm" variant={visualCheckPassed === false ? "destructive" : "outline"} className="flex-1 h-7 text-xs" onClick={() => setVisualCheckPassed(false)}>
                    <XCircle className="w-3 h-3" /> مرفوض
                  </Button>
                </div>
                <Input value={visualCheckNotes} onChange={(e) => setVisualCheckNotes(e.target.value)} placeholder="ملاحظات الفحص..." className="h-8 text-xs" />
              </CardContent>
            </Card>
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={handleTransferToQC}>
              <Send className="w-4 h-4" /> إنهاء التشطيب وتحويل لمراقبة الجودة
            </Button>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">ملاحظات</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات التشطيب..." className="text-xs min-h-[80px] resize-none" />
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <Card className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-yellow-50">
              <Paintbrush className="w-24 h-24 text-yellow-500 opacity-50 mb-4" />
              <p className="text-lg font-bold text-yellow-700">قسم التشطيب والتلوين</p>
              <p className="text-sm text-muted-foreground mt-1">{selectedCase.caseNumber} • {WORK_TYPE_LABELS[selectedCase.workType]?.ar}</p>
              <Badge variant="outline" className="mt-3 gap-1">
                <span>اللون المستهدف: {selectedCase.shadeColor}</span>
              </Badge>
              {selectedCase.finishingData?.startTime && (
                <Badge variant="outline" className="mt-2 gap-1">
                  <Clock className="w-3 h-3" /> {getElapsed(selectedCase.finishingData.startTime)}
                </Badge>
              )}
              <div className="mt-4 flex gap-2 flex-wrap justify-center">
                <Badge className="bg-yellow-100 text-yellow-800">{FURNACES.find((m) => m.id === selectedFurnace)?.name}</Badge>
                <Badge className="bg-orange-100 text-orange-800 gap-1">
                  <Flame className="w-3 h-3" /> {firingCycles} دورات حرق
                </Badge>
                {qualityScore > 0 && <Badge className="bg-green-100 text-green-800 gap-1"><Star className="w-3 h-3" /> {qualityScore}/10</Badge>}
              </div>
            </Card>
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
            <Paintbrush className="w-7 h-7 text-yellow-600" />
            قسم التشطيب والتلوين
          </h1>
          <p className="text-muted-foreground">التلوين والحرق والتشطيب النهائي - جميع مراحل العمل</p>
        </div>
        <ScanCaseButton variant="outline" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{cases.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي الحالات</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{cases.filter((c) => c.finishingData?.status === "in_progress").length}</p>
          <p className="text-sm text-muted-foreground">قيد العمل</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">{cases.filter((c) => c.finishingData?.status === "completed").length}</p>
          <p className="text-sm text-muted-foreground">مكتمل</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-orange-600">
            {cases.reduce((s, c) => s + (c.finishingData?.firingCycles || 0), 0)}
          </p>
          <p className="text-sm text-muted-foreground">دورات الحرق</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-amber-600">
            {cases.filter((c) => c.finishingData?.status === "in_progress").length}
          </p>
          <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="w-5 h-5 text-yellow-600" />
            حالات التشطيب
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full" /></div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <Paintbrush className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-400">لا توجد حالات في التشطيب</p>
              <p className="text-sm text-gray-400">الحالات المحولة من التفريز ستظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => {
                const fd = c.finishingData;
                const elapsed = fd?.startTime ? Math.round((Date.now() - new Date(fd.startTime).getTime()) / 60000) : 0;

                return (
                  <div key={c.id} className="p-4 rounded-xl border-2 hover:shadow-md transition-all border-gray-200 hover:border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-yellow-700 text-lg">{c.caseNumber}</span>
                        <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                        <Badge variant="outline">اللون: {c.shadeColor}</Badge>
                        {fd && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Flame className="w-3 h-3 text-orange-500" /> {fd.firingCycles} حرق
                          </Badge>
                        )}
                        {fd?.status === "in_progress" && fd.startTime && (
                          <Badge variant="outline" className="gap-1 text-[10px] text-yellow-600">
                            <Clock className="w-3 h-3" /> {elapsed < 60 ? `${elapsed} د` : `${Math.floor(elapsed / 60)} س ${elapsed % 60} د`}
                          </Badge>
                        )}
                        {fd?.qualityScore && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Star className="w-3 h-3 text-amber-500" /> {fd.qualityScore}/10
                          </Badge>
                        )}
                        {fd?.furnaceName && <Badge variant="outline" className="text-[10px]">{fd.furnaceName}</Badge>}
                      </div>
                      <Link to={`/cases/${c.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {c.patientName} | الفني: {fd?.technicianName || "غير محدد"}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      {(!fd || fd.status === "pending" || fd.status === "in_progress") && (
                        <Button size="sm" className="gap-1 bg-yellow-600 hover:bg-yellow-700" onClick={() => (fd ? openWorkspace(c) : startFinishing(c))}>
                          {fd?.status === "in_progress" ? (
                            <><Paintbrush className="w-3 h-3" /> فتح محطة العمل</>
                          ) : (
                            <><Play className="w-3 h-3" /> {fd ? "فتح محطة العمل" : "بدء التشطيب"}</>
                          )}
                        </Button>
                      )}
                      {fd?.status === "completed" && (
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => transferToQC(c.id)}>
                          <Send className="w-3 h-3" /> تحويل للجودة
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
