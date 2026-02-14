/**
 * CAM / Milling Department - Full Workflow
 * ========================================
 * مراحل التفريز الكاملة:
 * - استيراد STL
 * - إعداد الوظيفة
 * - اختيار البلوك
 * - تثبيت البلوك
 * - بدء التفريز
 * - مراقبة التشغيل
 * - إخراج القطعة
 * - تنظيف وتجهيز
 * - فحص أولي
 * - تحويل للتشطيب
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Cpu, Send, Play, CheckCircle, Eye, Package, Clock, AlertTriangle,
  ChevronRight, Settings2, Box, Wrench, Activity, Trash2, RefreshCw,
  HardDrive, Layers, Zap, ArrowRight, Workflow, XCircle, CheckCircle2,
  FileUp, Droplets, Thermometer, PackageOpen, Sparkles,
} from "lucide-react";
import type { DentalCase, InventoryItem, CAMStage } from "@shared/api";

// ── Constants ──────────────────────────────
const MACHINES = [
  { id: "mill_1", name: "Roland DWX-52D", axes: 5, wet: true },
  { id: "mill_2", name: "Imes-Icore CORiTEC 350i", axes: 5, wet: true },
  { id: "mill_3", name: "Amann Girrbach Ceramill Motion 2", axes: 5, wet: true },
  { id: "mill_4", name: "Zirkonzahn M5", axes: 5, wet: true },
  { id: "mill_5", name: "Sirona CEREC", axes: 4, wet: false },
];

const CAM_STAGES_TEMPLATE: Omit<CAMStage, "id" | "status">[] = [
  { name: "STL Import", nameAr: "استيراد STL" },
  { name: "Job Setup", nameAr: "إعداد الوظيفة" },
  { name: "Block Selection", nameAr: "اختيار البلوك" },
  { name: "Block Mounting", nameAr: "تثبيت البلوك" },
  { name: "Start Milling", nameAr: "بدء التفريز" },
  { name: "Monitoring", nameAr: "مراقبة التشغيل" },
  { name: "Part Removal", nameAr: "إخراج القطعة" },
  { name: "Post-Mill Clean", nameAr: "تنظيف ما بعد التفريز" },
  { name: "Preliminary Check", nameAr: "فحص أولي" },
  { name: "Ready for Finishing", nameAr: "جاهز للتشطيب" },
];

// ── CAM Stage Action Panel ────────
const MILLING_STRATEGIES = [
  { id: "wet", nameAr: "رطب", icon: Droplets },
  { id: "dry", nameAr: "جاف", icon: Thermometer },
];

function CAMStageActionPanel({
  stageIndex,
  stageNameAr,
  cadDesignFilesCount,
  camStlFiles,
  onStlFileChange,
  millingStrategy,
  setMillingStrategy,
  selectedMachine,
  setSelectedMachine,
  selectedBlock,
  blocksForCase,
  onBlockSelect,
  blockMounted,
  setBlockMounted,
  millingStartTime,
  onStartMilling,
  partRemoved,
  setPartRemoved,
  cleanDone,
  setCleanDone,
  inspectionPassed,
  setInspectionPassed,
  inspectionNotes,
  setInspectionNotes,
  onAddError,
  onCompleteStage,
  canComplete,
  onRejectStage,
  onTransferToFinishing,
  machines,
  getElapsed,
}: {
  stageIndex: number;
  stageNameAr: string;
  cadDesignFilesCount: number;
  camStlFiles: { id: string; fileName: string }[];
  onStlFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  millingStrategy: string;
  setMillingStrategy: (v: string) => void;
  selectedMachine: string;
  setSelectedMachine: (v: string) => void;
  selectedBlock: InventoryItem | null;
  blocksForCase: InventoryItem[];
  onBlockSelect: (block: InventoryItem | null) => void;
  blockMounted: boolean;
  setBlockMounted: (v: boolean) => void;
  millingStartTime: string | null;
  onStartMilling: () => void;
  partRemoved: boolean;
  setPartRemoved: (v: boolean) => void;
  cleanDone: boolean;
  setCleanDone: (v: boolean) => void;
  inspectionPassed: boolean | null;
  setInspectionPassed: (v: boolean | null) => void;
  inspectionNotes: string;
  setInspectionNotes: (v: string) => void;
  onAddError: () => void;
  onCompleteStage: () => void;
  canComplete: boolean;
  onRejectStage: () => void;
  onTransferToFinishing: () => void;
  machines: typeof MACHINES;
  getElapsed: (startTime?: string) => string | null;
}) {
  const stagePanels: Record<number, React.ReactNode> = {
    0: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">استيراد ملف STL من التصميم أو رفع ملف جديد</p>
        {cadDesignFilesCount > 0 && (
          <div className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {cadDesignFilesCount} ملف من التصميم
          </div>
        )}
        <label className="flex items-center justify-center gap-1.5 w-full h-8 rounded border border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50 cursor-pointer text-xs text-orange-700">
          <FileUp className="w-3.5 h-3.5" /> رفع STL
          <input type="file" accept=".stl" className="hidden" onChange={onStlFileChange} />
        </label>
        {camStlFiles.length > 0 && (
          <p className="text-[10px] text-green-600">{camStlFiles.length} ملف محلي</p>
        )}
      </div>
    ),
    1: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">إعداد الوظيفة والماكينة</p>
        <Select value={selectedMachine} onValueChange={setSelectedMachine}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {machines.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <Label className="text-[10px]">طريقة التفريز</Label>
          <div className="flex gap-1 mt-1">
            {MILLING_STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setMillingStrategy(s.id)}
                className={`flex-1 flex items-center justify-center gap-1 p-1.5 rounded border text-[10px] ${
                  millingStrategy === s.id ? "border-orange-500 bg-orange-50" : "border-gray-200"
                }`}
              >
                <s.icon className="w-3 h-3" /> {s.nameAr}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),
    2: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">اختر البلوك المناسب</p>
        <Select
          value={selectedBlock?.id || ""}
          onValueChange={(v) => onBlockSelect(blocksForCase.find((b) => b.id === v) || null)}
        >
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="اختر البلوك" /></SelectTrigger>
          <SelectContent>
            {blocksForCase.length === 0 ? (
              <SelectItem value="_none" disabled>لا توجد بلوكات</SelectItem>
            ) : (
              blocksForCase.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.nameAr || b.name} ({b.currentStock})</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {selectedBlock && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {selectedBlock.nameAr || selectedBlock.name}
          </p>
        )}
      </div>
    ),
    3: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">تثبيت البلوك في الماكينة</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={blockMounted ? "default" : "outline"}
            className="flex-1 h-8 text-xs gap-1"
            onClick={() => setBlockMounted(true)}
          >
            <Package className="w-3 h-3" /> تم التثبيت
          </Button>
          {blockMounted && (
            <div className="text-[10px] text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    ),
    4: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">بدء عملية التفريز</p>
        {!millingStartTime ? (
          <Button size="sm" className="w-full h-8 gap-1 bg-orange-600 hover:bg-orange-700" onClick={onStartMilling}>
            <Play className="w-4 h-4" /> بدء التفريز
          </Button>
        ) : (
          <div className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> بدأ التفريز
          </div>
        )}
      </div>
    ),
    5: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">مراقبة التشغيل</p>
        {millingStartTime && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock className="w-3 h-3" /> {getElapsed(millingStartTime)}
          </Badge>
        )}
        <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={onAddError}>
          <AlertTriangle className="w-3 h-3" /> تسجيل خطأ
        </Button>
      </div>
    ),
    6: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">إخراج القطعة من الماكينة</p>
        <Button
          size="sm"
          variant={partRemoved ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setPartRemoved(true)}
        >
          <PackageOpen className="w-3 h-3" /> تم الإخراج
        </Button>
        {partRemoved && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> تم إخراج القطعة
          </p>
        )}
      </div>
    ),
    7: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">تنظيف ما بعد التفريز</p>
        <Button
          size="sm"
          variant={cleanDone ? "default" : "outline"}
          className="w-full h-8 text-xs gap-1"
          onClick={() => setCleanDone(true)}
        >
          <Sparkles className="w-3 h-3" /> تم التنظيف
        </Button>
        {cleanDone && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> تنظيف الماكينة مكتمل
          </p>
        )}
      </div>
    ),
    8: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">فحص أولي للقطعة</p>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={inspectionPassed === true ? "default" : "outline"}
            className="flex-1 h-7 text-xs"
            onClick={() => setInspectionPassed(true)}
          >
            <CheckCircle className="w-3 h-3" /> مقبول
          </Button>
          <Button
            size="sm"
            variant={inspectionPassed === false ? "destructive" : "outline"}
            className="flex-1 h-7 text-xs"
            onClick={() => setInspectionPassed(false)}
          >
            <XCircle className="w-3 h-3" /> مرفوض
          </Button>
        </div>
        <Input
          value={inspectionNotes}
          onChange={(e) => setInspectionNotes(e.target.value)}
          placeholder="ملاحظات الفحص..."
          className="h-7 text-xs"
        />
      </div>
    ),
    9: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">جاهز للتشطيب</p>
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          <p>✓ التفريز مكتمل</p>
          <p>✓ الفحص أولي: {inspectionPassed === true ? "مقبول" : inspectionPassed === false ? "مرفوض" : "-"}</p>
        </div>
        <Button size="sm" className="w-full h-8 gap-1 bg-green-600 hover:bg-green-700" onClick={onTransferToFinishing}>
          <Send className="w-3 h-3" /> تحويل للتشطيب
        </Button>
      </div>
    ),
  };

  const content = stagePanels[stageIndex];

  return (
    <div className="bg-white rounded-lg p-3 shadow border">
      <p className="text-[10px] text-gray-500 mb-1">المرحلة {stageIndex + 1}/10</p>
      <p className="text-sm font-bold text-orange-700 mb-2">{stageNameAr}</p>
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
  onStageComplete,
}: {
  stages: CAMStage[];
  currentStage: string;
  onStageClick: (id: string) => void;
  onStageComplete: (id: string) => void;
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
                isActive ? "bg-orange-100 border-orange-400 shadow-md scale-105" :
                isCompleted ? "bg-green-50 border-green-300" :
                isRejected ? "bg-red-50 border-red-300" :
                isInProgress ? "bg-amber-50 border-amber-300" :
                "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold mb-0.5 ${
                isCompleted ? "bg-green-500" : isRejected ? "bg-red-500" :
                isInProgress ? "bg-amber-500" : isActive ? "bg-orange-500" : "bg-gray-300"
              }`}>
                {isCompleted ? "✓" : isRejected ? "✗" : idx + 1}
              </div>
              <span className={`text-center leading-tight ${isActive ? "font-bold text-orange-700" : ""}`}>
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

export default function CAMDepartment() {
  const { user } = useAuth();
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<DentalCase | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "workspace">("list");

  // Workspace state
  const [stages, setStages] = useState<CAMStage[]>([]);
  const [currentStageId, setCurrentStageId] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("mill_1");
  const [selectedBlock, setSelectedBlock] = useState<InventoryItem | null>(null);
  const [camNotes, setCamNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [showAddErrorDialog, setShowAddErrorDialog] = useState(false);
  const [newErrorText, setNewErrorText] = useState("");
  // Stage-specific state
  const [camStlFiles, setCamStlFiles] = useState<{ id: string; fileName: string }[]>([]);
  const [millingStrategy, setMillingStrategy] = useState("wet");
  const [blockMounted, setBlockMounted] = useState(false);
  const [millingStartTime, setMillingStartTime] = useState<string | null>(null);
  const [partRemoved, setPartRemoved] = useState(false);
  const [cleanDone, setCleanDone] = useState(false);
  const [inspectionPassed, setInspectionPassed] = useState<boolean | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState("");

  const reload = () => {
    api.get<any>("/cases?status=cam_milling").then((r) => setCases(r.data || []));
    api.get<any>("/inventory?category=blocks").then((r) => setInventory(r.data || []));
  };

  useEffect(() => {
    Promise.all([
      api.get<any>("/cases?status=cam_milling"),
      api.get<any>("/inventory?category=blocks"),
    ]).then(([casesRes, invRes]) => {
      setCases(casesRes.data || []);
      setInventory(invRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const openWorkspace = (c: DentalCase) => {
    setSelectedCase(c);
    setViewMode("workspace");
    api.get<any>("/inventory?category=blocks").then((r) => setInventory(r.data || []));

    const existing = c.camData?.stages || [];
    if (existing.length === 0) {
      const newStages: CAMStage[] = CAM_STAGES_TEMPLATE.map((s, i) => ({
        ...s,
        id: `cam_stage_${i}`,
        status: i === 0 ? "in_progress" as const : "pending" as const,
      }));
      setStages(newStages);
      setCurrentStageId("cam_stage_0");
    } else {
      setStages(existing);
      setCurrentStageId(c.camData?.currentStage || existing[0]?.id || "");
    }

    setSelectedMachine(c.camData?.machineId || "mill_1");
    setCamNotes(c.camData?.notes || "");
    setErrors(c.camData?.errors || []);
    setCamStlFiles((c.camData as any)?.camStlFiles || []);
    setMillingStrategy((c.camData as any)?.millingStrategy || "wet");
    setBlockMounted((c.camData as any)?.blockMounted ?? false);
    setMillingStartTime((c.camData as any)?.millingStartTime || null);
    setPartRemoved((c.camData as any)?.partRemoved ?? false);
    setCleanDone((c.camData as any)?.cleanDone ?? false);
    setInspectionPassed((c.camData as any)?.inspectionPassed ?? null);
    setInspectionNotes((c.camData as any)?.inspectionNotes || "");

    const blockId = c.camData?.blockId;
    if (blockId) {
      const block = inventory.find((i) => i.id === blockId);
      setSelectedBlock(block || null);
    } else {
      setSelectedBlock(null);
    }
  };

  const blocks = inventory.filter((i) => i.category === "blocks" && i.currentStock > 0);
  const blocksForCase = selectedCase
    ? blocks.filter((b) => {
        const name = (b.name || b.nameAr || "").toLowerCase();
        const wt = selectedCase.workType.toLowerCase();
        const shade = selectedCase.shadeColor;
        return name.includes(wt) || name.includes("zirconia") || name.includes("emax") || name.includes("زركونيا") || name.includes("إي ماكس");
      })
    : blocks;

  const saveCAM = async () => {
    if (!selectedCase) return;
    try {
      await api.put<any>(`/cases/${selectedCase.id}/cam`, {
        operatorId: user?.id,
        operatorName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        stages,
        currentStage: currentStageId,
        machineId: selectedMachine,
        machineName: MACHINES.find((m) => m.id === selectedMachine)?.name,
        blockType: selectedBlock ? selectedBlock.nameAr || selectedBlock.name : "",
        blockId: selectedBlock?.id,
        blockName: selectedBlock?.nameAr,
        blockSku: selectedBlock?.sku,
        notes: camNotes,
        errors,
        camStlFiles,
        millingStrategy,
        blockMounted,
        millingStartTime,
        partRemoved,
        cleanDone,
        inspectionPassed,
        inspectionNotes,
        startTime: selectedCase.camData?.startTime || new Date().toISOString(),
      });
      toast.success("تم حفظ بيانات التفريز");
      reload();
    } catch (err: any) {
      toast.error(err.message);
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

  const completeCAM = async () => {
    if (!selectedCase) return;
    try {
      if (selectedBlock) {
        await api.post<any>(`/inventory/${selectedBlock.id}/deduct`, {
          quantity: 1,
          caseId: selectedCase.id,
          caseNumber: selectedCase.caseNumber,
          reason: `خصم تفريز - ${selectedCase.caseNumber} - ${selectedBlock.nameAr}`,
        });
      }

      const startTime = selectedCase.camData?.startTime ? new Date(selectedCase.camData.startTime).getTime() : Date.now();
      const duration = Math.round((Date.now() - startTime) / 60000);

      await api.put<any>(`/cases/${selectedCase.id}/cam`, {
        operatorId: user?.id,
        operatorName: user?.fullNameAr || user?.fullName,
        status: "completed",
        stages,
        currentStage: currentStageId,
        machineId: selectedMachine,
        machineName: MACHINES.find((m) => m.id === selectedMachine)?.name,
        blockType: selectedBlock ? selectedBlock.nameAr || selectedBlock.name : "",
        blockId: selectedBlock?.id,
        endTime: new Date().toISOString(),
        millingDuration: duration,
        materialDeducted: !!selectedBlock,
        notes: camNotes,
        errors,
        camStlFiles,
        millingStrategy,
        blockMounted,
        millingStartTime,
        partRemoved,
        cleanDone,
        inspectionPassed,
        inspectionNotes,
      });
      toast.success(`تم إكمال التفريز (${duration} دقيقة)`);
      setViewMode("list");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const transferToFinishing = async () => {
    if (!selectedCase) return;
    try {
      await api.post<any>(`/cases/${selectedCase.id}/transfer`, {
        toStatus: "finishing",
        notes: "CAM completed - transferred to finishing",
      });
      toast.success("تم تحويل الحالة للتشطيب");
      setViewMode("list");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startMillingQuick = async (c: DentalCase) => {
    try {
      await api.put<any>(`/cases/${c.id}/cam`, {
        operatorId: user?.id,
        operatorName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        startTime: new Date().toISOString(),
        blockType: `${c.workType} Block`,
        machineId: "mill_1",
        machineName: MACHINES[0].name,
        materialDeducted: false,
      });
      toast.success("تم بدء التفريز");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addError = () => {
    if (!newErrorText.trim()) return;
    setErrors((prev) => [...prev, `${new Date().toLocaleTimeString("ar-EG")}: ${newErrorText.trim()}`]);
    setNewErrorText("");
    setShowAddErrorDialog(false);
  };

  const removeError = (idx: number) => setErrors((prev) => prev.filter((_, i) => i !== idx));

  const onStlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newFiles = Array.from(files).map((f) => ({ id: `stl_${Date.now()}_${Math.random().toString(36).slice(2)}`, fileName: f.name }));
    setCamStlFiles((prev) => [...prev, ...newFiles]);
    toast.success(`تم إضافة ${newFiles.length} ملف`);
    e.target.value = "";
  };

  const onStartMilling = () => {
    setMillingStartTime(new Date().toISOString());
    toast.success("تم بدء التفريز");
  };

  const handleTransferFromStage9 = async () => {
    if (!selectedCase) return;
    const updatedStages = stages.map((s) =>
      s.id === currentStageId ? { ...s, status: "completed" as const, endTime: new Date().toISOString() } : s
    );
    setStages(updatedStages);
    try {
      if (selectedBlock) {
        await api.post<any>(`/inventory/${selectedBlock.id}/deduct`, {
          quantity: 1,
          caseId: selectedCase.id,
          caseNumber: selectedCase.caseNumber,
          reason: `خصم تفريز - ${selectedCase.caseNumber}`,
        });
      }
      const startTime = selectedCase.camData?.startTime ? new Date(selectedCase.camData.startTime).getTime() : Date.now();
      const duration = Math.round((Date.now() - startTime) / 60000);
      await api.put<any>(`/cases/${selectedCase.id}/cam`, {
        operatorId: user?.id,
        operatorName: user?.fullNameAr || user?.fullName,
        status: "completed",
        stages: updatedStages,
        currentStage: currentStageId,
        machineId: selectedMachine,
        machineName: MACHINES.find((m) => m.id === selectedMachine)?.name,
        blockType: selectedBlock ? selectedBlock.nameAr || selectedBlock.name : "",
        blockId: selectedBlock?.id,
        endTime: new Date().toISOString(),
        millingDuration: duration,
        materialDeducted: !!selectedBlock,
        notes: camNotes,
        errors,
        camStlFiles,
        millingStrategy,
        blockMounted,
        millingStartTime,
        partRemoved,
        cleanDone,
        inspectionPassed,
        inspectionNotes,
      });
      await api.post<any>(`/cases/${selectedCase.id}/transfer`, { toStatus: "finishing", notes: "CAM مكتمل - تحويل للتشطيب" });
      toast.success("تم إكمال التفريز والتحويل للتشطيب");
      setViewMode("list");
      reload();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const progressPercent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
  const allStagesComplete = completedCount === stages.length && stages.length > 0;

  const getElapsed = (startTime?: string) => {
    if (!startTime) return null;
    const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    if (mins < 60) return `${mins} دقيقة`;
    return `${Math.floor(mins / 60)} ساعة ${mins % 60} دقيقة`;
  };

  // ── WORKSPACE VIEW ─────────────────────────
  if (viewMode === "workspace" && selectedCase) {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col gap-2">
        <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2 rounded-lg">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700" onClick={() => { saveCAM(); setViewMode("list"); }}>
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع
            </Button>
            <div className="h-6 w-px bg-gray-600" />
            <span className="font-mono text-sm text-orange-300">{selectedCase.caseNumber}</span>
            <Badge className="bg-orange-600">{WORK_TYPE_LABELS[selectedCase.workType]?.ar}</Badge>
            <span className="text-xs text-gray-400">{selectedCase.patientName} | {selectedCase.shadeColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">التقدم:</span>
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-green-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[10px] text-green-400 font-bold">{progressPercent}%</span>
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700 gap-1 text-xs" onClick={saveCAM}>
              حفظ
            </Button>
            {allStagesComplete && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1 text-xs" onClick={completeCAM}>
                <CheckCircle className="w-3 h-3" /> إنهاء التفريز
              </Button>
            )}
          </div>
        </div>

        <Card className="p-2">
          <StagePipeline stages={stages} currentStage={currentStageId} onStageClick={setCurrentStageId} onStageComplete={completeStage} />
        </Card>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: Case info + Stage actions */}
          <div className="w-80 flex flex-col gap-3 overflow-y-auto">
            <CAMStageActionPanel
              stageIndex={parseInt(currentStageId.replace("cam_stage_", ""), 10) || 0}
              stageNameAr={stages.find((s) => s.id === currentStageId)?.nameAr || "-"}
              cadDesignFilesCount={selectedCase?.cadData?.designFiles?.length || 0}
              camStlFiles={camStlFiles}
              onStlFileChange={onStlFileChange}
              millingStrategy={millingStrategy}
              setMillingStrategy={setMillingStrategy}
              selectedMachine={selectedMachine}
              setSelectedMachine={setSelectedMachine}
              selectedBlock={selectedBlock}
              blocksForCase={blocksForCase}
              onBlockSelect={setSelectedBlock}
              blockMounted={blockMounted}
              setBlockMounted={setBlockMounted}
              millingStartTime={millingStartTime}
              onStartMilling={onStartMilling}
              partRemoved={partRemoved}
              setPartRemoved={setPartRemoved}
              cleanDone={cleanDone}
              setCleanDone={setCleanDone}
              inspectionPassed={inspectionPassed}
              setInspectionPassed={setInspectionPassed}
              inspectionNotes={inspectionNotes}
              setInspectionNotes={setInspectionNotes}
              onAddError={() => setShowAddErrorDialog(true)}
              onCompleteStage={() => completeStage(currentStageId)}
              canComplete={!!stages.find((s) => s.id === currentStageId && s.status === "in_progress")}
              onRejectStage={() => rejectStage(currentStageId)}
              onTransferToFinishing={handleTransferFromStage9}
              machines={MACHINES}
              getElapsed={getElapsed}
            />

            <Card>
              <CardHeader className="py-2 px-3 flex flex-row justify-between">
                <CardTitle className="text-xs flex items-center gap-1"><HardDrive className="w-3 h-3" /> الماكينة</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MACHINES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="text-xs">{m.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3 flex flex-row justify-between">
                <CardTitle className="text-xs flex items-center gap-1"><Box className="w-3 h-3" /> البلوك</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Select
                  value={selectedBlock?.id || ""}
                  onValueChange={(v) => setSelectedBlock(blocks.find((b) => b.id === v) || null)}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر البلوك" /></SelectTrigger>
                  <SelectContent>
                    {blocksForCase.length === 0 ? (
                      <SelectItem value="_none" disabled>لا توجد بلوكات متاحة</SelectItem>
                    ) : (
                      blocksForCase.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="text-xs">{b.nameAr || b.name} ({b.currentStock} متاح)</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedBlock && (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-[10px]">
                    SKU: {selectedBlock.sku} | التكلفة: {selectedBlock.costPerUnit} ج.م
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3 flex flex-row justify-between">
                <CardTitle className="text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> الأخطاء ({errors.length})</CardTitle>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowAddErrorDialog(true)}>+</Button>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {errors.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">لا توجد أخطاء</p>
                ) : (
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-1 text-[10px] p-1.5 bg-red-50 rounded">
                        <span className="flex-1 truncate">{e}</span>
                        <button onClick={() => removeError(i)} className="text-red-500 hover:text-red-700"><XCircle className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1"><Layers className="w-3 h-3" /> ملاحظات</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Textarea value={camNotes} onChange={(e) => setCamNotes(e.target.value)} placeholder="ملاحظات التفريز..." className="text-xs min-h-[80px] resize-none" />
              </CardContent>
            </Card>
          </div>

          {/* Center: Visual / Status */}
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <Card className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
              <Cpu className="w-24 h-24 text-orange-400 opacity-50 mb-4" />
              <p className="text-lg font-bold text-orange-700">قسم التفريز CAM</p>
              <p className="text-sm text-muted-foreground mt-1">{selectedCase.caseNumber} • {WORK_TYPE_LABELS[selectedCase.workType]?.ar}</p>
              {selectedCase.camData?.startTime && (
                <Badge variant="outline" className="mt-3 gap-1">
                  <Clock className="w-3 h-3" /> {getElapsed(selectedCase.camData.startTime)}
                </Badge>
              )}
              <div className="mt-4 flex gap-2">
                <Badge className="bg-orange-100 text-orange-800">{MACHINES.find((m) => m.id === selectedMachine)?.name}</Badge>
                {selectedBlock && <Badge className="bg-green-100 text-green-800">{selectedBlock.nameAr || selectedBlock.name}</Badge>}
              </div>
            </Card>
          </div>
        </div>

        <Dialog open={showAddErrorDialog} onOpenChange={setShowAddErrorDialog}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader><DialogTitle>إضافة خطأ</DialogTitle></DialogHeader>
            <Input value={newErrorText} onChange={(e) => setNewErrorText(e.target.value)} placeholder="وصف الخطأ..." />
            <DialogFooter>
              <Button onClick={addError} disabled={!newErrorText.trim()}>إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────
  const totalBlocks = inventory.reduce((s, i) => s + i.currentStock, 0);
  const lowBlockItems = inventory.filter((i) => i.currentStock <= i.minimumStock);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="w-7 h-7 text-orange-600" />
          قسم التفريز CAM
        </h1>
        <p className="text-muted-foreground">مراحل التفريز الكاملة - تشغيل الماكينات وإدارة البلوكات</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "إجمالي", value: cases.length, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
          { label: "في الانتظار", value: cases.filter((c) => !c.camData || c.camData.status === "pending").length, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
          { label: "قيد التشغيل", value: cases.filter((c) => c.camData?.status === "in_progress").length, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "مكتمل", value: cases.filter((c) => c.camData?.status === "completed").length, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "بلوكات متاحة", value: totalBlocks, color: lowBlockItems.length > 0 ? "text-red-600" : "text-amber-600", bg: lowBlockItems.length > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200" },
          { label: "عاجل", value: cases.filter((c) => c.priority === "rush" || c.priority === "urgent").length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="pt-3 pb-2 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="w-5 h-5 text-orange-600" />
            حالات التفريز
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <Cpu className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-400">لا توجد حالات في قسم التفريز</p>
              <p className="text-sm text-gray-400">الحالات المحولة من التصميم ستظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => {
                const stagesCount = c.camData?.stages?.length || 0;
                const completedCount = c.camData?.stages?.filter((s) => s.status === "completed").length || 0;
                const progress = stagesCount > 0 ? Math.round((completedCount / stagesCount) * 100) : 0;
                const elapsed = c.camData?.startTime ? Math.round((Date.now() - new Date(c.camData.startTime).getTime()) / 60000) : 0;

                return (
                  <div key={c.id} className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    c.priority === "rush" ? "border-red-200 bg-red-50/30" :
                    c.priority === "urgent" ? "border-amber-200 bg-amber-50/30" :
                    "border-gray-200 hover:border-orange-200"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-orange-700 text-lg">{c.caseNumber}</span>
                        <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                        <Badge className={c.priority === "rush" ? "bg-red-500 text-white" : c.priority === "urgent" ? "bg-amber-500 text-white" : "bg-gray-200"}>
                          {c.priority === "rush" ? "عاجل" : c.priority === "urgent" ? "مستعجل" : "عادي"}
                        </Badge>
                        {c.camData?.status && (
                          <Badge variant="outline" className={
                            c.camData.status === "completed" ? "bg-green-100 text-green-800" :
                            c.camData.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-gray-100"
                          }>
                            {c.camData.status === "completed" ? "مكتمل" : c.camData.status === "in_progress" ? "قيد التشغيل" : "في الانتظار"}
                          </Badge>
                        )}
                        {c.camData?.machineName && <Badge variant="outline" className="text-[10px]">{c.camData.machineName}</Badge>}
                        {c.camData?.status === "in_progress" && (
                          <Badge variant="outline" className="gap-1 text-[10px] text-orange-600">
                            <Clock className="w-3 h-3" /> {elapsed < 60 ? `${elapsed} د` : `${Math.floor(elapsed / 60)} س ${elapsed % 60} د`}
                          </Badge>
                        )}
                      </div>
                      <Link to={`/cases/${c.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                      <div><span className="text-muted-foreground text-xs">المريض:</span> {c.patientName}</div>
                      <div><span className="text-muted-foreground text-xs">الأسنان:</span> <span className="font-mono font-bold">{c.teethNumbers}</span></div>
                      <div><span className="text-muted-foreground text-xs">اللون:</span> {c.shadeColor}</div>
                      <div><span className="text-muted-foreground text-xs">البلوك:</span> {c.camData?.blockType || "-"}</div>
                    </div>

                    {stagesCount > 0 && c.camData?.status === "in_progress" && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>تقدم التفريز</span>
                          <span>{completedCount}/{stagesCount} مراحل ({progress}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-500 to-green-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {(!c.camData || c.camData.status === "pending") && (
                        <>
                          <Button size="sm" className="gap-1 bg-orange-600 hover:bg-orange-700" onClick={() => openWorkspace(c)}>
                            <Play className="w-3 h-3" /> فتح محطة العمل
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => startMillingQuick(c)}>
                            بدء سريع
                          </Button>
                        </>
                      )}
                      {c.camData?.status === "in_progress" && (
                        <Button size="sm" className="gap-1 bg-orange-600 hover:bg-orange-700" onClick={() => openWorkspace(c)}>
                          <RefreshCw className="w-3 h-3" /> فتح محطة العمل
                        </Button>
                      )}
                      {c.camData?.status === "completed" && (
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={async () => {
                          try {
                            await api.post<any>(`/cases/${c.id}/transfer`, { toStatus: "finishing", notes: "CAM completed" });
                            toast.success("تم تحويل الحالة للتشطيب");
                            reload();
                          } catch (err: any) { toast.error(err.message); }
                        }}>
                          <Send className="w-3 h-3" /> تحويل للتشطيب
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
