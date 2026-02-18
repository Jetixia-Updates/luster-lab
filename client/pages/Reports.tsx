/**
 * Reports & Analytics - Enhanced with charts, real data, and CSV export
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  BarChart3, TrendingUp, Users, Activity,
  PieChart as PieIcon, Clock, Download, RefreshCcw,
} from "lucide-react";
import type { DepartmentPerformance, RevenueReport } from "@shared/api";

const DEPT_NAMES: Record<string, string> = {
  reception: "الاستقبال", cad: "التصميم", cam: "التفريز",
  finishing: "البورسلين", quality_control: "الجودة", accounting: "الحسابات", delivery: "التسليم",
};

const WORK_AR: Record<string, string> = {
  zirconia: "زركونيا", pfm: "PFM", emax: "إي ماكس",
  implant: "زراعة", ortho: "تقويم", removable: "متحركة", composite: "كمبوزيت",
};

const PIE_COLORS = ["#1e40af", "#7c3aed", "#d97706", "#0d9488", "#dc2626", "#16a34a", "#6366f1"];

export default function Reports() {
  const [deptPerformance, setDeptPerformance] = useState<DepartmentPerformance[]>([]);
  const [revenue, setRevenue] = useState<RevenueReport[]>([]);
  const [topDoctors, setTopDoctors] = useState<any[]>([]);
  const [workTypeStats, setWorkTypeStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<any>("/dashboard/department-performance"),
      api.get<any>("/dashboard/revenue"),
      api.get<any>("/dashboard/top-doctors"),
      api.get<any>("/dashboard/work-type-stats"),
    ]).then(([deptRes, revRes, docRes, wtRes]) => {
      setDeptPerformance(deptRes.data || []);
      setRevenue(revRes.data || []);
      setTopDoctors(docRes.data || []);
      setWorkTypeStats((wtRes.data || []).filter((w: any) => w.count > 0));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const exportCSV = (data: any[], filename: string, headers: string[]) => {
    const rows = data.map((row) => headers.map((h) => row[h] ?? "").join(","));
    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const radarData = deptPerformance.map((d) => ({
    dept: DEPT_NAMES[d.department] || d.department,
    cases: d.totalCasesProcessed,
    backlog: d.currentBacklog,
    avgTime: Math.round(d.avgProcessingTime),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-violet-600" />
            التقارير والتحليلات
          </h1>
          <p className="text-muted-foreground">تقارير الأداء والإيرادات لجميع الأقسام</p>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-1">
          <RefreshCcw className="w-4 h-4" /> تحديث
        </Button>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              الإيرادات والأرباح الشهرية
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1 text-xs"
              onClick={() => exportCSV(revenue, "revenue", ["period", "revenue", "costs", "profit", "casesCount"])}>
              <Download className="w-3 h-3" /> تصدير CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} ج.م`,
                  name === "revenue" ? "الإيرادات" : name === "costs" ? "المصروفات" : "الأرباح",
                ]}
              />
              <Legend formatter={(v) => v === "revenue" ? "الإيرادات" : v === "costs" ? "المصروفات" : "الأرباح"} />
              <Bar dataKey="revenue" fill="#1e40af" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Department Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                أداء الأقسام
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1 text-xs"
                onClick={() => exportCSV(deptPerformance.map(d => ({ ...d, departmentAr: DEPT_NAMES[d.department] })), "department_performance", ["departmentAr", "totalCasesProcessed", "avgProcessingTime", "rejectionRate", "currentBacklog"])}>
                <Download className="w-3 h-3" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deptPerformance.map((dept) => {
                const maxCases = Math.max(...deptPerformance.map(d => d.totalCasesProcessed), 1);
                return (
                  <div key={dept.department} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{DEPT_NAMES[dept.department] || dept.department}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{dept.currentBacklog} انتظار</Badge>
                        {dept.rejectionRate > 5 && <Badge className="bg-red-100 text-red-700 text-[10px]">{dept.rejectionRate}% رفض</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2.5">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(dept.totalCasesProcessed / maxCases) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold w-8">{dept.totalCasesProcessed}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>متوسط الوقت: <strong className="text-foreground">{dept.avgProcessingTime.toFixed(1)} ساعة</strong></span>
                      <span>مرتجعات: <strong className={dept.rejectionRate > 5 ? "text-red-600" : "text-green-600"}>{dept.rejectionRate}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              مقارنة الأقسام (رادار)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dept" fontSize={10} />
                <PolarRadiusAxis fontSize={9} />
                <Radar name="الحالات" dataKey="cases" stroke="#1e40af" fill="#1e40af" fillOpacity={0.3} />
                <Radar name="الانتظار" dataKey="backlog" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Doctors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                أكثر الأطباء تعاملاً
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1 text-xs"
                onClick={() => exportCSV(topDoctors, "top_doctors", ["name", "clinic", "totalCases", "totalDebt"])}>
                <Download className="w-3 h-3" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDoctors.map((doc, idx) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-gray-200 text-gray-700" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.clinic}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{doc.totalCases} حالة</p>
                    {doc.totalDebt > 0 && (
                      <p className="text-xs text-red-600">ديون: {doc.totalDebt.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Work Type Distribution Pie */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-teal-600" />
                توزيع أنواع العمل
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1 text-xs"
                onClick={() => exportCSV(workTypeStats.map(w => ({ ...w, nameAr: WORK_AR[w.workType] || w.workType })), "work_types", ["nameAr", "count", "revenue"])}>
                <Download className="w-3 h-3" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workTypeStats.map(wt => ({ ...wt, name: WORK_AR[wt.workType] || wt.workType }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine
                  fontSize={11}
                >
                  {workTypeStats.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} حالة`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Work Type Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">إحصائيات أنواع العمل التفصيلية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-right py-2 px-2 font-medium">نوع العمل</th>
                  <th className="text-right py-2 px-2 font-medium">عدد الحالات</th>
                  <th className="text-right py-2 px-2 font-medium">الإيرادات</th>
                  <th className="text-right py-2 px-2 font-medium">متوسط السعر</th>
                  <th className="text-right py-2 px-2 font-medium">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {workTypeStats.map((wt) => {
                  const totalCases = workTypeStats.reduce((s, w) => s + w.count, 0);
                  const pct = totalCases > 0 ? (wt.count / totalCases) * 100 : 0;
                  return (
                    <tr key={wt.workType} className="border-b hover:bg-accent/30">
                      <td className="py-2 px-2 font-medium">{WORK_AR[wt.workType] || wt.workType}</td>
                      <td className="py-2 px-2">{wt.count}</td>
                      <td className="py-2 px-2 text-green-600 font-bold">{wt.revenue.toLocaleString()} ج.م</td>
                      <td className="py-2 px-2">{wt.count > 0 ? Math.round(wt.revenue / wt.count).toLocaleString() : 0} ج.م</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs w-10">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
