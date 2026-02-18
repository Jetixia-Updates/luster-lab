/**
 * وحدة الباركود والـ QR - مديول كامل
 * المسح: كاميرا / رفع صورة / إدخال يدوي
 * التوليد: إنشاء باركود و QR
 */

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ScanLine, QrCode, Camera, Upload, Keyboard, FileBarChart,
  Link as LinkIcon, Printer, Copy,
} from "lucide-react";
import { BarcodeDisplay, QRCodeDisplay } from "@/components/barcode";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_DIV_ID = "barcode-module-scanner";

export default function BarcodeModule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"scan" | "generate">("scan");
  const [scanMethod, setScanMethod] = useState<"camera" | "file" | "manual">("manual");
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [genValue, setGenValue] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);

  const handleScanResult = async (value: string) => {
    setScanResult(value);
    setScanning(false);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      if (isUuid) {
        const res = await api.get<any>(`/cases/${value}`);
        if (res?.data?.id) {
          toast.success("تم العثور على الحالة");
          navigate(`/cases/${res.data.id}`);
          return;
        }
      }
      const res = await api.get<any>(`/cases?search=${encodeURIComponent(value)}`);
      const cases = res?.data || [];
      const found = cases.find((c: any) => c.caseNumber === value || c.id === value) || cases[0];
      if (found) {
        toast.success("تم العثور على الحالة");
        navigate(`/cases/${found.id}`);
      } else {
        toast.info(`تم المسح: ${value}`);
      }
    } catch {
      toast.info(`تم المسح: ${value}`);
    }
  };

  const startCamera = async () => {
    setScanMethod("camera");
    setCameraError(null);
    setScanning(true);
    setScanResult(null);
    if (html5QrRef.current?.isScanning) {
      html5QrRef.current.stop();
      html5QrRef.current = null;
    }
    setTimeout(async () => {
      try {
        const html5Qr = new Html5Qrcode(SCANNER_DIV_ID);
        await html5Qr.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            html5Qr.stop();
            html5QrRef.current = null;
            handleScanResult(decodedText);
          },
          () => {}
        );
        html5QrRef.current = html5Qr;
      } catch (err: any) {
        const msg = err?.message || "فشل تشغيل الكاميرا";
        setCameraError(msg);
        setScanning(false);
        toast.error("استخدم رفع صورة أو الإدخال اليدوي");
      }
    }, 100);
  };

  const stopCamera = () => {
    if (html5QrRef.current?.isScanning) {
      html5QrRef.current.stop();
      html5QrRef.current = null;
    }
    setScanning(false);
    setCameraError(null);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setScanning(true);
      const html5Qr = new Html5Qrcode(SCANNER_DIV_ID);
      const result = await html5Qr.scanFile(file, false);
      if (result) {
        handleScanResult(result);
      } else {
        toast.error("لم يتم العثور على باركود أو QR في الصورة");
      }
    } catch (err: any) {
      toast.error(err?.message || "فشل قراءة الصورة");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualInput.trim();
    if (v) {
      handleScanResult(v);
      setManualInput("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="w-7 h-7 text-indigo-600" />
          وحدة الباركود والـ QR
        </h1>
        <p className="text-muted-foreground">مسح وتوليد الباركود ورموز QR - كاميرا، رفع صورة، أو إدخال يدوي</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="scan" className="gap-2">
            <ScanLine className="w-4 h-4" /> مسح
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2">
            <FileBarChart className="w-4 h-4" /> توليد
          </TabsTrigger>
        </TabsList>

        {/* ── Scan Tab ────────────────────────────── */}
        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">مسح الباركود أو QR</CardTitle>
              <p className="text-sm text-muted-foreground">
                استخدم الكاميرا أو ارفع صورة أو أدخل الرقم يدوياً
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* عنصر ثابت في الـ DOM مطلوب لـ Html5Qrcode.scanFile - يُعرض فقط عند وضع الكاميرا */}
              <div
                id={SCANNER_DIV_ID}
                className={scanMethod === "camera"
                  ? "w-full min-h-[260px] rounded-lg overflow-hidden bg-black"
                  : "absolute -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={scanMethod === "camera" ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => { stopCamera(); startCamera(); }}
                >
                  <Camera className="w-4 h-4" /> كاميرا
                </Button>
                <Button
                  variant={scanMethod === "file" ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => { stopCamera(); setScanMethod("file"); fileInputRef.current?.click(); }}
                >
                  <Upload className="w-4 h-4" /> رفع صورة
                </Button>
                <Button
                  variant={scanMethod === "manual" ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => { stopCamera(); setScanMethod("manual"); }}
                >
                  <Keyboard className="w-4 h-4" /> إدخال يدوي
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileScan}
              />

              {scanMethod === "camera" && (
                <div className="space-y-2">
                  {cameraError && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-sm text-amber-800 font-medium">فشل تشغيل الكاميرا</p>
                      <p className="text-xs text-amber-700 mt-1">
                        تأكد من السماح للمتصفح بالوصول للكاميرا، أو استخدم <strong>رفع صورة</strong> أو <strong>إدخال يدوي</strong> بدلاً من ذلك.
                      </p>
                      <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => { setScanMethod("manual"); stopCamera(); }}>
                        <Keyboard className="w-3 h-3" /> استخدام الإدخال اليدوي
                      </Button>
                    </div>
                  )}
                  {scanning && !cameraError && (
                    <Button variant="outline" size="sm" onClick={stopCamera}>إيقاف المسح</Button>
                  )}
                </div>
              )}

              {scanMethod === "file" && (
                <p className="text-sm text-muted-foreground">اضغط «رفع صورة» واختر صورة تحتوي على باركود أو QR</p>
              )}

              {(scanMethod === "manual" || cameraError || scanMethod === "file") && (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <Label>رقم الحالة أو الباركود</Label>
                  <div className="flex gap-2">
                    <Input
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="L-2026-00001"
                      className="font-mono"
                      autoFocus
                    />
                    <Button type="submit" disabled={!manualInput.trim()}>فتح</Button>
                  </div>
                </form>
              )}

              {scanResult && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm font-medium text-green-800">آخر مسح: {scanResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Generate Tab ────────────────────────────── */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">توليد باركود و QR</CardTitle>
              <p className="text-sm text-muted-foreground">أدخل النص لإنشاء باركود Code128 ورمز QR</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>النص (رقم حالة أو أي نص)</Label>
                <Input
                  value={genValue}
                  onChange={(e) => setGenValue(e.target.value)}
                  placeholder="L-2026-00001"
                  className="font-mono mt-2"
                />
              </div>

              {genValue.trim() && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-6 bg-gray-50 rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <BarcodeDisplay value={genValue} width={2} height={70} fontSize={14} />
                    <span className="text-xs text-muted-foreground">باركود Code128</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(genValue)} className="gap-1">
                        <Copy className="w-3 h-3" /> نسخ
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <QRCodeDisplay value={genValue} size={140} level="M" />
                    <span className="text-xs text-muted-foreground">QR Code</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(genValue)} className="gap-1">
                        <Copy className="w-3 h-3" /> نسخ
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {genValue.trim() && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4" /> طباعة
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => navigate(`/cases?search=${encodeURIComponent(genValue)}`)}
                  >
                    <LinkIcon className="w-4 h-4" /> فتح الحالة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
