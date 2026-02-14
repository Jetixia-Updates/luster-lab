/**
 * Invoice Print View + Case Barcode
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { WORK_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight } from "lucide-react";
import type { Invoice, DentalCase } from "@shared/api";

export default function InvoicePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [dentalCase, setCase] = useState<DentalCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get<any>(`/invoices/${id}`)
        .then(async (res) => {
          setInvoice(res.data);
          if (res.data.caseId) {
            const caseRes = await api.get<any>(`/cases/${res.data.caseId}`);
            setCase(caseRes.data);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!invoice) return <div className="text-center py-12">الفاتورة غير موجودة</div>;

  return (
    <div className="space-y-4">
      {/* Print Controls */}
      <div className="flex items-center justify-between no-print">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-1">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          طباعة الفاتورة
        </Button>
      </div>

      {/* Printable Invoice */}
      <div className="max-w-[800px] mx-auto bg-white p-8 rounded-lg border shadow-sm print:shadow-none print:border-0" dir="rtl">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-primary pb-6 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                L
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">Luster Dental Lab</h1>
                <p className="text-sm text-muted-foreground">معمل لاستر لطب الأسنان</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
              <p>القاهرة - مصر</p>
              <p dir="ltr">Tel: +20 123 456 7890</p>
              <p dir="ltr">info@luster-dental.com</p>
            </div>
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold mb-2">فاتورة</h2>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">رقم الفاتورة:</span> <strong>{invoice.invoiceNumber}</strong></p>
              <p><span className="text-muted-foreground">التاريخ:</span> {new Date(invoice.issuedDate).toLocaleDateString("ar-EG")}</p>
              <p><span className="text-muted-foreground">تاريخ الاستحقاق:</span> {new Date(invoice.dueDate).toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
        </div>

        {/* Case & Doctor Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="font-bold text-sm mb-2 text-primary">بيانات الطبيب</h3>
            <div className="text-sm space-y-1">
              <p className="font-bold">{invoice.doctorName}</p>
              <p className="text-muted-foreground">المريض: {invoice.patientName}</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-2 text-primary">بيانات الحالة</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">رقم الحالة:</span> <strong className="font-mono">{invoice.caseNumber}</strong></p>
              {dentalCase && (
                <>
                  <p><span className="text-muted-foreground">نوع العمل:</span> {WORK_TYPE_LABELS[dentalCase.workType]?.ar}</p>
                  <p><span className="text-muted-foreground">الأسنان:</span> {dentalCase.teethNumbers}</p>
                  <p><span className="text-muted-foreground">اللون:</span> {dentalCase.shadeColor}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Barcode representation */}
        <div className="flex justify-center mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-[2px] mb-2">
              {invoice.caseNumber.split("").map((char, i) => (
                <div
                  key={i}
                  className="bg-black"
                  style={{
                    width: char.match(/[0-9]/) ? `${(parseInt(char) || 1) + 1}px` : "3px",
                    height: "40px",
                    marginRight: i % 2 === 0 ? "1px" : "2px",
                  }}
                />
              ))}
            </div>
            <p className="font-mono text-sm font-bold">{invoice.caseNumber}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-primary">
              <th className="text-right py-2 font-bold">#</th>
              <th className="text-right py-2 font-bold">الوصف</th>
              <th className="text-center py-2 font-bold">الكمية</th>
              <th className="text-left py-2 font-bold">سعر الوحدة</th>
              <th className="text-left py-2 font-bold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={item.id} className="border-b">
                <td className="py-3">{idx + 1}</td>
                <td className="py-3">
                  <p>{item.descriptionAr}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-left">{item.unitPrice.toLocaleString()} ج.م</td>
                <td className="py-3 text-left font-bold">{item.total.toLocaleString()} ج.م</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">تكلفة المواد:</span>
              <span>{invoice.materialsCost.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">تكلفة العمالة:</span>
              <span>{invoice.laborCost.toLocaleString()} ج.م</span>
            </div>
            {invoice.rushSurcharge > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>رسوم استعجال:</span>
                <span>{invoice.rushSurcharge.toLocaleString()} ج.م</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">الإجمالي الفرعي:</span>
              <span>{invoice.subtotal.toLocaleString()} ج.م</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>الخصم:</span>
                <span>-{invoice.discount.toLocaleString()} ج.م</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الضريبة:</span>
                <span>{invoice.tax.toLocaleString()} ج.م</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-primary text-base font-bold">
              <span>الإجمالي:</span>
              <span className="text-primary">{invoice.totalAmount.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>المدفوع:</span>
              <span>{invoice.paidAmount.toLocaleString()} ج.م</span>
            </div>
            {invoice.remainingAmount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>المتبقي:</span>
                <span>{invoice.remainingAmount.toLocaleString()} ج.م</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="font-bold text-sm mb-2">سجل المدفوعات</h3>
            <div className="text-xs space-y-1">
              {invoice.payments.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>{new Date(p.paidDate).toLocaleDateString("ar-EG")} - {
                    p.method === "cash" ? "نقدي" : p.method === "bank_transfer" ? "تحويل بنكي" : p.method === "check" ? "شيك" : "بطاقة"
                  }</span>
                  <span className="font-bold text-green-600">{p.amount.toLocaleString()} ج.م</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
          <p>Luster Dental Laboratory - معمل لاستر لطب الأسنان</p>
          <p className="mt-1">شكراً لتعاملكم معنا</p>
        </div>
      </div>
    </div>
  );
}
