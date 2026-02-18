import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Reception from "@/pages/Reception";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import CADDepartment from "@/pages/CADDepartment";
import CAMDepartment from "@/pages/CAMDepartment";
import Finishing from "@/pages/Finishing";
import RemovableDepartment from "@/pages/RemovableDepartment";
import QualityControl from "@/pages/QualityControl";
import Inventory from "@/pages/Inventory";
import Accounting from "@/pages/Accounting";
import DeliveryPage from "@/pages/Delivery";
import Reports from "@/pages/Reports";
import Doctors from "@/pages/Doctors";
import UserManagement from "@/pages/UserManagement";
import AuditLogs from "@/pages/AuditLogs";
import Settings from "@/pages/Settings";
import InvoicePrint from "@/pages/InvoicePrint";
import CasePrint from "@/pages/CasePrint";
import Patients from "@/pages/Patients";
import DoctorStatement from "@/pages/DoctorStatement";
import DeliveryReceipt from "@/pages/DeliveryReceipt";
import SuppliersPage from "@/pages/Suppliers";
import BarcodeModule from "@/pages/BarcodeModule";
import AttendanceModule from "@/pages/AttendanceModule";
import HRModule from "@/pages/HRModule";
import KioskGate from "@/pages/KioskGate";
import NotFound from "@/pages/NotFound";

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600"
        dir="rtl"
      >
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 shadow-2xl mb-6">
            <img
              src="/logo1.png"
              alt="لاستر"
              className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-xl"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">معمل لاستر لطب الأسنان</h1>
          <p className="text-blue-100/90 text-sm sm:text-base mb-6">Luster Dental Lab</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce" />
          </div>
          <p className="text-blue-200/70 text-xs mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reception" element={<Reception />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/cad" element={<CADDepartment />} />
        <Route path="/cam" element={<CAMDepartment />} />
        <Route path="/finishing" element={<Finishing />} />
        <Route path="/removable" element={<RemovableDepartment />} />
        <Route path="/qc" element={<QualityControl />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/accounting" element={<Accounting />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/accounting/doctor/:id" element={<DoctorStatement />} />
        <Route path="/delivery/:id/receipt" element={<DeliveryReceipt />} />
        <Route path="/invoices/:id/print" element={<InvoicePrint />} />
        <Route path="/cases/:id/print" element={<CasePrint />} />
        <Route path="/barcode" element={<BarcodeModule />} />
        <Route path="/attendance" element={<AttendanceModule />} />
        <Route path="/hr" element={<HRModule />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/attendance/kiosk" element={<KioskGate />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
