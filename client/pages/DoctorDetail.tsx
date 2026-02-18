/**
 * Doctor Detail - إدارة شاملة لكل بيانات الطبيب
 * معلومات، حالات، حسابات، مرضى، تنبيهات
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowRight, Stethoscope, FileText, Users, Bell, Phone, Mail, MapPin,
  Printer, Edit, Calendar, DollarSign, AlertTriangle, Clock, Package,
  ExternalLink,
} from "lucide-react";
import type { Doctor, DentalCase, Invoice, Patient } from "@shared/api";

interface OverviewData {
  doctor: Doctor;
  cases: DentalCase[];
  patients: Patient[];
  invoices: Invoice[];
  totalInvoiced: number;
  totalPaid: number;
  totalRemaining: number;
  collectionRate: number;
  alerts: { type: string; title: string; count?: number; amount?: number; items?: any[] }[];
  overdueInvoicesCount: number;
  overdueCasesCount: number;
}

export default function DoctorDetail() {
  const { id } = useParams();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<any>(`/doctors/${id}/overview`)
      .then((res) => setData(res.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data?.doctor) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">الطبيب غير موجود</p>
        <Link to="/doctors"><Button variant="outline" className="mt-4 gap-2"><ArrowRight className="w-4 h-4" /> رجوع للأطباء</Button></Link>
      </div>
    );
  }

  const { doctor, cases, patients, invoices, totalInvoiced, totalPaid, totalRemaining, collectionRate, alerts } = data;
  const statusColors: Record<string, string> = {
    received: "bg-slate-500", reception: "bg-slate-500", cad: "bg-blue-500",
    cam: "bg-purple-500", finishing: "bg-amber-500", removable: "bg-teal-500",
    qc: "bg-cyan-500", ready_for_delivery: "bg-indigo-500", delivered: "bg-green-500", cancelled: "bg-red-500",
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/doctors">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowRight className="w-4 h-4" /> رجوع للأطباء
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link to={`/accounting/doctor/${id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="w-4 h-4" /> كشف حساب
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 no-print">
            <Printer className="w-4 h-4" /> طباعة
          </Button>
        </div>
      </div>

      {/* Doctor Profile Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-20 h-20 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold shrink-0">
              {doctor.nameAr?.charAt(0) || "د"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{doctor.nameAr}</h1>
              <p className="text-muted-foreground">{doctor.name}</p>
              <p className="font-medium text-blue-600 mt-1">{doctor.clinicAr || doctor.clinic}</p>
              {doctor.specialization && (
                <Badge variant="secondary" className="mt-2">{doctor.specialization}</Badge>
              )}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                {doctor.phone && (
                  <a href={`tel:${doctor.phone}`} className="flex items-center gap-1 hover:text-primary" dir="ltr">
                    <Phone className="w-4 h-4" /> {doctor.phone}
                  </a>
                )}
                {doctor.email && (
                  <a href={`mailto:${doctor.email}`} className="flex items-center gap-1 hover:text-primary" dir="ltr">
                    <Mail className="w-4 h-4" /> {doctor.email}
                  </a>
                )}
                {doctor.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {doctor.address}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                تعامل منذ {new Date(doctor.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{doctor.totalCases}</p>
                <p className="text-xs text-muted-foreground">حالة</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">مدفوع (ج.م)</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className={`text-2xl font-bold ${totalRemaining > 0 ? "text-red-600" : "text-green-600"}`}>
                  {totalRemaining.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">متبقي (ج.م)</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{collectionRate}%</p>
                <p className="text-xs text-muted-foreground">نسبة التحصيل</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Bell className="w-5 h-5" /> التنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {alerts.map((a) => (
                <Badge key={a.type} variant="outline" className="bg-amber-100 border-amber-300 text-amber-800 px-3 py-1.5">
                  {a.title}
                  {a.count != null && <span className="mr-1">({a.count})</span>}
                  {a.amount != null && <span className="font-bold mr-1">{a.amount.toLocaleString()} ج.م</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="cases" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="cases" className="gap-1">
            <Package className="w-4 h-4" /> الحالات ({cases.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1">
            <FileText className="w-4 h-4" /> الفواتير ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-1">
            <Users className="w-4 h-4" /> المرضى ({patients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>سجل الحالات</CardTitle>
              <p className="text-sm text-muted-foreground">كل الحالات المرتبطة بالطبيب من الأقدم للأحدث</p>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا توجد حالات</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الحالة</TableHead>
                        <TableHead>المريض</TableHead>
                        <TableHead>نوع العمل</TableHead>
                        <TableHead>استلام</TableHead>
                        <TableHead>متوقع التسليم</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.caseNumber}</TableCell>
                          <TableCell>{c.patientName}</TableCell>
                          <TableCell>{c.workType}</TableCell>
                          <TableCell>{new Date(c.receivedDate).toLocaleDateString("ar-EG")}</TableCell>
                          <TableCell>
                            <span className={c.expectedDeliveryDate < new Date().toISOString().slice(0, 10) && !["delivered", "cancelled"].includes(c.currentStatus) ? "text-red-600 font-medium" : ""}>
                              {new Date(c.expectedDeliveryDate).toLocaleDateString("ar-EG")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[c.currentStatus] || "bg-gray-500"} variant="secondary">
                              {c.currentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link to={`/cases/${c.id}`}>
                              <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>الفواتير</CardTitle>
                  <p className="text-sm text-muted-foreground">إجمالي الفواتير: {totalInvoiced.toLocaleString()} ج.م | مسدد: {totalPaid.toLocaleString()} ج.م | متبقي: {totalRemaining.toLocaleString()} ج.م</p>
                </div>
                <Link to={`/accounting/doctor/${id}`}>
                  <Button size="sm" variant="outline" className="gap-1">
                    <FileText className="w-4 h-4" /> كشف حساب كامل
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا توجد فواتير</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>المريض</TableHead>
                        <TableHead>الإصدار</TableHead>
                        <TableHead>الاستحقاق</TableHead>
                        <TableHead>الإجمالي</TableHead>
                        <TableHead>المدفوع</TableHead>
                        <TableHead>المتبقي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                          <TableCell>
                            <Badge variant={inv.remainingAmount === 0 ? "default" : inv.paidAmount > 0 ? "secondary" : "destructive"}>
                              {inv.remainingAmount === 0 ? "مسدد" : inv.paidAmount > 0 ? "جزئي" : "غير مسدد"}
                            </Badge>
                          </TableCell>
                          <TableCell>{inv.patientName}</TableCell>
                          <TableCell>{new Date(inv.issuedDate).toLocaleDateString("ar-EG")}</TableCell>
                          <TableCell>
                            <span className={inv.dueDate < new Date().toISOString().slice(0, 10) && inv.remainingAmount > 0 ? "text-red-600 font-medium" : ""}>
                              {new Date(inv.dueDate).toLocaleDateString("ar-EG")}
                            </span>
                          </TableCell>
                          <TableCell>{inv.totalAmount.toLocaleString()}</TableCell>
                          <TableCell>{inv.paidAmount.toLocaleString()}</TableCell>
                          <TableCell className={inv.remainingAmount > 0 ? "font-medium text-red-600" : ""}>
                            {inv.remainingAmount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المرضى</CardTitle>
              <p className="text-sm text-muted-foreground">مرضى الطبيب المسجلين</p>
            </CardHeader>
            <CardContent>
              {patients.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا يوجد مرضى مسجلين</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>العمر</TableHead>
                        <TableHead>الجنس</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <span className="font-medium">{p.nameAr}</span>
                            {p.name && <span className="text-muted-foreground text-xs mr-2">({p.name})</span>}
                          </TableCell>
                          <TableCell dir="ltr">{p.phone || "—"}</TableCell>
                          <TableCell>{p.age ?? "—"}</TableCell>
                          <TableCell>{p.gender === "male" ? "ذكر" : p.gender === "female" ? "أنثى" : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
