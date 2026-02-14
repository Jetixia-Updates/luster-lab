/**
 * Patient Management Page
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Plus, Edit, Search, Phone, User } from "lucide-react";
import type { Patient, Doctor } from "@shared/api";

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("all");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", nameAr: "", phone: "", doctorId: "", doctorName: "",
    age: "", gender: "male" as string, notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [pRes, dRes] = await Promise.all([
      api.get<any>("/patients"),
      api.get<any>("/doctors"),
    ]);
    setPatients(pRes.data || []);
    setDoctors(dRes.data || []);
    setLoading(false);
  };

  const filtered = patients.filter((p) => {
    if (filterDoctor !== "all" && p.doctorId !== filterDoctor) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.nameAr.includes(search) || p.name.toLowerCase().includes(s) ||
        (p.phone && p.phone.includes(search));
    }
    return true;
  });

  const openCreate = () => {
    setForm({ name: "", nameAr: "", phone: "", doctorId: "", doctorName: "", age: "", gender: "male", notes: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p: Patient) => {
    setForm({
      name: p.name, nameAr: p.nameAr, phone: p.phone || "",
      doctorId: p.doctorId || "", doctorName: p.doctorName || "",
      age: p.age?.toString() || "", gender: p.gender || "male", notes: p.notes || "",
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nameAr) {
      toast.error("يرجى إدخال اسم المريض بالعربي");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        doctorName: doctors.find((d) => d.id === form.doctorId)?.nameAr || form.doctorName,
      };
      if (editingId) {
        await api.put<any>(`/patients/${editingId}`, payload);
        toast.success("تم تحديث بيانات المريض");
      } else {
        await api.post<any>("/patients", payload);
        toast.success("تم إضافة المريض بنجاح");
      }
      setShowForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-teal-600" />
            إدارة المرضى
          </h1>
          <p className="text-muted-foreground">بيانات المرضى المسجلين في النظام</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة مريض
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-teal-600">{patients.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{new Set(patients.map(p => p.doctorId).filter(Boolean)).size}</p>
          <p className="text-sm text-muted-foreground">أطباء محولين</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{doctors.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي الأطباء</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="pr-10" />
        </div>
        <Select value={filterDoctor} onValueChange={setFilterDoctor}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="الطبيب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأطباء</SelectItem>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Patient Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="md:col-span-3 flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="md:col-span-3 text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد نتائج</p>
          </div>
        ) : (
          filtered.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
                      {p.nameAr.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold">{p.nameAr}</h3>
                      {p.name && <p className="text-xs text-muted-foreground">{p.name}</p>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {p.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span dir="ltr">{p.phone}</span>
                    </div>
                  )}
                  {p.age && <p>العمر: {p.age} سنة | {p.gender === "male" ? "ذكر" : "أنثى"}</p>}
                  {p.doctorName && (
                    <Badge variant="outline" className="text-xs">طبيب: {p.doctorName}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل بيانات المريض" : "إضافة مريض جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاسم بالعربي *</Label>
                <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="أحمد محمد" />
              </div>
              <div>
                <Label>الاسم بالإنجليزي</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed M." dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01012345678" dir="ltr" />
              </div>
              <div>
                <Label>العمر</Label>
                <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} min={0} max={120} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الجنس</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الطبيب المحول</Label>
                <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الطبيب" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
