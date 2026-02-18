/**
 * User Management Page - Full CRUD
 * Create, Edit, Toggle Active, Role Distribution
 */

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, UserPlus, Shield, ShieldCheck, ShieldAlert,
  CheckCircle, XCircle, Edit, Power, Search, Eye, EyeOff, ScanFace, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import FaceRegistrationDialog from "@/components/FaceRegistrationDialog";
import type { User, UserRole } from "@shared/api";

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  admin: ShieldAlert, receptionist: Users, designer: Users,
  technician: Users, qc_manager: ShieldCheck, accountant: Users, delivery_staff: Users,
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800", receptionist: "bg-blue-100 text-blue-800",
  designer: "bg-purple-100 text-purple-800", technician: "bg-orange-100 text-orange-800",
  qc_manager: "bg-cyan-100 text-cyan-800", accountant: "bg-green-100 text-green-800",
  delivery_staff: "bg-emerald-100 text-emerald-800",
};

const DEPARTMENT_OPTIONS = [
  { value: "admin", label: "الإدارة" },
  { value: "reception", label: "الاستقبال" },
  { value: "cad", label: "التصميم" },
  { value: "cam", label: "CAM" },
  { value: "finishing", label: "البورسلين" },
  { value: "qc", label: "الجودة" },
  { value: "accounting", label: "الحسابات" },
  { value: "delivery", label: "التسليم" },
];

