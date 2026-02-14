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
  ChevronRight, Package, Sparkles, Palette, Layers, ThermometerSun,
  Gem, ArrowRight, Workflow, XCircle, CheckCircle2,
} from "lucide-react";
import type { DentalCase, FinishingStage } from "@shared/api";

const FURNACES = [
  { id: "furnace_1", name: "Programat P710" },
  { id: "furnace_2", name: "Vita Vacumat 6000 M" },
  { id: "furnace_3", name: "Dekema Austromat 654" },
];

const FINISHING_STAGES_TEMPLATE: Omit<FinishingStage, "id" | "status">[] = [
  { name: "Receive Piece", nameAr: "استقبال القطعة" },
  { name: "Initial Clean", nameAr: "التنظيف الابتدائي" },
  { name: "Base Coloring", nameAr: "التلوين الأساسي" },
  { name: "Extra Coloring", nameAr: "التلوين الإضافي" },
  { name: "Furnace Setup", nameAr: "إعداد الفرن" },
  { name: "First Firing", nameAr: "دورة الحرق الأولى" },
  { name: "Extra Firing", nameAr: "دورات حرق إضافية" },
  { name: "Polishing", nameAr: "التلميع" },
  { name: "Visual Check", nameAr: "الفحص البصري" },
  { name: "Ready for QC", nameAr: "جاهز لمراقبة الجودة" },
];

