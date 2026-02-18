/**
 * وحدة الباركود والـ QR - نظام إدارة كامل
 * المسح، التوليد (مع الاسم والتواريخ)، السجلات، وسجل العمليات
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ScanLine, QrCode, Camera, Upload, Keyboard, FileBarChart,
  Link as LinkIcon, Printer, Copy, Search, Package, List, History,
  Pencil, Trash2, Save, Stethoscope, Warehouse, ArrowRight,
} from "lucide-react";
import { BarcodeDisplay, QRCodeDisplay } from "@/components/barcode";
import { Html5Qrcode } from "html5-qrcode";
import type { DentalCase, InventoryTransaction, BarcodeLabel, BarcodeLog, WarehouseQuantityUnit } from "@shared/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SCANNER_DIV_ID = "barcode-module-scanner";
const WAREHOUSE_UNITS: { value: WarehouseQuantityUnit; label: string }[] = [
  { value: "شيكارة", label: "شيكارة" },
  { value: "عينة", label: "عينة" },
  { value: "علبة", label: "علبة" },
  { value: "كيلو", label: "كيلو" },
  { value: "جرام", label: "جرام" },
  { value: "قطعة", label: "قطعة" },
  { value: "لتر", label: "لتر" },
  { value: "أخرى", label: "أخرى" },
];
const LOG_LABELS: Record<string, string> = { scan: "مسح", generate: "توليد", print: "طباعة", create: "إنشاء", edit: "تعديل", delete: "حذف" };

export default function BarcodeModule() {
  const navigate = useNavigate();
  useAuth();
  const [section, setSection] = useState<null | "delivery" | "warehouse">(null);
  const [activeTab, setActiveTab] = useState<"scan" | "generate" | "labels" | "logs">("scan");
  const [scanMethod, setScanMethod] = useState<"camera" | "file" | "manual">("manual");
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);

  // توليد
  const [genBarcodeValue, setGenBarcodeValue] = useState("");
  const [genLabelName, setGenLabelName] = useState("");
  const [genPatientName, setGenPatientName] = useState("");
  const [genDoctorName, setGenDoctorName] = useState("");
  const [genReceivedDate, setGenReceivedDate] = useState("");
  const [genExpectedDate, setGenExpectedDate] = useState("");
  const [genActualDate, setGenActualDate] = useState("");
  const [genNotes, setGenNotes] = useState("");
  const [genMode, setGenMode] = useState<"form" | "case">("form");
  const [caseSearch, setCaseSearch] = useState("");
  const [caseResults, setCaseResults] = useState<DentalCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<DentalCase | null>(null);
  const [inventoryTx, setInventoryTx] = useState<InventoryTransaction[]>([]);

  // المخازن
  const [whProductName, setWhProductName] = useState("");
  const [whWeightKg, setWhWeightKg] = useState("");
  const [whWeightGrams, setWhWeightGrams] = useState("");
  const [whQuantity, setWhQuantity] = useState("");
  const [whQuantityUnit, setWhQuantityUnit] = useState<WarehouseQuantityUnit>("علبة");
  const [whManualInput, setWhManualInput] = useState("");
  const [warehouseScanning, setWarehouseScanning] = useState(false);

  // السجلات
  const [labels, setLabels] = useState<BarcodeLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [editLabel, setEditLabel] = useState<BarcodeLabel | null>(null);
  const [editForm, setEditForm] = useState<Partial<BarcodeLabel>>({});

  // سجل العمليات
  const [logs, setLogs] = useState<BarcodeLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLabels = (labelType?: "case" | "warehouse") => {
    setLabelsLoading(true);
    const q = labelType ? `?labelType=${labelType}` : "";
    api.get<any>(`/barcode/labels${q}`).then((r) => { setLabels(r.data || []); }).finally(() => setLabelsLoading(false));
  };
  const loadLogs = () => {
    setLogsLoading(true);
    api.get<any>("/barcode/logs?limit=100").then((r) => { setLogs(r.data || []); }).finally(() => setLogsLoading(false));
  };

  useEffect(() => {
    if (activeTab === "labels") loadLabels(section === "warehouse" ? "warehouse" : "case");
  }, [activeTab, section]);
  useEffect(() => {
    if (section === "warehouse") loadLabels("warehouse");
  }, [section]);
  useEffect(() => { if (activeTab === "logs") loadLogs(); }, [activeTab]);

  const logAction = (action: BarcodeLog["action"], barcodeValue: string, extra?: Record<string, unknown>) => {
    api.post("/barcode/log", { action, barcodeValue, ...extra }).catch(() => {});
  };

  const handleScanResult = async (value: string) => {
    setScanResult(value);
    setScanning(false);
    logAction("scan", value);
    if (section === "warehouse") {
      setWarehouseScanning(false);
      try {
        const res = await api.get<any>(`/inventory?search=${encodeURIComponent(value)}`);
        const items = res?.data || [];
        const found = items.find((i: any) => i.sku === value || i.id === value) || items[0];
        if (found) {
          toast.success(`تم العثور: ${found.nameAr}`);
          setWhProductName(found.nameAr || found.name || "");
          setWhQuantity(String(found.currentStock ?? ""));
          setWhQuantityUnit((found.unit as WarehouseQuantityUnit) || "قطعة");
        } else {
          toast.info(`تم المسح: ${value}`);
        }
      } catch { toast.info(`تم المسح: ${value}`); }
      return;
    }
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      let found: any = null;
      if (isUuid) {
        const res = await api.get<any>(`/cases/${value}`);
        if (res?.data?.id) found = res.data;
      }
      if (!found) {
        const res = await api.get<any>(`/cases?search=${encodeURIComponent(value)}`);
        const casesList = res?.data || [];
        found = casesList.find((c: any) => c.caseNumber === value || c.id === value) || casesList[0];
      }
      if (found) {
        toast.success(`تم العثور: ${found.patientName} - ${found.caseNumber}`);
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
    if (html5QrRef.current?.isScanning) { html5QrRef.current.stop(); html5QrRef.current = null; }
    setTimeout(async () => {
      try {
        const html5Qr = new Html5Qrcode(SCANNER_DIV_ID);
        await html5Qr.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (t) => { html5Qr.stop(); html5QrRef.current = null; setWarehouseScanning(false); handleScanResult(t); },
          () => {}
        );
        html5QrRef.current = html5Qr;
      } catch (err: any) {
        setCameraError(err?.message || "فشل تشغيل الكاميرا");
        setScanning(false);
        setWarehouseScanning(false);
        toast.error("استخدم رفع صورة أو الإدخال اليدوي");
      }
    }, 100);
  };

  const stopCamera = () => {
    if (html5QrRef.current?.isScanning) { html5QrRef.current.stop(); html5QrRef.current = null; }
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
      if (result) handleScanResult(result);
      else toast.error("لم يتم العثور على باركود أو QR");
    } catch (err: any) { toast.error(err?.message || "فشل قراءة الصورة"); }
    finally { setScanning(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  useEffect(() => {
    if (!caseSearch.trim()) { setCaseResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get<any>(`/cases?search=${encodeURIComponent(caseSearch)}`);
        setCaseResults(res.data || []);
      } catch { setCaseResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [caseSearch]);

  const selectCaseForGen = async (c: DentalCase) => {
    setSelectedCase(c);
    setGenBarcodeValue(c.caseNumber);
    setGenLabelName(c.patientName);
    setGenPatientName(c.patientName);
    setGenDoctorName(c.doctorName || "");  // من الاستقبال مباشرة
    setGenReceivedDate(c.receivedDate ? c.receivedDate.slice(0, 10) : "");
    setGenExpectedDate(c.expectedDeliveryDate ? c.expectedDeliveryDate.slice(0, 10) : "");
    setGenActualDate(c.actualDeliveryDate ? c.actualDeliveryDate.slice(0, 10) : "");
    try {
      const res = await api.get<any>(`/inventory/transactions?caseId=${c.id}`);
      setInventoryTx((res.data || []).filter((t: InventoryTransaction) => t.type === "deduction"));
    } catch { setInventoryTx([]); }
  };

  const saveLabel = async () => {
    const barcodeValue = genMode === "case" && selectedCase ? selectedCase.caseNumber : genBarcodeValue.trim();
    if (!barcodeValue) { toast.error("أدخل نص الباركود"); return; }
    try {
      await api.post("/barcode/labels", {
        labelType: "case",
        barcodeValue,
        labelName: genLabelName.trim() || genPatientName.trim() || undefined,
        patientName: genPatientName.trim() || undefined,
        doctorName: genDoctorName.trim() || undefined,
        caseId: selectedCase?.id,
        caseNumber: selectedCase?.caseNumber,
        receivedDate: genReceivedDate || undefined,
        expectedDeliveryDate: genExpectedDate || undefined,
        actualDeliveryDate: genActualDate || undefined,
        notes: genNotes.trim() || undefined,
      });
      toast.success("تم الحفظ");
      loadLabels();
      logAction("create", barcodeValue, { labelName: genLabelName || genPatientName });
      setActiveTab("labels");
    } catch (e: any) { toast.error(e?.message || "فشل الحفظ"); }
  };

  const effectiveBarcodeValue = genMode === "case" && selectedCase ? selectedCase.caseNumber : genBarcodeValue.trim();

  const openEdit = (l: BarcodeLabel) => {
    setEditLabel(l);
    setEditForm({
      barcodeValue: l.barcodeValue,
      labelName: l.labelName,
      patientName: l.patientName,
      doctorName: l.doctorName,
      receivedDate: l.receivedDate?.slice(0, 10),
      expectedDeliveryDate: l.expectedDeliveryDate?.slice(0, 10),
      actualDeliveryDate: l.actualDeliveryDate?.slice(0, 10),
      notes: l.notes,
    });
  };

  const saveEdit = async () => {
    if (!editLabel) return;
    try {
      await api.put(`/barcode/labels/${editLabel.id}`, editForm);
      toast.success("تم التعديل");
      setEditLabel(null);
      loadLabels();
    } catch (e: any) { toast.error(e?.message || "فشل التعديل"); }
  };

  const deleteLabel = async (id: string) => {
    if (!confirm("حذف هذا الملصق؟")) return;
    try {
      await api.delete(`/barcode/labels/${id}`);
      toast.success("تم الحذف");
      loadLabels();
    } catch (e: any) { toast.error(e?.message || "فشل الحذف"); }
  };

  const handlePrint = () => {
    if (effectiveBarcodeValue) logAction("print", effectiveBarcodeValue);
    window.print();
  };

  const effectiveWarehouseBarcode = whProductName.trim()
    ? `WH-${whProductName.replace(/\s+/g, "-").slice(0, 20)}-${whWeightKg || "0"}kg-${whQuantity || "0"}`
    : "";

  const saveWarehouseLabel = async () => {
    if (!whProductName.trim()) { toast.error("أدخل اسم المنتج"); return; }
    const barcodeValue = effectiveWarehouseBarcode || `WH-${Date.now()}`;
    try {
      await api.post("/barcode/labels", {
        labelType: "warehouse",
        barcodeValue,
        productName: whProductName.trim(),
        weightKg: whWeightKg ? parseFloat(whWeightKg) : undefined,
        weightGrams: whWeightGrams ? parseFloat(whWeightGrams) : undefined,
        quantity: whQuantity ? parseFloat(whQuantity) : undefined,
        quantityUnit: whQuantityUnit,
      });
      toast.success("تم الحفظ");
      loadLabels("warehouse");
      logAction("create", barcodeValue, { labelName: whProductName });
      setActiveTab("labels");
    } catch (e: any) { toast.error(e?.message || "فشل الحفظ"); }
  };

  // ─── صفحة البداية: زرارين ─────────────────────────
  if (section === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="w-7 h-7 text-indigo-600" />
            الباركود والـ QR
          </h1>
          <p className="text-muted-foreground">اختر النوع للمتابعة</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <button
            type="button"
            onClick={() => setSection("delivery")}
            className="p-8 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-right flex flex-col items-start gap-4 group"
          >
            <Stethoscope className="w-14 h-14 text-primary" />
            <div>
              <h2 className="text-xl font-bold">التسليم والاستلام من الدكتور</h2>
              <p className="text-muted-foreground text-sm mt-1">المرضى والتركيبات — مسح وتوليد باركود الحالات</p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            type="button"
            onClick={() => setSection("warehouse")}
            className="p-8 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all text-right flex flex-col items-start gap-4 group"
          >
            <Warehouse className="w-14 h-14 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold">المخازن</h2>
              <p className="text-muted-foreground text-sm mt-1">منتجات المخازن — اسم، وزن، كمية، وحدة</p>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" className="gap-1 mb-2 -mr-2" onClick={() => setSection(null)}>← رجوع</Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {section === "delivery" ? <Stethoscope className="w-7 h-7 text-primary" /> : <Warehouse className="w-7 h-7 text-emerald-600" />}
            {section === "delivery" ? "التسليم والاستلام من الدكتور" : "المخازن"}
          </h1>
          <p className="text-muted-foreground">{section === "delivery" ? "المرضى والتركيبات — مسح وتوليد" : "منتجات المخازن — باركود و QR"}</p>
        </div>
      </div>

      {section === "warehouse" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>توليد ملصق مخزن</CardTitle>
              <p className="text-sm text-muted-foreground">اسم المنتج، الوزن، العدد، ووحدة الكمية</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>اسم المنتج *</Label><Input value={whProductName} onChange={(e) => setWhProductName(e.target.value)} placeholder="اسم المنتج" className="mt-1" /></div>
                <div><Label>الوزن (كيلو)</Label><Input type="number" step="0.001" value={whWeightKg} onChange={(e) => setWhWeightKg(e.target.value)} placeholder="0" className="mt-1" /></div>
                <div><Label>الوزن (جرام)</Label><Input type="number" step="1" value={whWeightGrams} onChange={(e) => setWhWeightGrams(e.target.value)} placeholder="0" className="mt-1" /></div>
                <div><Label>العدد / الكمية</Label><Input type="number" value={whQuantity} onChange={(e) => setWhQuantity(e.target.value)} placeholder="0" className="mt-1" /></div>
                <div><Label>وحدة الكمية</Label><Select value={whQuantityUnit} onValueChange={(v: WarehouseQuantityUnit) => setWhQuantityUnit(v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{WAREHOUSE_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div id={SCANNER_DIV_ID} className={warehouseScanning ? "w-full min-h-[200px] rounded-lg overflow-hidden bg-black mb-4" : "hidden w-0 h-0 overflow-hidden"} />
              {warehouseScanning && <Button variant="outline" size="sm" className="mb-2" onClick={() => { stopCamera(); setWarehouseScanning(false); }}>إيقاف المسح</Button>}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => { setWarehouseScanning(true); stopCamera(); startCamera(); }}><Camera className="w-4 h-4" /> مسح لملء النموذج</Button>
                <div className="flex gap-2 flex-1">
                  <Input value={whManualInput} onChange={(e) => setWhManualInput(e.target.value)} placeholder="أدخل SKU أو اسم للبحث" className="font-mono" />
                  <Button variant="outline" size="sm" onClick={async () => { const v = whManualInput.trim(); if (v) { handleScanResult(v); setWhManualInput(""); } }}>بحث</Button>
                </div>
              </div>
              {(effectiveWarehouseBarcode || whProductName.trim()) && (
                <>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-6 bg-emerald-50 rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                      <BarcodeDisplay value={effectiveWarehouseBarcode || whProductName} width={2} height={70} fontSize={14} />
                      <span className="text-xs text-muted-foreground">باركود</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <QRCodeDisplay value={effectiveWarehouseBarcode || whProductName} size={120} level="M" />
                      <span className="text-xs text-muted-foreground">QR</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveWarehouseLabel} className="gap-2"><Save className="w-4 h-4" /> حفظ</Button>
                    <Button variant="outline" onClick={() => { logAction("print", effectiveWarehouseBarcode || whProductName); window.print(); }} className="gap-2"><Printer className="w-4 h-4" /> طباعة</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ملصقات المخازن</CardTitle>
              <p className="text-sm text-muted-foreground">عرض وتعديل ملصقات المنتجات</p>
            </CardHeader>
            <CardContent>
              {labelsLoading ? <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div> : labels.filter((l) => (l.labelType || "case") === "warehouse").length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">لا توجد ملصقات مخازن</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-right py-2 font-medium">المنتج</th><th className="text-right py-2 font-medium">الوزن</th><th className="text-right py-2 font-medium">الكمية</th><th className="text-right py-2 font-medium">الوحدة</th><th></th></tr></thead>
                    <tbody>
                      {labels.filter((l) => (l.labelType || "case") === "warehouse").map((l) => (
                        <tr key={l.id} className="border-b hover:bg-muted/30">
                          <td className="py-2">{l.productName || "—"}</td>
                          <td className="py-2">{(l.weightKg || 0) > 0 ? `${l.weightKg} كغ` : (l.weightGrams || 0) > 0 ? `${l.weightGrams} غ` : "—"}</td>
                          <td className="py-2">{l.quantity ?? "—"}</td>
                          <td className="py-2">{l.quantityUnit || "—"}</td>
                          <td className="py-2"><Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteLabel(l.id)}><Trash2 className="w-4 h-4" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="scan" className="gap-1"><ScanLine className="w-4 h-4" /> مسح</TabsTrigger>
          <TabsTrigger value="generate" className="gap-1"><FileBarChart className="w-4 h-4" /> توليد</TabsTrigger>
          <TabsTrigger value="labels" className="gap-1"><List className="w-4 h-4" /> السجلات</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1"><History className="w-4 h-4" /> سجل العمليات</TabsTrigger>
        </TabsList>

        {/* ── مسح ───────────────────────────────────── */}
        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>مسح الباركود أو QR</CardTitle>
              <p className="text-sm text-muted-foreground">الكاميرا، رفع صورة، أو إدخال يدوي — كل عملية تُسجّل</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                id={SCANNER_DIV_ID}
                className={scanMethod === "camera" ? "w-full min-h-[260px] rounded-lg overflow-hidden bg-black" : "absolute -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant={scanMethod === "camera" ? "default" : "outline"} size="sm" className="gap-2" onClick={() => { stopCamera(); startCamera(); }}>
                  <Camera className="w-4 h-4" /> كاميرا
                </Button>
                <Button variant={scanMethod === "file" ? "default" : "outline"} size="sm" className="gap-2" onClick={() => { stopCamera(); setScanMethod("file"); fileInputRef.current?.click(); }}>
                  <Upload className="w-4 h-4" /> رفع صورة
                </Button>
                <Button variant={scanMethod === "manual" ? "default" : "outline"} size="sm" className="gap-2" onClick={() => { stopCamera(); setScanMethod("manual"); }}>
                  <Keyboard className="w-4 h-4" /> إدخال يدوي
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileScan} />
              {scanMethod === "camera" && cameraError && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800 font-medium">فشل تشغيل الكاميرا</p>
                  <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => { setScanMethod("manual"); stopCamera(); }}>
                    <Keyboard className="w-3 h-3" /> استخدام الإدخال اليدوي
                  </Button>
                </div>
              )}
              {(scanMethod === "manual" || cameraError || scanMethod === "file") && (
                <form onSubmit={(e) => { e.preventDefault(); const v = manualInput.trim(); if (v) { handleScanResult(v); setManualInput(""); } }} className="space-y-3">
                  <Label>رقم الحالة أو الباركود</Label>
                  <div className="flex gap-2">
                    <Input value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="L-2026-00001" className="font-mono" autoFocus />
                    <Button type="submit" disabled={!manualInput.trim()}>فتح</Button>
                  </div>
                </form>
              )}
              {scanResult && <div className="p-3 rounded-lg bg-green-50 border border-green-200"><p className="text-sm font-medium text-green-800">آخر مسح: {scanResult}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── توليد ─────────────────────────────────── */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>توليد وحفظ ملصق</CardTitle>
              <p className="text-sm text-muted-foreground">الاسم، التواريخ، وحفظ للتعديل لاحقاً</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Button variant={genMode === "form" ? "default" : "outline"} size="sm" onClick={() => { setGenMode("form"); setSelectedCase(null); setGenBarcodeValue(""); }}>
                  إدخال يدوي
                </Button>
                <Button variant={genMode === "case" ? "default" : "outline"} size="sm" onClick={() => { setGenMode("case"); setSelectedCase(null); }}>
                  من حالة
                </Button>
              </div>

              {genMode === "case" ? (
                <div className="space-y-3">
                  <Label>ابحث عن حالة</Label>
                  <Input value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} placeholder="رقم أو اسم مريض" className="font-mono" />
                  {caseResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                      {caseResults.slice(0, 6).map((c) => (
                        <button key={c.id} type="button" onClick={() => { selectCaseForGen(c); setCaseSearch(""); setCaseResults([]); }}
                          className="w-full text-right px-4 py-2 hover:bg-accent flex justify-between">
                          <span className="font-mono text-sm">{c.caseNumber}</span>
                          <span className="text-sm text-muted-foreground">{c.patientName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCase && (
                    <div className="p-3 rounded-lg bg-primary/5 border space-y-1 text-sm">
                      <p><strong>{selectedCase.caseNumber}</strong> — {selectedCase.patientName}</p>
                      <p className="text-muted-foreground">الدكتور: {selectedCase.doctorName}</p>
                      {inventoryTx.length > 0 && <p className="text-muted-foreground"><Package className="inline w-3 h-3" /> {inventoryTx.map((t) => t.itemName).join("، ")}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Label>نص الباركود *</Label>
                  <Input value={genBarcodeValue} onChange={(e) => setGenBarcodeValue(e.target.value)} placeholder="L-2026-00001" className="font-mono mt-1" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>الاسم / الوصف</Label><Input value={genLabelName} onChange={(e) => setGenLabelName(e.target.value)} placeholder="اسم المريض" className="mt-1" /></div>
                <div><Label>اسم المريض</Label><Input value={genPatientName} onChange={(e) => setGenPatientName(e.target.value)} placeholder="للتوثيق" className="mt-1" /></div>
                <div><Label>اسم الدكتور</Label><Input value={genDoctorName} onChange={(e) => setGenDoctorName(e.target.value)} placeholder="من الاستقبال عند اختيار حالة" className="mt-1" /></div>
                <div><Label>تاريخ الاستلام</Label><Input type="date" value={genReceivedDate} onChange={(e) => setGenReceivedDate(e.target.value)} className="mt-1" /></div>
                <div><Label>تاريخ التسليم المتوقع</Label><Input type="date" value={genExpectedDate} onChange={(e) => setGenExpectedDate(e.target.value)} className="mt-1" /></div>
                <div><Label>تاريخ التسليم الفعلي</Label><Input type="date" value={genActualDate} onChange={(e) => setGenActualDate(e.target.value)} className="mt-1" /></div>
              </div>
              <div><Label>ملاحظات</Label><Input value={genNotes} onChange={(e) => setGenNotes(e.target.value)} placeholder="اختياري" className="mt-1" /></div>

              {effectiveBarcodeValue && (
                <>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-6 bg-gray-50 rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                      <BarcodeDisplay value={effectiveBarcodeValue} width={2} height={70} fontSize={14} />
                      <span className="text-xs text-muted-foreground">باركود</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <QRCodeDisplay value={effectiveBarcodeValue} size={120} level="M" />
                      <span className="text-xs text-muted-foreground">QR</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveLabel} className="gap-2"><Save className="w-4 h-4" /> حفظ في السجلات</Button>
                    <Button variant="outline" onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" /> طباعة</Button>
                    {selectedCase && <Link to={`/cases/${selectedCase.id}/print`}><Button variant="outline" className="gap-2">ملصق كامل</Button></Link>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── السجلات ───────────────────────────────── */}
        <TabsContent value="labels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الملصقات المحفوظة</CardTitle>
              <p className="text-sm text-muted-foreground">عرض، تعديل، وحذف</p>
            </CardHeader>
            <CardContent>
              {labelsLoading ? <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div> : labels.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">لا توجد ملصقات محفوظة</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2 font-medium">الباركود</th>
                        <th className="text-right py-2 font-medium">الاسم</th>
                        <th className="text-right py-2 font-medium">المريض</th>
                        <th className="text-right py-2 font-medium">الدكتور</th>
                        <th className="text-right py-2 font-medium">التواريخ</th>
                        <th className="text-right py-2 font-medium">التاريخ</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {labels.map((l) => (
                        <tr key={l.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 font-mono">{l.barcodeValue}</td>
                          <td className="py-2">{l.labelName || "—"}</td>
                          <td className="py-2">{l.patientName || "—"}</td>
                          <td className="py-2">{l.doctorName || "—"}</td>
                          <td className="py-2 text-muted-foreground text-xs">
                            {l.receivedDate && <span>استلام: {new Date(l.receivedDate).toLocaleDateString("ar-EG")}</span>}
                            {l.expectedDeliveryDate && <span> | تسليم: {new Date(l.expectedDeliveryDate).toLocaleDateString("ar-EG")}</span>}
                          </td>
                          <td className="py-2 text-muted-foreground text-xs">{new Date(l.createdAt).toLocaleDateString("ar-EG")}</td>
                          <td className="py-2">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteLabel(l.id)}><Trash2 className="w-4 h-4" /></Button>
                              {l.caseId && <Link to={`/cases/${l.caseId}`}><Button variant="ghost" size="sm"><LinkIcon className="w-4 h-4" /></Button></Link>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── سجل العمليات ─────────────────────────── */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>سجل عمليات الباركود</CardTitle>
              <p className="text-sm text-muted-foreground">كل المسح، التوليد، الطباعة، والتعديلات</p>
            </CardHeader>
            <CardContent>
              {logsLoading ? <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div> : logs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">لا توجد عمليات مسجلة</div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-right py-2 font-medium">التاريخ</th>
                        <th className="text-right py-2 font-medium">العملية</th>
                        <th className="text-right py-2 font-medium">القيمة</th>
                        <th className="text-right py-2 font-medium">الاسم</th>
                        <th className="text-right py-2 font-medium">المستخدم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b">
                          <td className="py-2 text-muted-foreground">{new Date(log.createdAt).toLocaleString("ar-EG")}</td>
                          <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-muted text-xs">{LOG_LABELS[log.action] || log.action}</span></td>
                          <td className="py-2 font-mono">{log.barcodeValue}</td>
                          <td className="py-2">{log.labelName || "—"}</td>
                          <td className="py-2 text-muted-foreground">{log.performedByName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {/* نافذة التعديل */}
      <Dialog open={!!editLabel} onOpenChange={(o) => !o && setEditLabel(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل الملصق</DialogTitle></DialogHeader>
          {editLabel && (
            <div className="space-y-4">
              <div><Label>نص الباركود</Label><Input value={editForm.barcodeValue || ""} onChange={(e) => setEditForm((f) => ({ ...f, barcodeValue: e.target.value }))} className="mt-1 font-mono" /></div>
              <div><Label>الاسم / الوصف</Label><Input value={editForm.labelName || ""} onChange={(e) => setEditForm((f) => ({ ...f, labelName: e.target.value }))} className="mt-1" /></div>
              <div><Label>اسم المريض</Label><Input value={editForm.patientName || ""} onChange={(e) => setEditForm((f) => ({ ...f, patientName: e.target.value }))} className="mt-1" /></div>
              <div><Label>اسم الدكتور</Label><Input value={editForm.doctorName || ""} onChange={(e) => setEditForm((f) => ({ ...f, doctorName: e.target.value }))} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>تاريخ الاستلام</Label><Input type="date" value={editForm.receivedDate || ""} onChange={(e) => setEditForm((f) => ({ ...f, receivedDate: e.target.value }))} className="mt-1" /></div>
                <div><Label>تاريخ التسليم</Label><Input type="date" value={editForm.expectedDeliveryDate || ""} onChange={(e) => setEditForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))} className="mt-1" /></div>
              </div>
              <div><Label>ملاحظات</Label><Input value={editForm.notes || ""} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLabel(null)}>إلغاء</Button>
            <Button onClick={saveEdit}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