const emptyForm = {
  username: "", fullNameAr: "", fullName: "", email: "",
  role: "technician" as UserRole, department: "reception",
  phone: "", password: "", fingerprintId: "", baseSalary: "",
  workStartTime: "09:00", workEndTime: "17:00",
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState<Omit<User, "password">[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Dialog
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Omit<User, "password"> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [faceUser, setFaceUser] = useState<Omit<User, "password"> | null>(null);

  useEffect(() => { loadUsers(); }, []);

  // فتح التعديل عند القدوم من صفحة تفاصيل الموظف
  useEffect(() => {
    const editId = (location.state as any)?.editUserId;
    if (!editId || users.length === 0) return;
    const u = users.find((x) => x.id === editId);
    if (u) {
      openEdit(u);
      window.history.replaceState({}, "", "/users");
    }
  }, [users.length, location.state]);

  const loadUsers = async () => {
    setLoading(true);
    const res = await api.get<any>("/users");
    setUsers(res.data || []);
    setLoading(false);
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      return u.fullNameAr.includes(searchQuery) || u.username.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
    }
    return true;
  });

  const openCreate = () => {
    setForm(emptyForm);
    setEditingUser(null);
    setShowPassword(false);
    setShowForm(true);
  };

  const openEdit = (user: Omit<User, "password">) => {
    const u = user as User;
    setForm({
      username: user.username, fullNameAr: user.fullNameAr, fullName: user.fullName,
      email: user.email, role: user.role, department: user.department,
      phone: user.phone || "", password: "",
      fingerprintId: u.fingerprintId || "",
      baseSalary: u.baseSalary != null ? String(u.baseSalary) : "",
      workStartTime: u.workStartTime || "09:00",
      workEndTime: u.workEndTime || "17:00",
    });
    setEditingUser(user);
    setShowPassword(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.username || !form.fullNameAr || !form.role) {
      toast.error("يرجى ملء اسم المستخدم والاسم بالعربي والدور");
      return;
    }
    if (!editingUser && !form.password) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        const payload: any = { ...form };
        if (!payload.password) delete payload.password;
        payload.fingerprintId = form.fingerprintId?.trim() || undefined;
        payload.baseSalary = form.baseSalary ? parseFloat(form.baseSalary) : undefined;
        payload.workStartTime = form.workStartTime || undefined;
        payload.workEndTime = form.workEndTime || undefined;
        await api.put<any>(`/users/${editingUser.id}`, payload);
        toast.success("تم تحديث المستخدم بنجاح");
      } else {
        const createPayload: any = { ...form };
        createPayload.fingerprintId = form.fingerprintId?.trim() || undefined;
        createPayload.baseSalary = form.baseSalary ? parseFloat(form.baseSalary) : undefined;
        createPayload.workStartTime = form.workStartTime || undefined;
        createPayload.workEndTime = form.workEndTime || undefined;
        await api.post<any>("/users", createPayload);
        toast.success("تم إنشاء المستخدم بنجاح");
      }
      setShowForm(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleFaceSaved = async (descriptor: number[]) => {
    if (!faceUser) return;
    try {
      await api.put(`/users/${faceUser.id}`, { faceDescriptor: descriptor });
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || "فشل الحفظ");
    }
  };

  const handleToggleActive = async (user: Omit<User, "password">) => {
    const action = user.active ? "تعطيل" : "تفعيل";
    if (!confirm(`هل أنت متأكد من ${action} حساب "${user.fullNameAr}"؟`)) return;
    try {
      await api.post<any>(`/users/${user.id}/toggle-active`, {});
      toast.success(`تم ${action} الحساب بنجاح`);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    }
  };

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-600" />
            إدارة المستخدمين
          </h1>
          <p className="text-muted-foreground">إدارة حسابات المستخدمين والصلاحيات</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="w-4 h-4" /> إضافة مستخدم
        </Button>
      </div>

      {/* Role Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{users.length}</p>
          <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">{users.filter(u => u.active).length}</p>
          <p className="text-sm text-muted-foreground">مستخدم نشط</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-red-600">{roleCounts["admin"] || 0}</p>
          <p className="text-sm text-muted-foreground">مدراء النظام</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{Object.keys(roleCounts).length}</p>
          <p className="text-sm text-muted-foreground">أدوار مفعّلة</p>
        </CardContent></Card>
      </div>

      {/* Roles Cards */}
      <Card>
        <CardHeader><CardTitle className="text-lg">توزيع الأدوار</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(ROLE_LABELS).map(([role, label]) => {
              const count = roleCounts[role] || 0;
              const color = ROLE_COLORS[role as UserRole];
              return (
                <div key={role} className={`flex items-center justify-between p-3 rounded-lg border ${count > 0 ? "" : "opacity-50"}`}>
                  <Badge className={`${color} text-xs`}>{label.ar}</Badge>
                  <span className="font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو البريد..." className="pr-10" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="الدور" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأدوار</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">قائمة المستخدمين ({filteredUsers.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-right py-3 px-3 font-medium">المستخدم</th>
                    <th className="text-right py-3 px-3 font-medium">الاسم</th>
                    <th className="text-right py-3 px-3 font-medium">الدور</th>
                    <th className="text-right py-3 px-3 font-medium">القسم</th>
                    <th className="text-right py-3 px-3 font-medium">البريد</th>
                    <th className="text-right py-3 px-3 font-medium">الهاتف</th>
                    <th className="text-center py-3 px-3 font-medium">الحالة</th>
                    <th className="text-center py-3 px-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const RoleIcon = ROLE_ICONS[user.role] || Users;
                    return (
                      <tr key={user.id} className="border-b hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                              <RoleIcon className="w-4 h-4" />
                            </div>
                            <span className="font-mono text-xs">{user.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Link to={`/users/${user.id}`} className="font-medium hover:underline text-primary flex items-center gap-1">
                            {user.fullNameAr}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Link>
                          {user.fullName && <p className="text-xs text-muted-foreground">{user.fullName}</p>}
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={`${ROLE_COLORS[user.role]} text-xs`}>
                            {ROLE_LABELS[user.role]?.ar}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {DEPARTMENT_OPTIONS.find(d => d.value === user.department)?.label || user.department}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs" dir="ltr">{user.email}</td>
                        <td className="py-3 px-3 text-muted-foreground text-xs" dir="ltr">{user.phone}</td>
                        <td className="py-3 px-3 text-center">
                          {user.active ? (
                            <Badge className="bg-green-100 text-green-800 text-xs gap-1">
                              <CheckCircle className="w-3 h-3" /> نشط
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 text-xs gap-1">
                              <XCircle className="w-3 h-3" /> معطل
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setFaceUser(user)} title="تسجيل الوجه">
                              <ScanFace className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(user)} title="تعديل">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            {user.id !== currentUser?.id && (
                              <Button size="sm" variant="ghost"
                                className={`h-7 w-7 p-0 ${user.active ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}`}
                                onClick={() => handleToggleActive(user)}
                                title={user.active ? "تعطيل" : "تفعيل"}>
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg" dir="rtl" aria-describedby="user-form-desc">
          <DialogHeader>
            <DialogTitle>{editingUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
            <DialogDescription id="user-form-desc">{editingUser ? "تعديل بيانات المستخدم" : "أدخل بيانات المستخدم الجديد"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اسم المستخدم *</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ahmed_designer" dir="ltr" disabled={!!editingUser} />
              </div>
              <div>
                <Label>كلمة المرور {editingUser ? "(اتركه فارغ لعدم التغيير)" : "*"}</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? "••••••" : "كلمة المرور"} dir="ltr" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاسم بالعربي *</Label>
                <Input value={form.fullNameAr} onChange={(e) => setForm({ ...form, fullNameAr: e.target.value })}
                  placeholder="أحمد محمد" />
              </div>
              <div>
                <Label>الاسم بالإنجليزي</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Ahmed Mohamed" dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الدور *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>القسم</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>رقم البصمة (جهاز الحضور)</Label>
                <Input value={form.fingerprintId} onChange={(e) => setForm({ ...form, fingerprintId: e.target.value })}
                  placeholder="1" dir="ltr" />
              </div>
              <div>
                <Label>الراتب الأساسي (ج.م)</Label>
                <Input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                  placeholder="5000" dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>وقت بداية العمل (للربط مع البصمة)</Label>
                <Input type="time" value={form.workStartTime} onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
                  dir="ltr" />
              </div>
              <div>
                <Label>وقت نهاية العمل</Label>
                <Input type="time" value={form.workEndTime} onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
                  dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ahmed@luster.com" dir="ltr" type="email" />
              </div>
              <div>
                <Label>الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01012345678" dir="ltr" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "جاري الحفظ..." : editingUser ? "تحديث" : "إنشاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FaceRegistrationDialog
        open={!!faceUser}
        onOpenChange={(o) => !o && setFaceUser(null)}
        userName={faceUser?.fullNameAr || ""}
        userId={faceUser?.id || ""}
        onSaved={handleFaceSaved}
      />
    </div>
  );
}
