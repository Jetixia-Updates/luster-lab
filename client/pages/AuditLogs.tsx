/**
 * Audit Logs Viewer
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, User, Clock, FileText, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuditLog } from "@shared/api";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE_CASE: { label: "إنشاء حالة", color: "bg-blue-100 text-blue-800" },
  UPDATE_CASE: { label: "تحديث حالة", color: "bg-yellow-100 text-yellow-800" },
  DELETE_CASE: { label: "حذف حالة", color: "bg-red-100 text-red-800" },
  TRANSFER_CASE: { label: "تحويل حالة", color: "bg-purple-100 text-purple-800" },
  QC_INSPECTION: { label: "فحص جودة", color: "bg-cyan-100 text-cyan-800" },
  CREATE_INVOICE: { label: "إصدار فاتورة", color: "bg-green-100 text-green-800" },
  RECORD_PAYMENT: { label: "تسجيل دفعة", color: "bg-emerald-100 text-emerald-800" },
  DEDUCT_STOCK: { label: "خصم مخزون", color: "bg-orange-100 text-orange-800" },
  RESTOCK: { label: "توريد مخزون", color: "bg-teal-100 text-teal-800" },
  CREATE_DOCTOR: { label: "إضافة طبيب", color: "bg-indigo-100 text-indigo-800" },
  UPDATE_DOCTOR: { label: "تحديث طبيب", color: "bg-indigo-100 text-indigo-800" },
  DELIVER_CASE: { label: "تسليم حالة", color: "bg-green-100 text-green-800" },
  LOGIN: { label: "تسجيل دخول", color: "bg-gray-100 text-gray-800" },
  CREATE_INVENTORY: { label: "إضافة صنف", color: "bg-blue-100 text-blue-800" },
  UPDATE_INVENTORY: { label: "تحديث صنف", color: "bg-yellow-100 text-yellow-800" },
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("all");

  useEffect(() => { loadLogs(); }, [entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (entityFilter !== "all") params.set("entity", entityFilter);
    params.set("limit", "100");
    const res = await api.get<any>(`/audit-logs?${params}`);
    setLogs(res.data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-slate-600" />
            سجل العمليات
          </h1>
          <p className="text-muted-foreground">تتبع جميع العمليات التي تمت على النظام</p>
        </div>
        <Button variant="outline" onClick={loadLogs} className="gap-2">
          <RefreshCw className="w-4 h-4" /> تحديث
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue placeholder="فلتر النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع العمليات</SelectItem>
            <SelectItem value="case">الحالات</SelectItem>
            <SelectItem value="invoice">الفواتير</SelectItem>
            <SelectItem value="inventory">المخزون</SelectItem>
            <SelectItem value="doctor">الأطباء</SelectItem>
            <SelectItem value="delivery">التسليم</SelectItem>
            <SelectItem value="user">المستخدمين</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-sm px-4">
          {logs.length} عملية
        </Badge>
      </div>

      {/* Logs Timeline */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">لا توجد عمليات مسجلة</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, idx) => {
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-800" };
                return (
                  <div key={log.id || idx} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                    {/* Timeline dot */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      {idx < logs.length - 1 && (
                        <div className="absolute top-10 right-1/2 translate-x-1/2 w-px h-6 bg-border" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={`${actionInfo.color} text-xs`}>{actionInfo.label}</Badge>
                        <Badge variant="outline" className="text-xs">{log.entity}</Badge>
                      </div>
                      {log.details && (
                        <p className="text-sm text-foreground mb-1">{log.details}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString("ar-EG", {
                            year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
