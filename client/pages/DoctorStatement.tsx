/**
 * Doctor Statement of Account
 * Full financial history per doctor with print support
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight, Printer, Users, FileText, CheckCircle,
  Clock, AlertTriangle, DollarSign, TrendingUp,
} from "lucide-react";
import type { DoctorStatement as DoctorStatementType } from "@shared/api";

export default function DoctorStatement() {
  const { id } = useParams();
  const [statement, setStatement] = useState<DoctorStatementType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get<any>(`/accounting/doctor-statement/${id}`)
        .then((res) => setStatement(res.data))
        .catch(() => toast.error("خطأ في تحميل كشف الحساب"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">كشف الحساب غير موجود</p>
        <Link to="/accounting"><Button variant="outline" className="mt-4">رجوع</Button></Link>
      </div>
    );
  }

  const collectionRate = statement.totalInvoiced > 0
    ? Math.round((statement.totalPaid / statement.totalInvoiced) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between no-print">
        <Link to="/accounting">
          <Button variant="outline" className="gap-2">
            <ArrowRight className="w-4 h-4" /> رجوع للحسابات
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> طباعة كشف الحساب
        </Button>
      </div>

      {/* Header Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                {statement.doctorName.charAt(statement.doctorName.indexOf(".") + 2) || statement.doctorName.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{statement.doctorName}</h2>
                <p className="text-muted-foreground">{statement.clinic}</p>
                <Badge variant="outline" className="mt-1">{statement.totalCases} حالة</Badge>
              </div>
            </div>
            <div className="text-center print:text-left">
              <h1 className="text-lg font-bold mb-1">معمل لاستر لتقنيات الأسنان</h1>
              <p className="text-xs text-muted-foreground">كشف حساب - {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-green-50/50 text-center">
              <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{statement.totalInvoiced.toLocaleString()}</p>
              <p className="text-xs text-green-600">إجمالي الفواتير</p>
            </div>
            <div className="p-4 rounded-xl border bg-blue-50/50 text-center">
              <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-700">{statement.totalPaid.toLocaleString()}</p>
              <p className="text-xs text-blue-600">إجمالي المدفوع</p>
            </div>
            <div className="p-4 rounded-xl border bg-red-50/50 text-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-600">{statement.totalRemaining.toLocaleString()}</p>
              <p className="text-xs text-red-500">إجمالي المتبقي</p>
            </div>
            <div className="p-4 rounded-xl border bg-purple-50/50 text-center">
              <CheckCircle className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-700">{collectionRate}%</p>
              <p className="text-xs text-purple-600">نسبة التحصيل</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Rate Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium w-24">نسبة التحصيل</span>
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className={`h-full rounded-full transition-all duration-700 ${collectionRate >= 80 ? "bg-green-500" : collectionRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <span className="text-sm font-bold w-12 text-left">{collectionRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            تفاصيل الفواتير ({statement.invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-right py-3 px-2 font-medium">#</th>
                  <th className="text-right py-3 px-2 font-medium">رقم الفاتورة</th>
                  <th className="text-right py-3 px-2 font-medium">رقم الحالة</th>
                  <th className="text-right py-3 px-2 font-medium">المريض</th>
                  <th className="text-right py-3 px-2 font-medium">التاريخ</th>
                  <th className="text-right py-3 px-2 font-medium">الاستحقاق</th>
                  <th className="text-right py-3 px-2 font-medium">الإجمالي</th>
                  <th className="text-right py-3 px-2 font-medium">المدفوع</th>
                  <th className="text-right py-3 px-2 font-medium">المتبقي</th>
                  <th className="text-right py-3 px-2 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {statement.invoices.map((inv, idx) => (
                  <tr key={inv.id} className="border-b hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-2 text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 px-2 font-mono text-primary">
                      <Link to={`/invoices/${inv.id}/print`} className="hover:underline">{inv.invoiceNumber}</Link>
                    </td>
                    <td className="py-3 px-2 font-mono">
                      <Link to={`/cases/${inv.caseId}`} className="text-primary hover:underline">{inv.caseNumber}</Link>
                    </td>
                    <td className="py-3 px-2">{inv.patientName}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{new Date(inv.issuedDate).toLocaleDateString("ar-EG")}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{new Date(inv.dueDate).toLocaleDateString("ar-EG")}</td>
                    <td className="py-3 px-2 font-bold">{inv.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-2 text-green-600">{inv.paidAmount.toLocaleString()}</td>
                    <td className="py-3 px-2 text-red-600 font-bold">{inv.remainingAmount.toLocaleString()}</td>
                    <td className="py-3 px-2">
                      <Badge className={`text-[10px] ${inv.paymentStatus === "paid" ? "bg-green-100 text-green-800" : inv.paymentStatus === "partial" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                        {inv.paymentStatus === "paid" ? "مسدد" : inv.paymentStatus === "partial" ? "جزئي" : "غير مسدد"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold">
                  <td colSpan={6} className="py-3 px-2 text-left">الإجمالي</td>
                  <td className="py-3 px-2">{statement.totalInvoiced.toLocaleString()}</td>
                  <td className="py-3 px-2 text-green-600">{statement.totalPaid.toLocaleString()}</td>
                  <td className="py-3 px-2 text-red-600">{statement.totalRemaining.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History per Invoice */}
      {statement.invoices.filter(inv => inv.payments.length > 0).map((inv) => (
        <Card key={inv.id}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              دفعات الفاتورة {inv.invoiceNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inv.payments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-700">{pay.amount.toLocaleString()} ج.م</span>
                    <Badge variant="outline" className="text-[10px]">
                      {pay.method === "cash" ? "نقدي" : pay.method === "bank_transfer" ? "تحويل" : pay.method === "check" ? "شيك" : "بطاقة"}
                    </Badge>
                    {pay.reference && <span className="text-xs font-mono text-muted-foreground">{pay.reference}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(pay.paidDate).toLocaleDateString("ar-EG")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Print Footer */}
      <div className="text-center text-xs text-muted-foreground border-t pt-4 print:block hidden">
        <p>تم الطباعة: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        <p>معمل لاستر لتقنيات الأسنان - Luster Dental Lab</p>
      </div>
    </div>
  );
}
