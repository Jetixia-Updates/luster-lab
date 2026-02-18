/**
 * Scan Case Button - Opens scanner, resolves case, navigates or calls callback
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarcodeScanner } from "./BarcodeScanner";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ScanLine } from "lucide-react";

interface ScanCaseButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  onCaseFound?: (caseId: string) => void;
  children?: React.ReactNode;
}

export function ScanCaseButton({
  variant = "outline",
  size = "sm",
  className = "",
  onCaseFound,
  children,
}: ScanCaseButtonProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleScan = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    // تسجيل المسح تلقائياً
    api.post("/barcode/log", { action: "scan", barcodeValue: v, metadata: { source: "ScanCaseButton" } }).catch(() => {});
    try {
      // Try direct by ID first (UUID format)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      if (isUuid) {
        const res = await api.get<any>(`/cases/${v}`);
        if (res?.data?.id) {
          if (onCaseFound) onCaseFound(res.data.id);
          else navigate(`/cases/${res.data.id}`);
          return;
        }
      }
      // Search by caseNumber
      const res = await api.get<any>(`/cases?search=${encodeURIComponent(v)}`);
      const cases = res?.data || [];
      const found = cases.find((c: any) => c.caseNumber === v || c.id === v) || cases[0];
      if (found) {
        if (onCaseFound) onCaseFound(found.id);
        else navigate(`/cases/${found.id}`);
      } else {
        toast.error("لم يتم العثور على حالة بهذا الرقم");
      }
    } catch {
      toast.error("لم يتم العثور على الحالة");
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children || (
          <>
            <ScanLine className="w-4 h-4 ml-1" />
            مسح باركود
          </>
        )}
      </Button>
      <BarcodeScanner
        open={open}
        onClose={() => setOpen(false)}
        onScan={handleScan}
        title="مسح باركود الحالة"
      />
    </>
  );
}
