/**
 * صفحة تفاصيل الموظف - كل المعلومات
 */

import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  User as UserIcon, ArrowRight, Mail, Phone, Calendar, Clock, DollarSign,
  Fingerprint, FileBarChart, CreditCard, LogIn,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import type {
  User,
  AttendanceRecord,
  EmployeeAttendanceReport,
  PayrollEntry,
} from "@shared/api";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const DEPT_LABELS: Record<string, string> = {
  reception: "الاستقبال", cad: "التصميم", cam: "CAM", finishing: "البورسلين",
  qc: "الجودة", accounting: "الحسابات", delivery: "التسليم", admin: "الإدارة",
};

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [report, setReport] = useState<EmployeeAttendanceReport | null>(null);
  const [payrollEntries, setPayrollEntries] = useState<(PayrollEntry & { year?: number; month?: number; periodStatus?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const to = now.toISOString().slice(0, 10);
        const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 10);

        const [u, att, rep, pay] = await Promise.all([
          api.get<{ data: Omit<User, "password"> }>(`/users/${id}`),
          api.get<{ data: AttendanceRecord[] }>(`/attendance?userId=${id}&from=${from}&to=${to}`),
          api.get<{ data: EmployeeAttendanceReport }>(`/attendance/report?userId=${id}&from=${from}&to=${to}`),
          api.get<{ data: (PayrollEntry & { year?: number; month?: number; periodStatus?: string })[] }>(`/payroll/user/${id}/entries`),
        ]);
        setUser(u.data);
        setAttendance(att.data || []);
        setReport(rep.data || null);
        setPayrollEntries(pay.data || []);
      } catch (e: any) {
        toast.error("فشل تحميل البيانات: " + (e?.message || ""));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الموظف غير موجود</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/users">العودة للمستخدمين</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/users" className="gap-1">
            <ArrowRight className="w-4 h-4" /> المستخدمين
          </Link>
        </Button>
      </div>

      {/* بطاقة الموظف */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserIcon className="w-10 h-10" />
            </div>
            <div className="flex-1 space-y-1">
              <h1 className="text-2xl font-bold">{user.fullNameAr}</h1>
              {user.fullName && <p className="text-muted-foreground">{user.fullName}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={user.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {user.active ? "نشط" : "معطل"}
                </Badge>
                <Badge variant="outline">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]?.ar || user.role}</Badge>
                <Badge variant="outline">{DEPT_LABELS[user.department] || user.department}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {user.email || "—"}</span>
                <span className="flex items-center gap-2" dir="ltr"><Phone className="w-4 h-4" /> {user.phone || "—"}</span>
                <span className="flex items-center gap-2"><Fingerprint className="w-4 h-4" /> رقم البصمة: {user.fingerprintId || "—"}</span>
                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> وقت العمل: {user.workStartTime || "09:00"} - {user.workEndTime || "17:00"}</span>
                <span className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> الراتب الأساسي: {user.baseSalary != null ? user.baseSalary.toLocaleString() + " ج.م" : "—"}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> تاريخ التعيين: {user.hireDate ? user.hireDate.slice(0, 10) : "—"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/users">العودة للمستخدمين</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/users" state={{ editUserId: user.id }}>تعديل البيانات</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance" className="gap-1"><LogIn className="w-4 h-4" /> الحضور</TabsTrigger>
          <TabsTrigger value="report" className="gap-1"><FileBarChart className="w-4 h-4" /> تقرير الحضور</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1"><CreditCard className="w-4 h-4" /> الرواتب</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>سجل الحضور (آخر شهر)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-right py-2">التاريخ</th><th className="text-right py-2">الحضور</th><th className="text-right py-2">الانصراف</th><th className="text-right py-2">المصدر</th></tr></thead>
                  <tbody>
                    {attendance.slice(0, 50).map((a) => (
                      <tr key={a.id} className="border-b hover:bg-accent/30">
                        <td className="py-2">{a.date}</td>
                        <td className="py-2">{a.checkIn || "—"}</td>
                        <td className="py-2">{a.checkOut || "—"}</td>
                        <td className="py-2 text-muted-foreground">{a.source === "fingerprint" ? "بصمة" : a.source === "import" ? "استيراد" : "يدوي"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attendance.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد سجلات حضور</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>ملخص الحضور (آخر شهر)</CardTitle></CardHeader>
            <CardContent>
              {report ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-600">{report.totalPresentDays}</p>
                    <p className="text-xs text-muted-foreground">أيام الحضور</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-red-600">{report.totalAbsentDays}</p>
                    <p className="text-xs text-muted-foreground">أيام الغياب</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-amber-600">{report.totalLateMinutes}د</p>
                    <p className="text-xs text-muted-foreground">إجمالي التأخير</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-blue-600">{report.totalOvertimeMinutes}د</p>
                    <p className="text-xs text-muted-foreground">الوقت الإضافي</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>سجل الرواتب</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2">الفترة</th>
                      <th className="text-right py-2">الأساسي</th>
                      <th className="text-right py-2">غياب</th>
                      <th className="text-right py-2">تأخير</th>
                      <th className="text-right py-2">خصومات</th>
                      <th className="text-right py-2 font-bold">الصافي</th>
                      <th className="text-right py-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollEntries.map((e) => (
                      <tr key={e.id} className="border-b hover:bg-accent/30">
                        <td className="py-2">{e.month ? MONTHS[e.month - 1] : "—"} {e.year || ""}</td>
                        <td className="py-2">{e.baseSalary.toLocaleString()}</td>
                        <td className="py-2">{e.absenceDays} يوم</td>
                        <td className="py-2">{e.lateMinutes}د</td>
                        <td className="py-2 text-red-600">-{e.totalDeductions.toLocaleString()}</td>
                        <td className="py-2 font-bold">{e.netSalary.toLocaleString()} ج.م</td>
                        <td className="py-2"><Badge variant="outline">{e.periodStatus === "paid" ? "مُصرف" : e.periodStatus === "approved" ? "معتمد" : "مسودة"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payrollEntries.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد سجلات رواتب</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
