/**
 * Doctor Management - Full CRUD with debt tracking & alerts
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Search, Phone, Mail, MapPin, Stethoscope, Trash2, Bell } from "lucide-react";
import type { Doctor } from "@shared/api";

interface DoctorWithAlerts extends Doctor {
  overdueInvoicesCount?: number;
  overdueCasesCount?: number;
  hasAlerts?: boolean;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<DoctorWithAlerts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", nameAr: "", clinic: "", clinicAr: "",
    phone: "", email: "", address: "", specialization: "",
  });

  useEffect(() => { loadDoctors(); }, []);

  const loadDoctors = async () => {
    setLoading(true);
    const res = await api.get<any>("/doctors?alerts=1");
    setDoctors(res.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: "", nameAr: "", clinic: "", clinicAr: "", phone: "", email: "", address: "", specialization: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (e: React.MouseEvent, doc: DoctorWithAlerts) => {
    e.preventDefault();
    e.stopPropagation();
    setForm({
      name: doc.name, nameAr: doc.nameAr, clinic: doc.clinic, clinicAr: doc.clinicAr,
      phone: doc.phone, email: doc.email || "", address: doc.address || "", specialization: doc.specialization || "",
    });
    setEditingId(doc.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameAr || !form.phone) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    try {
      if (editingId) {
        await api.put<any>(`/doctors/${editingId}`, form);
        toast.success("تم تحديث بيانات الطبيب");
      } else {
        await api.post<any>("/doctors", form);
        toast.success("تم إضافة الطبيب بنجاح");
      }
      resetForm();
      loadDoctors();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (e: React.MouseEvent, doc: DoctorWithAlerts) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`هل أنت متأكد من حذف "${doc.nameAr}"؟ سيتم حذف جميع البيانات المرتبطة.`)) return;
    try {
      await api.delete<any>(`/doctors/${doc.id}`);
      toast.success("تم حذف الطبيب بنجاح");
      loadDoctors();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const withAlerts = doctors.filter((d) => (d as DoctorWithAlerts).hasAlerts);
  const filtered = search
    ? doctors.filter((d) =>
        d.nameAr.includes(search) || d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.clinicAr.includes(search) || d.phone.includes(search)
      )
    : doctors;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-7 h-7 text-blue-600" />
            إدارة الأطباء
          </h1>
          <p className="text-muted-foreground">إضافة وتعديل بيانات الأطباء المتعاملين</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة طبيب
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{doctors.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي الأطباء</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">{doctors.reduce((s, d) => s + d.totalCases, 0)}</p>
          <p className="text-sm text-muted-foreground">إجمالي الحالات</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-red-600">{doctors.filter(d => d.totalDebt > 0).length}</p>
          <p className="text-sm text-muted-foreground">أطباء عليهم ديون</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{doctors.reduce((s, d) => s + d.totalDebt, 0).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">إجمالي الديون (ج.م)</p>
        </CardContent></Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle>{editingId ? "تعديل بيانات الطبيب" : "إضافة طبيب جديد"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>الاسم بالعربي *</Label>
                <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="د. ..." />
              </div>
              <div>
                <Label>الاسم بالإنجليزي</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. ..." />
              </div>
              <div>
                <Label>العيادة بالعربي</Label>
                <Input value={form.clinicAr} onChange={(e) => setForm({ ...form, clinicAr: e.target.value })} placeholder="مركز..." />
              </div>
              <div>
                <Label>العيادة بالإنجليزي</Label>
                <Input value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })} placeholder="Clinic..." />
              </div>
              <div>
                <Label>رقم الهاتف *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+20..." dir="ltr" />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="email@clinic.com" dir="ltr" />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="المنطقة / المدينة" />
              </div>
              <div>
                <Label>التخصص</Label>
                <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="تركيبات / زراعة / تقويم..." />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit">{editingId ? "حفظ التعديلات" : "إضافة الطبيب"}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Alerts Banner */}
      {withAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-base">
              <Bell className="w-4 h-4" /> تنبيهات ({withAlerts.length} طبيب)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {withAlerts.map((d) => (
                <Link key={d.id} to={`/doctors/${d.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-amber-100 border-amber-300 px-3 py-1.5 gap-1">
                    {d.nameAr}
                    {(d as DoctorWithAlerts).overdueInvoicesCount ? (
                      <span className="text-red-600">فواتير ({(d as DoctorWithAlerts).overdueInvoicesCount})</span>
                    ) : null}
                    {(d as DoctorWithAlerts).overdueCasesCount ? (
                      <span className="text-orange-600">حالات ({(d as DoctorWithAlerts).overdueCasesCount})</span>
                    ) : null}
                    {d.totalDebt > 0 ? (
                      <span className="text-amber-700">{d.totalDebt.toLocaleString()} ج.م</span>
                    ) : null}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو العيادة أو الهاتف..." className="pr-10" />
      </div>

      {/* Doctors List */}
      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="md:col-span-2 flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="md:col-span-2 text-center py-12 text-muted-foreground">لا توجد نتائج</div>
        ) : (
          filtered.map((doc) => (
            <Link key={doc.id} to={`/doctors/${doc.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50 group">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg group-hover:text-primary">{doc.nameAr}</h3>
                      {doc.hasAlerts && <Badge variant="destructive" className="text-xs">تنبيه</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{doc.name}</p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
                    <Button size="sm" variant="ghost" onClick={(e) => handleEdit(e, doc)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={(e) => handleDelete(e, doc)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{doc.clinicAr}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    <span dir="ltr">{doc.phone}</span>
                  </div>
                  {doc.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span dir="ltr">{doc.email}</span>
                    </div>
                  )}
                  {doc.specialization && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{doc.specialization}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="font-bold text-blue-600">{doc.totalCases}</p>
                      <p className="text-xs text-muted-foreground">حالة</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-bold ${doc.totalDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                        {doc.totalDebt.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">ديون (ج.م)</p>
                    </div>
                    {doc.overdueInvoicesCount ? (
                      <div className="text-center">
                        <p className="font-bold text-red-600">{doc.overdueInvoicesCount}</p>
                        <p className="text-xs text-muted-foreground">فواتير متأخرة</p>
                      </div>
                    ) : null}
                    {doc.overdueCasesCount ? (
                      <div className="text-center">
                        <p className="font-bold text-orange-600">{doc.overdueCasesCount}</p>
                        <p className="text-xs text-muted-foreground">حالات متأخرة</p>
                      </div>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    منذ {new Date(doc.createdAt).toLocaleDateString("ar-EG")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
