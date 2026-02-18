/**
 * Main Application Layout with Sidebar Navigation
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/constants";
import { useEffect, useState as useStateLocal } from "react";
import {
  LayoutDashboard, ClipboardList, PenTool, Cpu, Paintbrush, Workflow,
  ShieldCheck, Calculator, Truck, Package, BarChart3,
  Menu, ChevronLeft, LogOut, User, Settings,
  Stethoscope, Users, ScrollText, FileText, Bell, AlertTriangle, QrCode,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanCaseButton } from "@/components/barcode";
import { api } from "@/lib/api";
import { toast } from "sonner";

import type { UserRole } from "@shared/api";

type NavItem = { path: string; label: string; icon: any; roles?: UserRole[] };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
      { path: "/barcode", label: "الباركود و QR", icon: QrCode },
    ],
  },
  {
    title: "الأقسام",
    items: [
      { path: "/reception", label: "الاستقبال", icon: ClipboardList, roles: ["admin", "receptionist"] },
      { path: "/cad", label: "التصميم CAD", icon: PenTool, roles: ["admin", "designer"] },
      { path: "/cam", label: "التفريز CAM", icon: Cpu, roles: ["admin", "technician"] },
      { path: "/finishing", label: "التشطيب والتلوين", icon: Paintbrush, roles: ["admin", "technician"] },
      { path: "/removable", label: "التركيبات المتحركة", icon: Workflow, roles: ["admin", "technician"] },
      { path: "/qc", label: "مراقبة الجودة", icon: ShieldCheck, roles: ["admin", "qc_manager"] },
      { path: "/delivery", label: "التسليم", icon: Truck, roles: ["admin", "delivery_staff"] },
    ],
  },
  {
    title: "صرف من المخازن",
    items: [
      { path: "/inventory", label: "المخازن", icon: Package, roles: ["admin", "technician"] },
    ],
  },
  {
    title: "إدارة",
    items: [
      { path: "/cases", label: "جميع الحالات", icon: FileText },
      { path: "/doctors", label: "الأطباء", icon: Stethoscope, roles: ["admin", "receptionist", "accountant"] },
      { path: "/patients", label: "المرضى", icon: Users, roles: ["admin", "receptionist"] },
      { path: "/suppliers", label: "الموردين", icon: Truck, roles: ["admin", "accountant"] },
      { path: "/accounting", label: "الحسابات", icon: Calculator, roles: ["admin", "accountant"] },
    ],
  },
  {
    title: "النظام",
    items: [
      { path: "/reports", label: "التقارير", icon: BarChart3, roles: ["admin", "accountant", "qc_manager"] },
      { path: "/users", label: "المستخدمين", icon: Users, roles: ["admin"] },
      { path: "/audit-logs", label: "سجل العمليات", icon: ScrollText, roles: ["admin"] },
      { path: "/settings", label: "الإعدادات", icon: Settings, roles: ["admin"] },
    ],
  },
];

interface Notification {
  id: string;
  type: "warning" | "info" | "success";
  message: string;
  time: string;
  to?: string; // route to navigate on click
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // على الموبايل: القائمة مغلقة افتراضياً
  useEffect(() => {
    const isMobile = () => window.innerWidth < 768;
    if (isMobile()) setSidebarOpen(false);
  }, []);
  const [notifications, setNotifications] = useStateLocal<Notification[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("تم تسجيل الخروج بنجاح");
    navigate("/", { replace: true });
  };

  // Read notification preferences
  const getNotifPrefs = () => {
    try {
      const saved = localStorage.getItem("luster_notif_prefs");
      return saved ? JSON.parse(saved) : { lowStock: true, rushCases: true, overdueCases: true, overduePayments: true };
    } catch {
      return { lowStock: true, rushCases: true, overdueCases: true, overduePayments: true };
    }
  };

  // Fetch notifications (low stock, overdue cases, overdue payments, rush cases)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const prefs = getNotifPrefs();
        const [lowStockRes, statsRes] = await Promise.all([
          api.get<any>("/inventory/low-stock"),
          api.get<any>("/dashboard/stats"),
        ]);
        const notifs: Notification[] = [];
        const lowStock = lowStockRes.data || [];
        if (prefs.lowStock && lowStock.length > 0) {
          notifs.push({
            id: "low-stock",
            type: "warning",
            message: `${lowStock.length} صنف تحت الحد الأدنى في المخزن`,
            time: "الآن",
            to: "/inventory",
          });
        }
        const stats = statsRes.data || {};
        if (prefs.rushCases && stats.rushCases > 0) {
          notifs.push({
            id: "rush",
            type: "warning",
            message: `${stats.rushCases} حالات عاجلة في الانتظار`,
            time: "الآن",
            to: "/cases",
          });
        }
        if (prefs.overdueCases && stats.overdueCases > 0) {
          notifs.push({
            id: "overdue",
            type: "warning",
            message: `${stats.overdueCases} حالات تجاوزت موعد التسليم`,
            time: "الآن",
            to: "/cases",
          });
        }
        if (prefs.overduePayments && stats.overduePayments > 0) {
          notifs.push({
            id: "overdue-payments",
            type: "warning",
            message: `${stats.overduePayments} فواتير متأخرة السداد`,
            time: "الآن",
            to: "/accounting",
          });
        }
        setNotifications(notifs);
      } catch { /* silently fail */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [location.pathname]); // re-fetch when navigating (prefs may have changed)

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 right-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 no-print",
          "w-[min(300px,90vw)]",
          sidebarOpen ? "md:w-64" : "md:w-[70px]",
          mobileOpen ? "translate-x-0 shadow-2xl" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <img src="/logo1.png" alt="لاستر" className="w-10 h-10 rounded-lg object-contain shrink-0 bg-white/5" />
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-base leading-tight">لاستر</h1>
              <p className="text-xs text-sidebar-foreground/60">Dental Lab ERP</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || !user?.role || item.roles.includes(user.role as UserRole)
            );
            if (visibleItems.length === 0) return null;
            return (
            <div key={section.title} className="mb-3">
              {sidebarOpen && (
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== "/" && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="w-4.5 h-4.5 shrink-0" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
            );
          })}
        </nav>

        {/* User & Collapse */}
        <div className="border-t border-sidebar-border">
          {/* User info in sidebar */}
          {sidebarOpen && user && (
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-primary flex items-center justify-center text-sm font-bold shrink-0">
                {user.fullNameAr?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.fullNameAr}</p>
                <p className="text-[10px] text-sidebar-foreground/50">
                  {ROLE_LABELS[user.role]?.ar}
                </p>
              </div>
            </div>
          )}
          {/* Collapse Button */}
          <div className="p-2 hidden md:block">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors text-xs"
            >
              <ChevronLeft className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
              {sidebarOpen && <span>طي القائمة</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar - safe area for notched devices */}
        <header className="h-14 min-h-[3.5rem] pt-[env(safe-area-inset-top)] border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 no-print sticky top-0 z-30">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center md:justify-start">
            <span className="text-xs sm:text-sm text-muted-foreground truncate">
              {new Date().toLocaleDateString("ar-EG", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ScanCaseButton variant="outline" size="sm" className="gap-1" />
            {/* Notification Bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
                  <Bell className="w-4.5 h-4.5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0" dir="rtl">
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-sm">الإشعارات</h4>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((n) => {
                      const content = (
                        <>
                          <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", n.type === "warning" ? "text-amber-500" : "text-blue-500")} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{n.message}</p>
                            <p className="text-xs text-muted-foreground">{n.time}</p>
                          </div>
                        </>
                      );
                      return n.to ? (
                        <Link key={n.id} to={n.to} className="flex items-start gap-3 p-3 border-b last:border-0 hover:bg-accent/30 transition-colors">
                          {content}
                        </Link>
                      ) : (
                        <div key={n.id} className="flex items-start gap-3 p-3 border-b last:border-0 hover:bg-accent/30 transition-colors">
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {user?.fullNameAr?.charAt(0) || "م"}
                  </div>
                  <span className="hidden sm:block text-sm">{user?.fullNameAr || "مدير النظام"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium text-sm">{user?.fullNameAr}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge className="mt-1 text-[10px]" variant="outline">
                    {ROLE_LABELS[user?.role as any]?.ar || "مدير"}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" /> الإعدادات
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/audit-logs" className="gap-2 cursor-pointer">
                    <ScrollText className="w-4 h-4" /> سجل العمليات
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4" /> تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content - responsive padding */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {children}
        </main>
      </div>
    </div>
  );
}
