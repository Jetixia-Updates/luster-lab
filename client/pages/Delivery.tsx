/**
 * Delivery Department - Per-case receiver + delivery notes
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
import { toast } from "sonner";
import { Truck, CheckCircle, Eye, Package, Clock, Search, Printer, Calendar } from "lucide-react";
import { ScanCaseButton } from "@/components/barcode";
import type { DentalCase, Delivery } from "@shared/api";

export default function DeliveryPage() {
  const { user } = useAuth();
  const [readyCases, setReadyCases] = useState<DentalCase[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDeliveries, setSearchDeliveries] = useState("");

  // Per-case receiver and notes
  const [receiverNames, setReceiverNames] = useState<Record<string, string>>({});
  const [deliveryNotes, setDeliveryNotes] = useState<Record<string, string>>({});
  const [delivering, setDelivering] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [casesRes, delRes] = await Promise.all([
      api.get<any>("/cases?status=ready_for_delivery"),
      api.get<any>("/deliveries"),
    ]);
    setReadyCases(casesRes.data || []);
    setDeliveries(delRes.data || []);
    setLoading(false);
  };

  const handleDeliver = async (c: DentalCase) => {
    const receiver = receiverNames[c.id];
    if (!receiver) {
      toast.error("يرجى إدخال اسم المستلم");
      return;
    }
    setDelivering(c.id);
    try {
      await api.post<any>("/deliveries", {
        caseId: c.id,
        receivedBy: receiver,
        notes: deliveryNotes[c.id] || "",
      });
      toast.success(`تم تسجيل تسليم الحالة ${c.caseNumber} بنجاح`);
      setReceiverNames((p) => { const n = { ...p }; delete n[c.id]; return n; });
      setDeliveryNotes((p) => { const n = { ...p }; delete n[c.id]; return n; });
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDelivering(null);
    }
  };

  const filteredDeliveries = searchDeliveries
    ? deliveries.filter((d) =>
        d.caseNumber.includes(searchDeliveries) ||
        d.doctorName.includes(searchDeliveries) ||
        d.receivedBy.includes(searchDeliveries)
      )
    : deliveries;

  const todayCount = deliveries.filter(
    (d) => new Date(d.deliveryDate).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-7 h-7 text-emerald-600" />
            قسم التسليم
          </h1>
          <p className="text-muted-foreground">تسليم الحالات وتوثيق الاستلام</p>
        </div>
        <ScanCaseButton variant="outline" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{readyCases.length}</p>
          <p className="text-sm text-muted-foreground">جاهز للتسليم</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{deliveries.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي التسليمات</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">{todayCount}</p>
          <p className="text-sm text-muted-foreground">تسليم اليوم</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-amber-600">
            {deliveries.filter((d) => d.paymentStatus === "paid").length}
          </p>
          <p className="text-sm text-muted-foreground">مسدد بالكامل</p>
        </CardContent></Card>
      </div>

      {/* Ready Cases */}
      <Card>
        <CardHeader><CardTitle className="text-lg">حالات جاهزة للتسليم ({readyCases.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : readyCases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد حالات جاهزة للتسليم</p>
            </div>
          ) : (
            <div className="space-y-4">
              {readyCases.map((c) => (
                <div key={c.id} className="p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-primary">{c.caseNumber}</span>
                      <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                      {c.totalCost > 0 && <Badge className="bg-green-100 text-green-800">{c.totalCost.toLocaleString()} ج.م</Badge>}
                      {c.priority === "rush" && <Badge className="bg-red-500 text-white">عاجل</Badge>}
                    </div>
                    <Link to={`/cases/${c.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></Link>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    المريض: {c.patientName} | الطبيب: {c.doctorName} | اللون: {c.shadeColor}
                  </p>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                      <Label className="text-xs mb-1 block">اسم المستلم *</Label>
                      <Input
                        value={receiverNames[c.id] || ""}
                        onChange={(e) => setReceiverNames({ ...receiverNames, [c.id]: e.target.value })}
                        placeholder="اسم المستلم..."
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <Label className="text-xs mb-1 block">ملاحظات</Label>
                      <Input
                        value={deliveryNotes[c.id] || ""}
                        onChange={(e) => setDeliveryNotes({ ...deliveryNotes, [c.id]: e.target.value })}
                        placeholder="ملاحظات التسليم..."
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button size="sm" onClick={() => handleDeliver(c)} disabled={delivering === c.id}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 h-8">
                      {delivering === c.id ? (
                        <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      تسجيل التسليم
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">سجل التسليمات ({deliveries.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchDeliveries} onChange={(e) => setSearchDeliveries(e.target.value)}
                placeholder="بحث في التسليمات..." className="pr-10 h-8 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDeliveries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد تسليمات</p>
          ) : (
            <div className="space-y-3">
              {filteredDeliveries.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/cases/${d.caseId}`} className="font-mono font-semibold text-sm text-primary hover:underline">
                          {d.caseNumber}
                        </Link>
                        <span className="text-muted-foreground text-xs">|</span>
                        <span className="text-sm">{d.doctorName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        المستلم: <span className="font-medium text-foreground">{d.receivedBy}</span>
                        {d.notes && <> | {d.notes}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/delivery/${d.id}/receipt`}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Printer className="w-3.5 h-3.5" /></Button>
                    </Link>
                    <div className="text-left">
                      <Badge className={d.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                        {d.paymentStatus === "paid" ? "مسدد" : "غير مسدد"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(d.deliveryDate).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
