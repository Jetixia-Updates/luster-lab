/**
 * Dashboard - Professional overview with KPIs, charts, workflow pipeline
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { STATUS_LABELS, WORK_TYPE_LABELS, WORKFLOW_ORDER } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  ClipboardList, PenTool, Cpu, Paintbrush, Workflow, ShieldCheck,
  Calculator, Truck, Package, AlertTriangle, TrendingUp,
  Users, Clock, CheckCircle, ArrowLeftCircle, Activity,
} from "lucide-react";
import type { DashboardStats, DentalCase, RevenueReport } from "@shared/api";

const DEPT_ICONS: Record<string, any> = {
  reception: ClipboardList,
  cad_design: PenTool,
  cam_milling: Cpu,
  finishing: Paintbrush,
  removable: Workflow,
  quality_control: ShieldCheck,
  accounting: Calculator,
  ready_for_delivery: Truck,
};

const PIE_COLORS = ["#1e40af", "#7c3aed", "#d97706", "#0d9488", "#dc2626", "#16a34a", "#6366f1"];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCases, setRecentCases] = useState<DentalCase[]>([]);
  const [revenue, setRevenue] = useState<RevenueReport[]>([]);
  const [workTypeStats, setWorkTypeStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>("/dashboard/stats"),
      api.get<any>("/cases"),
      api.get<any>("/dashboard/revenue"),
      api.get<any>("/dashboard/work-type-stats"),
    ]).then(([statsRes, casesRes, revRes, wtRes]) => {
      setStats(statsRes.data);
      setRecentCases(casesRes.data?.slice(0, 8) || []);
      setRevenue(revRes.data || []);
      setWorkTypeStats((wtRes.data || []).filter((w: any) => w.count > 0));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const WORK_AR: Record<string, string> = {
    zirconia: "زركونيا", pfm: "PFM", emax: "إي ماكس",
    implant: "زراعة", ortho: "تقويم", removable: "متحركة", composite: "كمبوزيت",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-muted-foreground">نظرة عامة على معمل لاستر لطب الأسنان</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Activity className="w-3 h-3" />
          آخر تحديث: {new Date().toLocaleTimeString("ar-EG")}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="الحالات النشطة" value={stats?.totalActiveCases || 0} icon={ClipboardList} color="text-blue-600 bg-blue-50" />
        <KPICard title="تم التسليم اليوم" value={stats?.casesDeliveredToday || 0} icon={CheckCircle} color="text-green-600 bg-green-50" />
        <KPICard title="إيرادات الشهر" value={`${(stats?.monthRevenue || 0).toLocaleString()} ج.م`} icon={TrendingUp} color="text-emerald-600 bg-emerald-50" />
        <KPICard title="نسبة المرتجعات" value={`${(stats?.rejectionRate || 0).toFixed(1)}%`} icon={ArrowLeftCircle} color="text-red-600 bg-red-50" warn={(stats?.rejectionRate || 0) > 5} />
      </div>

      {/* Workflow Pipeline */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">خط سير الإنتاج</CardTitle>
          <Link to="/cases" className="text-sm text-primary hover:underline font-medium">جميع الحالات ←</Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {WORKFLOW_ORDER.filter(s => s !== "delivered").map((status) => {
              const label = STATUS_LABELS[status];
              const Icon = DEPT_ICONS[status] || ClipboardList;
              const count = status === "reception" ? stats?.casesInReception :
                status === "cad_design" ? stats?.casesInCAD :
                status === "cam_milling" ? stats?.casesInCAM :
                status === "finishing" ? stats?.casesInFinishing :
                status === "removable" ? stats?.casesInRemovable :
                status === "quality_control" ? stats?.casesInQC :
                status === "accounting" ? (stats?.casesInAccounting ?? 0) :
                status === "ready_for_delivery" ? stats?.casesReadyForDelivery : 0;
              const routes: Record<string, string> = {
                reception: "/reception", cad_design: "/cad", cam_milling: "/cam",
                finishing: "/finishing", removable: "/removable", quality_control: "/qc",
                accounting: "/accounting", ready_for_delivery: "/delivery",
              };
              return (
                <Link key={status} to={routes[status] || "/cases"}>
                  <div className="flex flex-col items-center p-4 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer group">
                    <div className={`w-12 h-12 rounded-full ${label.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold">{count || 0}</span>
                    <span className="text-xs text-muted-foreground text-center">{label.ar}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              الإيرادات الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                    formatter={(value: number) => [`${value.toLocaleString()} ج.م`]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="الإيراد" fill="#1e40af" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="الربح" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Work Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              توزيع أنواع العمل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workTypeStats.map(wt => ({ ...wt, name: WORK_AR[wt.workType] || wt.workType }))}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine
                  >
                    {workTypeStats.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} حالة`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">أحدث الحالات</CardTitle>
            <Link to="/cases" className="text-sm text-primary hover:underline">عرض الكل</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {recentCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm font-semibold text-primary">{c.caseNumber}</span>
                      <Badge className={`text-[10px] ${STATUS_LABELS[c.currentStatus]?.color}`}>
                        {STATUS_LABELS[c.currentStatus]?.ar}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.patientName} - {c.doctorName}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`text-[10px] ${c.priority === "rush" ? "bg-red-500 text-white" : c.priority === "urgent" ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                      {c.priority === "rush" ? "عاجل" : c.priority === "urgent" ? "مستعجل" : "عادي"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {WORK_TYPE_LABELS[c.workType]?.ar}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                التنبيهات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stats?.lowStockItems || 0) > 0 && (
                <Link to="/inventory" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                  <Package className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      {stats?.lowStockItems} مواد تحت الحد الأدنى
                    </p>
                    <p className="text-xs text-amber-600">مراجعة المخزون</p>
                  </div>
                </Link>
              )}
              {(stats?.rushCases || 0) > 0 && (
                <Link to="/cases" className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">
                      {stats?.rushCases} حالات عاجلة في الانتظار
                    </p>
                    <p className="text-xs text-orange-600">مراجعة الحالات</p>
                  </div>
                </Link>
              )}
              {(stats?.overdueCases || 0) > 0 && (
                <Link to="/cases" className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      {stats?.overdueCases} حالات تجاوزت موعد التسليم
                    </p>
                    <p className="text-xs text-red-600">مراجعة الحالات المتأخرة</p>
                  </div>
                </Link>
              )}
              {(stats?.overduePayments || 0) > 0 && (
                <Link to="/accounting" className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                  <Calculator className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      {stats?.overduePayments} فواتير متأخرة السداد
                    </p>
                    <p className="text-xs text-red-600">مراجعة الفواتير</p>
                  </div>
                </Link>
              )}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Users className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800"><strong>{stats?.totalDoctors}</strong> أطباء مسجلين</p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <Clock className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800">متوسط مدة الإنجاز: <strong>{stats?.avgCompletionDays || "N/A"}</strong> يوم</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">إحصائيات سريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-accent/50 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats?.casesInReception || 0}</p>
                  <p className="text-xs text-muted-foreground">في الاستقبال</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/50 text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats?.casesInCAD || 0}</p>
                  <p className="text-xs text-muted-foreground">في التصميم</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/50 text-center">
                  <p className="text-2xl font-bold text-orange-600">{(stats?.casesInCAM || 0) + (stats?.casesInFinishing || 0) + (stats?.casesInRemovable || 0)}</p>
                  <p className="text-xs text-muted-foreground">في التصنيع والتركيبات</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/50 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{stats?.casesReadyForDelivery || 0}</p>
                  <p className="text-xs text-muted-foreground">جاهز للتسليم</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, warn }: {
  title: string; value: string | number; icon: any; color: string; warn?: boolean;
}) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${warn ? "border-red-200" : ""}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-11 h-11 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
