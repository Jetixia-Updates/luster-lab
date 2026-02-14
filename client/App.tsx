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
import NotFound from "@/pages/NotFound";

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center">
          <img src="/logo1.png" alt="لاستر" className="inline-block w-16 h-16 object-contain mb-4 animate-pulse" />
          <p className="text-muted-foreground">جاري التحميل...</p>
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
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
