/**
 * Barcode/QR Scanner - Camera + File upload + Manual input
 * يعمل مع كاميرا الهاتف والماسح الضوئي ورفع الصور
 */

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanLine, Keyboard, Camera, Upload } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  title?: string;
}

const SCANNER_DIV_ID = "barcode-scanner-area";

export function BarcodeScanner({
  open,
  onClose,
  onScan,
  title = "مسح الباركود / QR",
}: BarcodeScannerProps) {
  const [manualValue, setManualValue] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "file" | "manual">("camera");
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setManualValue("");
    setCameraError(null);
    setActiveTab("camera");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const startCamera = async () => {
      try {
        const html5Qr = new Html5Qrcode(SCANNER_DIV_ID);
        await html5Qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            html5Qr.stop();
            html5QrRef.current = null;
            onScan(decodedText);
            onClose();
          },
          () => {}
        );
        html5QrRef.current = html5Qr;
      } catch {
        try {
          const html5Qr = new Html5Qrcode(SCANNER_DIV_ID);
          await html5Qr.start(
            { facingMode: "user" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              html5Qr.stop();
              html5QrRef.current = null;
              onScan(decodedText);
              onClose();
            },
            () => {}
          );
          html5QrRef.current = html5Qr;
        } catch (err: any) {
          setCameraError(err?.message || "فشل تشغيل الكاميرا");
          setActiveTab("manual");
        }
      }
    };
    startCamera();
    return () => {
      if (html5QrRef.current?.isScanning) {
        html5QrRef.current.stop();
      }
      html5QrRef.current = null;
    };
  }, [open, onScan, onClose]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualValue.trim();
    if (v) {
      onScan(v);
      setManualValue("");
      onClose();
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const html5Qr = new Html5Qrcode(SCANNER_DIV_ID);
      const result = await html5Qr.scanFile(file, false);
      if (result) {
        onScan(result);
        onClose();
      }
    } catch {
      // silent - user may pick wrong file
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* عنصر الكاميرا/الباركود - يجب أن يكون مرئياً عند الكاميرا ومُخفى عند رفع الملف */}
        <div
          id={SCANNER_DIV_ID}
          className={activeTab === "camera" && !cameraError
            ? "w-full min-h-[220px] rounded-lg overflow-hidden bg-black"
            : "absolute -left-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden"}
        />

        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="camera" className="gap-1 text-xs">
              <Camera className="w-3.5 h-3.5" /> الكاميرا
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-1 text-xs">
              <Upload className="w-3.5 h-3.5" /> رفع صورة
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1 text-xs">
              <Keyboard className="w-3.5 h-3.5" /> إدخال
            </TabsTrigger>
          </TabsList>
          <TabsContent value="camera" className="space-y-2">
            {cameraError ? (
              <div className="w-full min-h-[180px] rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center p-4">
                <div className="text-center text-sm text-amber-800">
                  <p className="font-medium">{cameraError}</p>
                  <p className="text-xs mt-2 text-amber-700">استخدم رفع صورة أو الإدخال اليدوي</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">وجّه الكاميرا نحو الباركود أو QR</p>
            )}
          </TabsContent>
          <TabsContent value="file" className="space-y-3">
            <p className="text-xs text-muted-foreground">ارفع صورة تحتوي على باركود أو QR</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileScan}
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" /> اختر صورة
            </Button>
            <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t">
              <Label>أو أدخل الرقم يدوياً</Label>
              <Input
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="L-2026-00001"
                className="font-mono"
              />
              <Button type="submit" className="w-full" disabled={!manualValue.trim()}>
                فتح
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="manual" className="space-y-3">
            <p className="text-xs text-muted-foreground">امسح بالماسح الضوئي أو أدخل الرقم يدوياً</p>
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Label>رقم الحالة / الباركود</Label>
              <Input
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="L-2026-00001"
                autoFocus
                className="font-mono"
              />
              <Button type="submit" className="w-full" disabled={!manualValue.trim()}>
                فتح
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