// ── Finishing Stage Action Panel ────────
function FinishingStageActionPanel({
  stageIndex,
  stageNameAr,
  pieceReceived,
  setPieceReceived,
  initialCleanDone,
  setInitialCleanDone,
  baseColoringDone,
  setBaseColoringDone,
  extraColoringDone,
  setExtraColoringDone,
  furnaceReady,
  setFurnaceReady,
  selectedFurnace,
  setSelectedFurnace,
  firstFiringDone,
  setFirstFiringDone,
  firingCycles,
  onAddFiringCycle,
  polishingDone,
  setPolishingDone,
  visualCheckPassed,
  setVisualCheckPassed,
  visualCheckNotes,
  setVisualCheckNotes,
  qualityScore,
  setQualityScore,
  onCompleteStage,
  canComplete,
  onRejectStage,
  onTransferToQC,
  furnaces,
  getElapsed,
  startTime,
}: {
  stageIndex: number;
  stageNameAr: string;
  pieceReceived: boolean;
  setPieceReceived: (v: boolean) => void;
  initialCleanDone: boolean;
  setInitialCleanDone: (v: boolean) => void;
  baseColoringDone: boolean;
  setBaseColoringDone: (v: boolean) => void;
  extraColoringDone: boolean;
  setExtraColoringDone: (v: boolean) => void;
  furnaceReady: boolean;
  setFurnaceReady: (v: boolean) => void;
  selectedFurnace: string;
  setSelectedFurnace: (v: string) => void;
  firstFiringDone: boolean;
  setFirstFiringDone: (v: boolean) => void;
  firingCycles: number;
  onAddFiringCycle: () => void;
  polishingDone: boolean;
  setPolishingDone: (v: boolean) => void;
  visualCheckPassed: boolean | null;
  setVisualCheckPassed: (v: boolean | null) => void;
  visualCheckNotes: string;
  setVisualCheckNotes: (v: string) => void;
  qualityScore: number;
  setQualityScore: (v: number) => void;
  onCompleteStage: () => void;
  canComplete: boolean;
  onRejectStage: () => void;
  onTransferToQC: () => void;
  furnaces: typeof FURNACES;
  getElapsed: (startTime?: string) => string | null;
  startTime?: string;
}) {
  const stagePanels: Record<number, React.ReactNode> = {
    0: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">استلام القطعة من قسم التفريز</p>
        <Button
          size="sm"
          variant={pieceReceived ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setPieceReceived(true)}
        >
          <Package className="w-3 h-3" /> تم الاستلام
        </Button>
        {pieceReceived && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> تم استلام القطعة
          </p>
        )}
      </div>
    ),
    1: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">تنظيف القطعة قبل التلوين</p>
        <Button
          size="sm"
          variant={initialCleanDone ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setInitialCleanDone(true)}
        >
          <Sparkles className="w-3 h-3" /> تم التنظيف
        </Button>
        {initialCleanDone && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
          </p>
        )}
      </div>
    ),
    2: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">طبقة التلوين الأساسية</p>
        <Button
          size="sm"
          variant={baseColoringDone ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setBaseColoringDone(true)}
        >
          <Palette className="w-3 h-3" /> تم التلوين الأساسي
        </Button>
        {baseColoringDone && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
          </p>
        )}
      </div>
    ),
    3: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">طبقات التلوين الإضافية / مطابقة اللون</p>
        <Button
          size="sm"
          variant={extraColoringDone ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setExtraColoringDone(true)}
        >
          <Layers className="w-3 h-3" /> تم التلوين الإضافي
        </Button>
        {extraColoringDone && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
          </p>
        )}
      </div>
    ),
    4: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">إعداد الفرن والتسخين</p>
        <Select value={selectedFurnace} onValueChange={setSelectedFurnace}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {furnaces.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={furnaceReady ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setFurnaceReady(true)}
        >
          <ThermometerSun className="w-3 h-3" /> الفرن جاهز
        </Button>
      </div>
    ),
    5: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">دورة الحرق الأولى</p>
        <Button
          size="sm"
          variant={firstFiringDone ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setFirstFiringDone(true)}
        >
          <Flame className="w-3 h-3" /> تم الحرق
        </Button>
        {firstFiringDone && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> دورة 1
          </p>
        )}
      </div>
    ),
    6: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">دورات حرق إضافية حسب الحاجة</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Flame className="w-3 h-3" /> {firingCycles} دورات
          </Badge>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onAddFiringCycle}>
            + حرق
          </Button>
        </div>
      </div>
    ),
    7: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">التلميع والتشطيب السطحي</p>
        <Button
          size="sm"
          variant={polishingDone ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setPolishingDone(true)}
        >
          <Gem className="w-3 h-3" /> تم التلميع
        </Button>
        {polishingDone && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
          </p>
        )}
      </div>
    ),
    8: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">الفحص البصري والتقييم</p>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={visualCheckPassed === true ? "default" : "outline"}
            className="flex-1 h-7 text-xs"
            onClick={() => setVisualCheckPassed(true)}
          >
            <CheckCircle className="w-3 h-3" /> مقبول
          </Button>
          <Button
            size="sm"
            variant={visualCheckPassed === false ? "destructive" : "outline"}
            className="flex-1 h-7 text-xs"
            onClick={() => setVisualCheckPassed(false)}
          >
            <XCircle className="w-3 h-3" /> مرفوض
          </Button>
        </div>
        <div>
          <Label className="text-[10px]">التقييم (1-10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={qualityScore}
            onChange={(e) => setQualityScore(Math.min(10, Math.max(1, +e.target.value)))}
            className="h-7 text-xs"
          />
        </div>
        <Input
          value={visualCheckNotes}
          onChange={(e) => setVisualCheckNotes(e.target.value)}
          placeholder="ملاحظات الفحص..."
          className="h-7 text-xs"
        />
      </div>
    ),
    9: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">جاهز للتحويل لمراقبة الجودة</p>
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          <p>✓ التقييم: {qualityScore}/10</p>
          <p>✓ الفحص: {visualCheckPassed === true ? "مقبول" : visualCheckPassed === false ? "مرفوض" : "-"}</p>
        </div>
        <Button size="sm" className="w-full h-8 gap-1 bg-green-600 hover:bg-green-700" onClick={onTransferToQC}>
          <Send className="w-3 h-3" /> تحويل للجودة
        </Button>
      </div>
    ),
  };

  const content = stagePanels[stageIndex];

  return (
    <div className="bg-white rounded-lg p-3 shadow border">
      <p className="text-[10px] text-gray-500 mb-1">المرحلة {stageIndex + 1}/10</p>
      <p className="text-sm font-bold text-yellow-700 mb-2">{stageNameAr}</p>
      {startTime && (
        <Badge variant="outline" className="mb-2 gap-1 text-[10px]">
          <Clock className="w-3 h-3" /> {getElapsed(startTime)}
        </Badge>
      )}
      {content}
      {stageIndex < 9 && (
        <div className="flex gap-1 mt-3">
          <Button size="sm" className="flex-1 h-7 text-xs gap-0.5" onClick={onCompleteStage} disabled={!canComplete}>
            <CheckCircle className="w-3 h-3" /> إتمام
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-red-600 border-red-300" onClick={onRejectStage}>
            <XCircle className="w-3 h-3" /> رفض
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Stage Pipeline Component ────────
function StagePipeline({
  stages,
  currentStage,
  onStageClick,
}: {
  stages: FinishingStage[];
  currentStage: string;
  onStageClick: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {stages.map((stage, idx) => {
        const isActive = stage.id === currentStage;
        const isCompleted = stage.status === "completed";
        const isRejected = stage.status === "rejected";
        const isInProgress = stage.status === "in_progress";
        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => onStageClick(stage.id)}
              className={`flex flex-col items-center px-2 py-1.5 rounded-lg text-[10px] min-w-[70px] transition-all border ${
                isActive ? "bg-yellow-100 border-yellow-400 shadow-md scale-105" :
                isCompleted ? "bg-green-50 border-green-300" :
                isRejected ? "bg-red-50 border-red-300" :
                isInProgress ? "bg-amber-50 border-amber-300" :
                "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold mb-0.5 ${
                isCompleted ? "bg-green-500" : isRejected ? "bg-red-500" :
                isInProgress ? "bg-amber-500" : isActive ? "bg-yellow-500" : "bg-gray-300"
              }`}>
                {isCompleted ? "✓" : isRejected ? "✗" : idx + 1}
              </div>
              <span className={`text-center leading-tight ${isActive ? "font-bold text-yellow-700" : ""}`}>
                {stage.nameAr}
              </span>
              {isInProgress && <span className="text-[8px] text-amber-600 mt-0.5">جارٍ...</span>}
            </button>
            {idx < stages.length - 1 && (
              <ChevronRight className={`w-3 h-3 mx-0.5 flex-shrink-0 ${isCompleted ? "text-green-400" : "text-gray-300"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Finishing() {
  const { user } = useAuth();
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<DentalCase | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "workspace">("list");

  // Workspace state
  const [stages, setStages] = useState<FinishingStage[]>([]);
  const [currentStageId, setCurrentStageId] = useState("");
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
    const existing = (fd as any)?.stages || [];
    if (existing.length === 0) {
      const newStages: FinishingStage[] = FINISHING_STAGES_TEMPLATE.map((s, i) => ({
        ...s,
        id: `fin_stage_${i}`,
        status: i === 0 ? "in_progress" : "pending",
      }));
      setStages(newStages);
      setCurrentStageId("fin_stage_0");
    } else {
      setStages(existing);
      setCurrentStageId((fd as any)?.currentStage || existing[0]?.id || "");
    }
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
        stages,
        currentStage: currentStageId,
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

  const completeStage = (stageId: string) => {
    setStages((prev) => {
      const updated = prev.map((s, i, arr) => {
        if (s.id === stageId) return { ...s, status: "completed" as const, endTime: new Date().toISOString() };
        const prevIdx = arr.findIndex((x) => x.id === stageId);
        if (i === prevIdx + 1 && (s.status === "pending" || s.status === "rejected")) {
          return { ...s, status: "in_progress" as const, startTime: new Date().toISOString() };
        }
        return s;
      });
      const nextIdx = updated.findIndex((s) => s.status === "in_progress");
      if (nextIdx >= 0) setCurrentStageId(updated[nextIdx].id);
      return updated;
    });
    toast.success("تم إتمام المرحلة");
  };

  const rejectStage = (stageId: string) => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === stageId);
      const updated = prev.map((s) => (s.id === stageId ? { ...s, status: "rejected" as const } : s));
      if (idx > 0) {
        updated[idx - 1] = { ...updated[idx - 1], status: "in_progress" as const, startTime: new Date().toISOString() };
        setCurrentStageId(updated[idx - 1].id);
      }
      return updated;
    });
    toast.warning("تم رفض المرحلة");
  };

  const addFiringCycle = () => {
    setFiringCycles((prev) => prev + 1);
    toast.success(`دورات الحرق: ${firingCycles + 1}`);
  };

  const handleTransferToQC = async () => {
    if (!selectedCase) return;
    const updatedStages = stages.map((s) =>
      s.id === currentStageId ? { ...s, status: "completed" as const, endTime: new Date().toISOString() } : s
    );
    setStages(updatedStages);
    const furnace = FURNACES.find((f) => f.id === selectedFurnace) || FURNACES[0];
    try {
      await api.put<any>(`/cases/${selectedCase.id}/finishing`, {
        technicianId: user?.id,
        technicianName: user?.fullNameAr || user?.fullName,
        status: "completed",
        stages: updatedStages,
        currentStage: currentStageId,
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
    const newStages: FinishingStage[] = FINISHING_STAGES_TEMPLATE.map((s, i) => ({
      ...s,
      id: `fin_stage_${i}`,
      status: i === 0 ? ("in_progress" as const) : ("pending" as const),
    }));
    try {
      await api.put<any>(`/cases/${c.id}/finishing`, {
        technicianId: user?.id,
        technicianName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        startTime: new Date().toISOString(),
        stages: newStages,
        currentStage: "fin_stage_0",
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
          stages: newStages,
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

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const progressPercent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
  const allStagesComplete = completedCount === stages.length && stages.length > 0;
  const currentStage = stages.find((s) => s.id === currentStageId);

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
            <span className="text-[10px] text-gray-400">التقدم:</span>
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-green-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[10px] text-green-400 font-bold">{progressPercent}%</span>
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700 gap-1 text-xs" onClick={saveFinishing}>
              حفظ
            </Button>
          </div>
        </div>

        <Card className="p-2">
          <StagePipeline stages={stages} currentStage={currentStageId} onStageClick={setCurrentStageId} />
        </Card>

        <div className="flex-1 flex gap-4 min-h-0">
          <div className="w-80 flex flex-col gap-3 overflow-y-auto">
            <FinishingStageActionPanel
              stageIndex={parseInt(currentStageId.replace("fin_stage_", ""), 10) || 0}
              stageNameAr={currentStage?.nameAr || "-"}
              pieceReceived={pieceReceived}
              setPieceReceived={setPieceReceived}
              initialCleanDone={initialCleanDone}
              setInitialCleanDone={setInitialCleanDone}
              baseColoringDone={baseColoringDone}
              setBaseColoringDone={setBaseColoringDone}
              extraColoringDone={extraColoringDone}
              setExtraColoringDone={setExtraColoringDone}
              furnaceReady={furnaceReady}
              setFurnaceReady={setFurnaceReady}
              selectedFurnace={selectedFurnace}
              setSelectedFurnace={setSelectedFurnace}
              firstFiringDone={firstFiringDone}
              setFirstFiringDone={setFirstFiringDone}
              firingCycles={firingCycles}
              onAddFiringCycle={addFiringCycle}
              polishingDone={polishingDone}
              setPolishingDone={setPolishingDone}
              visualCheckPassed={visualCheckPassed}
              setVisualCheckPassed={setVisualCheckPassed}
              visualCheckNotes={visualCheckNotes}
              setVisualCheckNotes={setVisualCheckNotes}
              qualityScore={qualityScore}
              setQualityScore={setQualityScore}
              onCompleteStage={() => completeStage(currentStageId)}
              canComplete={!!currentStage && currentStage.status === "in_progress"}
              onRejectStage={() => rejectStage(currentStageId)}
              onTransferToQC={handleTransferToQC}
              furnaces={FURNACES}
              getElapsed={getElapsed}
              startTime={selectedCase.finishingData?.startTime}
            />

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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Paintbrush className="w-7 h-7 text-yellow-600" />
          قسم التشطيب والتلوين
        </h1>
        <p className="text-muted-foreground">التلوين والحرق والتشطيب النهائي - جميع مراحل العمل</p>
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
            {cases.filter((c) => (c.finishingData as any)?.stages?.length).length}
          </p>
          <p className="text-sm text-muted-foreground">بمسارات عمل</p>
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
                const finishStages = (fd as any)?.stages || [];
                const completedCount = finishStages.filter((s: any) => s.status === "completed").length;
                const progress = finishStages.length > 0 ? Math.round((completedCount / finishStages.length) * 100) : 0;
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

                    {finishStages.length > 0 && fd?.status === "in_progress" && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>تقدم التشطيب</span>
                          <span>{completedCount}/{finishStages.length} مراحل ({progress}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-green-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

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
