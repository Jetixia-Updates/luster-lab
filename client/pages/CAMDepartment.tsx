/**
 * CAM / Milling Department - Enhanced with machine selection, duration, notes
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
import { Cpu, Send, Play, CheckCircle, Eye, Package, Clock, AlertTriangle } from "lucide-react";
import type { DentalCase, InventoryItem } from "@shared/api";

const MACHINES = [
  { id: "mill_1", name: "Roland DWX-52D" },
  { id: "mill_2", name: "Imes-Icore CORiTEC 350i" },
  { id: "mill_3", name: "Amann Girrbach Ceramill Motion 2" },
];

export default function CAMDepartment() {
  const { user } = useAuth();
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachines, setSelectedMachines] = useState<Record<string, string>>({});
  const [camNotes, setCamNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get<any>("/cases?status=cam_milling"),
      api.get<any>("/inventory?category=blocks"),
    ]).then(([casesRes, invRes]) => {
      setCases(casesRes.data || []);
      setInventory(invRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const reload = () => {
    api.get<any>("/cases?status=cam_milling").then((r) => setCases(r.data || []));
    api.get<any>("/inventory?category=blocks").then((r) => setInventory(r.data || []));
  };

  const startMilling = async (caseId: string, blockType: string) => {
    const machine = MACHINES.find(m => m.id === (selectedMachines[caseId] || "mill_1")) || MACHINES[0];
    try {
      await api.put<any>(`/cases/${caseId}/cam`, {
        operatorId: user?.id || "user_4",
        operatorName: user?.fullNameAr || "أحمد حسن",
        status: "in_progress",
        startTime: new Date().toISOString(),
        blockType,
        machineId: machine.id,
        machineName: machine.name,
        materialDeducted: false,
        notes: camNotes[caseId] || "",
      });
      toast.success(`تم بدء التفريز على ${machine.name}`);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const completeMilling = async (c: DentalCase) => {
    try {
      const block = inventory.find((i) => i.category === "blocks" && i.currentStock > 0);
      if (block) {
        await api.post<any>(`/inventory/${block.id}/deduct`, {
          quantity: 1, caseId: c.id, caseNumber: c.caseNumber,
          reason: `Auto deduction for CAM - ${c.caseNumber}`,
        });
      }

      const startTime = c.camData?.startTime ? new Date(c.camData.startTime).getTime() : Date.now();
      const duration = Math.round((Date.now() - startTime) / 60000);

      await api.put<any>(`/cases/${c.id}/cam`, {
        ...c.camData,
        status: "completed",
        endTime: new Date().toISOString(),
        millingDuration: duration,
        materialDeducted: true,
      });
      toast.success(`تم إكمال التفريز (${duration} دقيقة) وخصم الخامات`);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const transferToFinishing = async (caseId: string) => {
    try {
      await api.post<any>(`/cases/${caseId}/transfer`, {
        toStatus: "finishing",
        notes: "CAM completed - transferred to finishing",
      });
      toast.success("تم تحويل الحالة للتشطيب");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const totalBlocks = inventory.reduce((s, i) => s + i.currentStock, 0);
  const lowBlockItems = inventory.filter(i => i.currentStock <= i.minimumStock);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="w-7 h-7 text-orange-600" />
          قسم التفريز CAM
        </h1>
        <p className="text-muted-foreground">تشغيل ماكينات التفريز وإدارة البلوكات</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{cases.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-gray-500">{cases.filter(c => !c.camData || c.camData.status === "pending").length}</p>
          <p className="text-sm text-muted-foreground">في الانتظار</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{cases.filter(c => c.camData?.status === "in_progress").length}</p>
          <p className="text-sm text-muted-foreground">قيد التشغيل</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">{cases.filter(c => c.camData?.status === "completed").length}</p>
          <p className="text-sm text-muted-foreground">مكتمل</p>
        </CardContent></Card>
        <Card className={lowBlockItems.length > 0 ? "border-amber-300" : ""}>
          <CardContent className="pt-4 text-center">
            <p className={`text-3xl font-bold ${lowBlockItems.length > 0 ? "text-red-600" : "text-amber-600"}`}>{totalBlocks}</p>
            <p className="text-sm text-muted-foreground">بلوكات متاحة</p>
            {lowBlockItems.length > 0 && (
              <p className="text-[10px] text-red-500 flex items-center justify-center gap-0.5 mt-0.5">
                <AlertTriangle className="w-3 h-3" /> {lowBlockItems.length} تحت الحد الأدنى
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">الحالات ({cases.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : cases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد حالات في قسم التفريز</p>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => {
                const elapsed = c.camData?.startTime ? Math.round((Date.now() - new Date(c.camData.startTime).getTime()) / 60000) : 0;
                return (
                  <div key={c.id} className="p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-primary">{c.caseNumber}</span>
                        <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                        {c.camData?.status && (
                          <Badge variant="outline" className={
                            c.camData.status === "completed" ? "bg-green-100 text-green-800" :
                            c.camData.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-gray-100"
                          }>
                            {c.camData.status === "completed" ? "مكتمل" : c.camData.status === "in_progress" ? "قيد التشغيل" : "في الانتظار"}
                          </Badge>
                        )}
                        {c.camData?.status === "in_progress" && (
                          <Badge variant="outline" className="gap-1 text-[10px] text-orange-600">
                            <Clock className="w-3 h-3" /> {elapsed < 60 ? `${elapsed} دقيقة` : `${Math.floor(elapsed / 60)} ساعة ${elapsed % 60} د`}
                          </Badge>
                        )}
                        {c.camData?.machineName && <Badge variant="outline" className="text-[10px]">{c.camData.machineName}</Badge>}
                      </div>
                      <Link to={`/cases/${c.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {c.patientName} | {c.shadeColor} | الأسنان: {c.teethNumbers}
                    </p>

                    {(!c.camData || c.camData.status === "pending") && (
                      <div className="flex items-end gap-3 flex-wrap">
                        <div className="w-48">
                          <Label className="text-xs">الماكينة</Label>
                          <Select value={selectedMachines[c.id] || "mill_1"} onValueChange={(v) => setSelectedMachines({ ...selectedMachines, [c.id]: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MACHINES.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <Label className="text-xs">ملاحظات</Label>
                          <Input value={camNotes[c.id] || ""} onChange={(e) => setCamNotes({ ...camNotes, [c.id]: e.target.value })}
                            placeholder="ملاحظات التفريز..." className="h-8 text-xs" />
                        </div>
                        <Button size="sm" variant="outline" onClick={() => startMilling(c.id, `${c.workType} Block ${c.shadeColor}`)} className="gap-1 h-8">
                          <Play className="w-3 h-3" /> بدء التفريز
                        </Button>
                      </div>
                    )}
                    {c.camData?.status === "in_progress" && (
                      <Button size="sm" variant="outline" className="text-green-600 border-green-300 gap-1" onClick={() => completeMilling(c)}>
                        <CheckCircle className="w-3 h-3" /> إنهاء وخصم المخزون
                      </Button>
                    )}
                    {c.camData?.status === "completed" && (
                      <div className="flex items-center gap-3">
                        <Button size="sm" onClick={() => transferToFinishing(c.id)} className="gap-1">
                          <Send className="w-3 h-3" /> تحويل للتشطيب
                        </Button>
                        {c.camData.millingDuration && (
                          <span className="text-xs text-muted-foreground">مدة التفريز: {c.camData.millingDuration} دقيقة</span>
                        )}
                      </div>
                    )}
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
