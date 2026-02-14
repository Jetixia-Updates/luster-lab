/**
 * All Cases - List, Search, Filter, Paginate
 */

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { STATUS_LABELS, WORK_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Filter, Eye, Printer, ChevronLeft, ChevronRight,
  FileText, Download, RefreshCcw,
} from "lucide-react";
import type { DentalCase, CaseStatus } from "@shared/api";

const PAGE_SIZE = 15;

export default function Cases() {
  const [allCases, setAllCases] = useState<DentalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  const loadCases = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await api.get<any>(`/cases?${params}`);
    setAllCases(res.data || []);
    setPage(1);
    setLoading(false);
  };

  // Client-side filtering
  const filtered = allCases.filter((c) => {
    if (workTypeFilter !== "all" && c.workType !== workTypeFilter) return false;
    if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.caseNumber.toLowerCase().includes(s) ||
        c.patientName.includes(search) ||
        c.doctorName.includes(search);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = () => {
    setPage(1);
    loadCases();
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [search, workTypeFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            جميع الحالات
          </h1>
          <p className="text-muted-foreground">عرض وتتبع جميع حالات المعمل ({filtered.length} حالة)</p>
        </div>
        <Button variant="outline" onClick={loadCases} className="gap-1">
          <RefreshCcw className="w-4 h-4" /> تحديث
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="بحث برقم الحالة أو اسم المريض أو الطبيب..."
                  className="pr-10"
                />
              </div>
              <Button variant="outline" onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="نوع العمل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {Object.entries(WORK_TYPE_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="الأولوية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد حالات مطابقة</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-right py-3 px-2 font-medium">رقم الحالة</th>
                      <th className="text-right py-3 px-2 font-medium">المريض</th>
                      <th className="text-right py-3 px-2 font-medium">الطبيب</th>
                      <th className="text-right py-3 px-2 font-medium">نوع العمل</th>
                      <th className="text-right py-3 px-2 font-medium">الحالة</th>
                      <th className="text-right py-3 px-2 font-medium">الأولوية</th>
                      <th className="text-right py-3 px-2 font-medium">اللون</th>
                      <th className="text-right py-3 px-2 font-medium">تاريخ الاستلام</th>
                      <th className="text-center py-3 px-2 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-2 font-mono font-semibold text-primary">{c.caseNumber}</td>
                        <td className="py-3 px-2">{c.patientName}</td>
                        <td className="py-3 px-2">{c.doctorName}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{WORK_TYPE_LABELS[c.workType]?.ar || c.workType}</Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge className={`${STATUS_LABELS[c.currentStatus]?.color} text-xs`}>
                            {STATUS_LABELS[c.currentStatus]?.ar}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge className={`${PRIORITY_LABELS[c.priority]?.color} text-xs`}>
                            {PRIORITY_LABELS[c.priority]?.ar}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">{c.shadeColor}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">
                          {new Date(c.receivedDate).toLocaleDateString("ar-EG")}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <Link to={`/cases/${c.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="عرض التفاصيل">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link to={`/cases/${c.id}/print`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="طباعة باركود">
                                <Printer className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    عرض {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} من {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
