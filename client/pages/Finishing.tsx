/**
 * Finishing & Coloring Department - Enhanced with quality score, furnace selection, notes
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
import { toast } from "sonner";
import { Paintbrush, Send, Play, CheckCircle, Eye, Flame, Clock, Star } from "lucide-react";
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
  const [selectedFurnaces, setSelectedFurnaces] = useState<Record<string, string>>({});
  const [qualityScores, setQualityScores] = useState<Record<string, number>>({});
  const [finishNotes, setFinishNotes] = useState<Record<string, string>>({});

  useEffect(() => { loadCases(); }, []);

  const loadCases = () => {
    api.get<any>("/cases?status=finishing")
      .then((r) => setCases(r.data || []))
      .finally(() => setLoading(false));
  };

  const startFinishing = async (caseId: string) => {
    const furnace = FURNACES.find(f => f.id === (selectedFurnaces[caseId] || "furnace_1")) || FURNACES[0];
    try {
      await api.put<any>(`/cases/${caseId}/finishing`, {
        technicianId: user?.id || "user_5",
        technicianName: user?.fullNameAr || "فاطمة نور",
        status: "in_progress",
        startTime: new Date().toISOString(),
        coloringStages: [],
        furnaceId: furnace.id,
        furnaceName: furnace.name,
        firingCycles: 0,
        notes: finishNotes[caseId] || "",
      });
      toast.success(`تم بدء التشطيب - الفرن: ${furnace.name}`);
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addFiringCycle = async (c: DentalCase) => {
    try {
      await api.put<any>(`/cases/${c.id}/finishing`, {
        ...c.finishingData,
        firingCycles: (c.finishingData?.firingCycles || 0) + 1,
      });
      toast.success("تم إضافة دورة حرق");
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const completeFinishing = async (c: DentalCase) => {
    const score = qualityScores[c.id] || 8;
    try {
      await api.put<any>(`/cases/${c.id}/finishing`, {
        ...c.finishingData,
        status: "completed",
        endTime: new Date().toISOString(),
        firingCycles: (c.finishingData?.firingCycles || 0) + 1,
        qualityScore: score,
        notes: finishNotes[c.id] || c.finishingData?.notes || "",
      });
      toast.success(`تم إكمال التشطيب (تقييم: ${score}/10)`);
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
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
      toast.error(err.message);
    }
  };

  const getElapsed = (startTime?: string) => {
    if (!startTime) return null;
    const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    return mins < 60 ? `${mins} دقيقة` : `${Math.floor(mins / 60)} ساعة ${mins % 60} د`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Paintbrush className="w-7 h-7 text-yellow-600" />
          قسم التشطيب والتلوين
        </h1>
        <p className="text-muted-foreground">التلوين والحرق والتشطيب النهائي</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{cases.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي الحالات</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{cases.filter(c => c.finishingData?.status === "in_progress").length}</p>
          <p className="text-sm text-muted-foreground">قيد العمل</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">{cases.filter(c => c.finishingData?.status === "completed").length}</p>
          <p className="text-sm text-muted-foreground">مكتمل</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-orange-600">
            {cases.reduce((s, c) => s + (c.finishingData?.firingCycles || 0), 0)}
          </p>
          <p className="text-sm text-muted-foreground">إجمالي دورات الحرق</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">الحالات ({cases.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : cases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد حالات في التشطيب</p>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => (
                <div key={c.id} className="p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-primary">{c.caseNumber}</span>
                      <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                      <Badge variant="outline">اللون: {c.shadeColor}</Badge>
                      {c.finishingData && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Flame className="w-3 h-3 text-orange-500" /> {c.finishingData.firingCycles} حرق
                        </Badge>
                      )}
                      {c.finishingData?.status === "in_progress" && c.finishingData.startTime && (
                        <Badge variant="outline" className="gap-1 text-[10px] text-yellow-600">
                          <Clock className="w-3 h-3" /> {getElapsed(c.finishingData.startTime)}
                        </Badge>
                      )}
                      {c.finishingData?.qualityScore && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Star className="w-3 h-3 text-amber-500" /> {c.finishingData.qualityScore}/10
                        </Badge>
                      )}
                    </div>
                    <Link to={`/cases/${c.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {c.patientName} | الفني: {c.finishingData?.technicianName || "غير محدد"} | الفرن: {c.finishingData?.furnaceName || "-"}
                  </p>

                  {/* Pending: Select furnace and start */}
                  {(!c.finishingData || c.finishingData.status === "pending") && (
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="w-48">
                        <Label className="text-xs">الفرن</Label>
                        <Select value={selectedFurnaces[c.id] || "furnace_1"} onValueChange={(v) => setSelectedFurnaces({ ...selectedFurnaces, [c.id]: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FURNACES.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <Label className="text-xs">ملاحظات</Label>
                        <Input value={finishNotes[c.id] || ""} onChange={(e) => setFinishNotes({ ...finishNotes, [c.id]: e.target.value })}
                          placeholder="ملاحظات التشطيب..." className="h-8 text-xs" />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => startFinishing(c.id)} className="gap-1 h-8">
                        <Play className="w-3 h-3" /> بدء التشطيب
                      </Button>
                    </div>
                  )}

                  {/* In progress: Add cycles, set quality, complete */}
                  {c.finishingData?.status === "in_progress" && (
                    <div className="flex items-end gap-3 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => addFiringCycle(c)} className="gap-1 h-8">
                        <Flame className="w-3 h-3" /> +1 حرق
                      </Button>
                      <div className="w-24">
                        <Label className="text-xs">التقييم (1-10)</Label>
                        <Input type="number" min={1} max={10} value={qualityScores[c.id] || 8}
                          onChange={(e) => setQualityScores({ ...qualityScores, [c.id]: Number(e.target.value) })}
                          className="h-8 text-xs" />
                      </div>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-300 gap-1 h-8" onClick={() => completeFinishing(c)}>
                        <CheckCircle className="w-3 h-3" /> إنهاء التشطيب
                      </Button>
                    </div>
                  )}

                  {c.finishingData?.status === "completed" && (
                    <Button size="sm" onClick={() => transferToQC(c.id)} className="gap-1">
                      <Send className="w-3 h-3" /> تحويل للجودة
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
