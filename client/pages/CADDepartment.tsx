/**
 * CAD Design Department - Enhanced with software selection, notes, and timer
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
import { PenTool, Send, Play, CheckCircle, Eye, Clock, Monitor, MessageSquare } from "lucide-react";
import type { DentalCase } from "@shared/api";

const CAD_SOFTWARE = ["Exocad", "3Shape", "DentalWings", "ZBrush", "Meshmixer", "أخرى"];

export default function CADDepartment() {
  const { user } = useAuth();
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadNotes, setCadNotes] = useState<Record<string, string>>({});
  const [cadSoftware, setCadSoftware] = useState<Record<string, string>>({});

  useEffect(() => { loadCases(); }, []);

  const loadCases = () => {
    api.get<any>("/cases?status=cad_design")
      .then((r) => setCases(r.data || []))
      .finally(() => setLoading(false));
  };

  const updateCAD = async (caseId: string, status: string) => {
    try {
      const software = cadSoftware[caseId] || "Exocad";
      const notes = cadNotes[caseId] || "";
      await api.put<any>(`/cases/${caseId}/cad`, {
        designerId: user?.id || "user_3",
        designerName: user?.fullNameAr || "محمد علي",
        status,
        software,
        notes,
        ...(status === "in_progress" ? { startTime: new Date().toISOString() } : {}),
        ...(status === "completed" ? { endTime: new Date().toISOString() } : {}),
      });
      toast.success(status === "in_progress" ? "تم بدء التصميم" : "تم إكمال التصميم");
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const transferToCAM = async (caseId: string) => {
    try {
      await api.post<any>(`/cases/${caseId}/transfer`, {
        toStatus: "cam_milling",
        notes: "CAD design completed - transferred to CAM",
      });
      toast.success("تم تحويل الحالة لقسم التفريز");
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getElapsed = (startTime?: string) => {
    if (!startTime) return null;
    const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    if (mins < 60) return `${mins} دقيقة`;
    return `${Math.floor(mins / 60)} ساعة ${mins % 60} دقيقة`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PenTool className="w-7 h-7 text-purple-600" />
          قسم التصميم CAD
        </h1>
        <p className="text-muted-foreground">إدارة ملفات التصميم وتحويلها للتفريز</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{cases.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي الحالات</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-gray-500">{cases.filter(c => !c.cadData || c.cadData.status === "pending").length}</p>
          <p className="text-sm text-muted-foreground">في الانتظار</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{cases.filter(c => c.cadData?.status === "in_progress").length}</p>
          <p className="text-sm text-muted-foreground">قيد العمل</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">{cases.filter(c => c.cadData?.status === "completed").length}</p>
          <p className="text-sm text-muted-foreground">مكتمل</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">الحالات ({cases.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : cases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد حالات في قسم التصميم</p>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => (
                <div key={c.id} className="p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-primary">{c.caseNumber}</span>
                      <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                      <Badge className={c.priority === "rush" ? "bg-red-500 text-white" : c.priority === "urgent" ? "bg-amber-500 text-white" : "bg-gray-200"}>
                        {c.priority === "rush" ? "عاجل" : c.priority === "urgent" ? "مستعجل" : "عادي"}
                      </Badge>
                      {c.cadData?.status && (
                        <Badge variant="outline" className={
                          c.cadData.status === "completed" ? "bg-green-100 text-green-800" :
                          c.cadData.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-gray-100"
                        }>
                          {c.cadData.status === "completed" ? "مكتمل" : c.cadData.status === "in_progress" ? "قيد العمل" : "معلق"}
                        </Badge>
                      )}
                      {c.cadData?.status === "in_progress" && c.cadData.startTime && (
                        <Badge variant="outline" className="gap-1 text-[10px] text-blue-600">
                          <Clock className="w-3 h-3" /> {getElapsed(c.cadData.startTime)}
                        </Badge>
                      )}
                    </div>
                    <Link to={`/cases/${c.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    المريض: {c.patientName} | الطبيب: {c.doctorName} | اللون: {c.shadeColor} | الأسنان: {c.teethNumbers}
                  </p>
                  {c.doctorNotes && <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded">ملاحظات الطبيب: {c.doctorNotes}</p>}

                  {/* Actions */}
                  {(!c.cadData || c.cadData.status === "pending") && (
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="w-36">
                        <Label className="text-xs">برنامج التصميم</Label>
                        <Select value={cadSoftware[c.id] || "Exocad"} onValueChange={(v) => setCadSoftware({ ...cadSoftware, [c.id]: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CAD_SOFTWARE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <Label className="text-xs">ملاحظات المصمم</Label>
                        <Input value={cadNotes[c.id] || ""} onChange={(e) => setCadNotes({ ...cadNotes, [c.id]: e.target.value })}
                          placeholder="ملاحظات..." className="h-8 text-xs" />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => updateCAD(c.id, "in_progress")} className="gap-1 h-8">
                        <Play className="w-3 h-3" /> بدء التصميم
                      </Button>
                    </div>
                  )}
                  {c.cadData?.status === "in_progress" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600 border-green-300 gap-1" onClick={() => updateCAD(c.id, "completed")}>
                        <CheckCircle className="w-3 h-3" /> إنهاء التصميم
                      </Button>
                    </div>
                  )}
                  {c.cadData?.status === "completed" && (
                    <Button size="sm" onClick={() => transferToCAM(c.id)} className="gap-1">
                      <Send className="w-3 h-3" /> تحويل للتفريز
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
