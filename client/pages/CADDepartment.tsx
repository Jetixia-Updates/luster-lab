/**
 * CAD Design Department - Professional Dental CAD Workstation
 * ============================================================
 * Full-featured CAD workflow with:
 * - Interactive 3D tooth viewer (Three.js)
 * - Design stage pipeline
 * - Annotation & measurement tools
 * - Design versioning
 * - Technical parameters (margins, cement gap, wall thickness)
 * - Review & approval workflow
 */

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { Link } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html, PerspectiveCamera, Line } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { WORK_TYPE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  PenTool, Send, Play, CheckCircle, Eye, Clock, Monitor, MessageSquare,
  RotateCcw, ZoomIn, ZoomOut, Move, Ruler, Circle, Square, Layers,
  Save, FileUp, FileDown, GitBranch, ChevronRight, Settings2,
  Crosshair, Box, Triangle, Minus, Plus, AlertTriangle, Star,
  ArrowLeft, ArrowRight, Maximize2, Grid3x3, Target, Pencil,
  CheckCircle2, XCircle, History, Palette, BarChart3, Workflow,
} from "lucide-react";
import type { DentalCase, CADAnnotation, CADDesignStage, CADDesignVersion, CaseAttachment } from "@shared/api";
import {
  CAD_SOFTWARES,
  buildExportPackage,
  exportForSoftware,
} from "@shared/cadSoftwareIntegration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Constants ──────────────────────────────
const CAD_SOFTWARE = CAD_SOFTWARES.map((s) => ({
  id: s.id,
  name: s.name,
  icon: s.icon,
}));

const MARGIN_TYPES = [
  { id: "chamfer", name: "Chamfer", nameAr: "شامفر", desc: "الأكثر شيوعاً للزركونيا - ISO recommended" },
  { id: "shoulder", name: "Shoulder", nameAr: "كتف", desc: "للتيجان الخزفية الكاملة" },
  { id: "deep_chamfer", name: "Deep Chamfer", nameAr: "شامفر عميق", desc: "لتيجان e.max" },
  { id: "knife_edge", name: "Knife Edge", nameAr: "حافة السكين", desc: "للتيجان المعدنية" },
  { id: "feather_edge", name: "Feather Edge", nameAr: "حافة ريشة", desc: "الحد الأدنى من التحضير" },
  { id: "beveled_shoulder", name: "Beveled Shoulder", nameAr: "كتف مائل", desc: "للتيجان PFM" },
];

// ISO 12836 / FDI specs - work-type specific defaults (mm, µm, mm²)
const WORK_TYPE_PARAMS: Record<string, { wallThickness: number; cementGap: number; spacerThickness: number; connectorSize: number; marginType: string }> = {
  zirconia: { wallThickness: 0.6, cementGap: 30, spacerThickness: 40, connectorSize: 9, marginType: "chamfer" },
  emax: { wallThickness: 0.6, cementGap: 25, spacerThickness: 30, connectorSize: 7, marginType: "deep_chamfer" },
  pfm: { wallThickness: 0.5, cementGap: 25, spacerThickness: 30, connectorSize: 9, marginType: "beveled_shoulder" },
  implant: { wallThickness: 0.6, cementGap: 30, spacerThickness: 40, connectorSize: 12, marginType: "chamfer" },
  other: { wallThickness: 0.6, cementGap: 30, spacerThickness: 40, connectorSize: 9, marginType: "chamfer" },
};

// Parameter limits per ISO/FDI
const PARAM_LIMITS = {
  wallThickness: { min: 0.4, max: 2.0, warningMin: 0.5, unit: "mm" },
  cementGap: { min: 15, max: 80, warningMin: 20, warningMax: 50, unit: "µm" },
  spacerThickness: { min: 15, max: 100, warningMin: 20, warningMax: 60, unit: "µm" },
  connectorSize: { min: 6, max: 20, warningMin: 7, unit: "mm²" },
};

// View presets (camera position)
const VIEW_PRESETS = [
  { id: "occlusal", label: "إطباقي", pos: [0, 5, 0], target: [0, 0, 0] },
  { id: "buccal", label: "خدي", pos: [0, 0, 5], target: [0, 0, 0] },
  { id: "lingual", label: "لساني", pos: [0, 0, -5], target: [0, 0, 0] },
  { id: "mesial", label: "وسطي", pos: [5, 0, 0], target: [0, 0, 0] },
  { id: "distal", label: "وحشي", pos: [-5, 0, 0], target: [0, 0, 0] },
  { id: "iso", label: "45°", pos: [3.5, 3.5, 3.5], target: [0, 0, 0] },
];

const DESIGN_STAGES_TEMPLATE: Omit<CADDesignStage, "id" | "status">[] = [
  { name: "Scan Import", nameAr: "استيراد المسح الضوئي" },
  { name: "Die Trimming", nameAr: "تقليم الداي" },
  { name: "Margin Detection", nameAr: "تحديد خط الحافة" },
  { name: "Insert Direction", nameAr: "اتجاه الإدخال" },
  { name: "Wax-up / Design", nameAr: "التصميم / الواكس أب" },
  { name: "Anatomy Adjustment", nameAr: "ضبط التشريح" },
  { name: "Contact Points", nameAr: "نقاط التماس" },
  { name: "Occlusion Check", nameAr: "فحص الإطباق" },
  { name: "Connector Design", nameAr: "تصميم الموصلات" },
  { name: "Thickness Check", nameAr: "فحص السمك" },
  { name: "Final Review", nameAr: "المراجعة النهائية" },
  { name: "Export STL", nameAr: "تصدير STL" },
];

const INSERT_DIRECTIONS = [
  { id: "occlusal", nameAr: "إطباقي (من الأعلى)" },
  { id: "buccal", nameAr: "خدي" },
  { id: "lingual", nameAr: "لساني" },
  { id: "mesial", nameAr: "وسطي" },
  { id: "distal", nameAr: "وحشي" },
];

const OCCLUSION_TYPES = [
  { id: "centric", nameAr: "إطباق مركزي" },
  { id: "lateral", nameAr: "إطباق جانبي" },
  { id: "protrusive", nameAr: "إطباق أمامي" },
];

const ANNOTATION_TYPES = [
  { id: "measurement", label: "قياس", icon: Ruler, color: "#3b82f6" },
  { id: "margin_line", label: "خط الحافة", icon: Circle, color: "#ef4444" },
  { id: "contact_point", label: "نقطة تماس", icon: Target, color: "#22c55e" },
  { id: "occlusion", label: "إطباق", icon: Layers, color: "#f59e0b" },
  { id: "thickness", label: "سمك", icon: Square, color: "#8b5cf6" },
  { id: "note", label: "ملاحظة", icon: MessageSquare, color: "#06b6d4" },
];

// ── STL/PLY/OBJ Loader - Real scan display ──
function LoadedMeshViewer({
  url,
  workType,
  onModelClick,
  isPickingEnabled,
}: {
  url: string;
  workType: string;
  onModelClick?: (point: { x: number; y: number; z: number }) => void;
  isPickingEnabled?: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = url.split(".").pop()?.toLowerCase() || "";

  useEffect(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;

    const load = async () => {
      try {
        if (ext === "stl") {
          const loader = new STLLoader();
          const geo = await loader.loadAsync(url);
          if (!cancelled) setGeometry(geo);
        } else if (ext === "ply") {
          const loader = new PLYLoader();
          const geo = await loader.loadAsync(url);
          if (!cancelled) setGeometry(geo);
        } else if (ext === "obj") {
          const loader = new OBJLoader();
          const obj = await loader.loadAsync(url);
          if (!cancelled && obj) {
            let firstGeo: THREE.BufferGeometry | null = null;
            (obj as THREE.Group).traverse((c) => {
              if (!firstGeo && c instanceof THREE.Mesh && c.geometry) firstGeo = c.geometry;
            });
            if (firstGeo) setGeometry(firstGeo);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "خطأ في تحميل الملف");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [url, ext]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (isPickingEnabled && onModelClick) {
      const p = e.point;
      if (p) onModelClick({ x: p.x, y: p.y, z: p.z });
    }
  };

  const getMaterial = () => {
    const base = workType === "emax" ? "#ede8df" : workType === "pfm" ? "#d4cfc5" : "#f5f0e8";
    return (
      <meshPhysicalMaterial
        color={base}
        roughness={0.2}
        metalness={workType === "pfm" ? 0.3 : 0.05}
        clearcoat={0.8}
        clearcoatRoughness={0.2}
        transparent={workType === "emax"}
        opacity={workType === "emax" ? 0.95 : 1}
      />
    );
  };

  if (loading) return null;
  if (error) return null;
  if (!geometry) return null;

  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? 3 / maxDim : 1;
  const center = new THREE.Vector3();
  box.getCenter(center);

  return (
    <group ref={meshRef} scale={scale} position={[-center.x * scale, -center.y * scale, -center.z * scale]}>
      <mesh geometry={geometry} onPointerDown={handlePointerDown} castShadow receiveShadow>
        {getMaterial()}
      </mesh>
    </group>
  );
}

// ── Measurement line between two points ──
function MeasurementLine({ p1, p2, scaleToMm = 10 }: { p1: THREE.Vector3; p2: THREE.Vector3; scaleToMm?: number }) {
  const distance = p1.distanceTo(p2);
  const distMm = distance * scaleToMm;
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

  return (
    <group>
      <Line points={[p1, p2]} color="#3b82f6" lineWidth={2} />
      <mesh position={[mid.x, mid.y + 0.1, mid.z]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <Html position={[mid.x, mid.y + 0.4, mid.z]} center>
        <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-mono font-bold whitespace-nowrap shadow-lg">
          {distMm.toFixed(2)} mm
        </div>
      </Html>
    </group>
  );
}

// ── 3D Tooth Model Component ───────────────
function ToothModel({
  toothNumbers,
  workType,
  annotations,
  onModelClick,
  activeTool,
  isPickingEnabled,
}: {
  toothNumbers: string;
  workType: string;
  annotations: CADAnnotation[];
  onModelClick?: (point: { x: number; y: number; z: number }) => void;
  activeTool?: string;
  isPickingEnabled?: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && !isPickingEnabled) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (isPickingEnabled && onModelClick && activeTool && activeTool !== "select") {
      const p = e.point;
      if (p) onModelClick({ x: p.x, y: p.y, z: p.z });
    }
  };

  // Parse tooth numbers
  const teeth = toothNumbers.split(",").map(t => t.trim());
  const isFull = toothNumbers.toLowerCase().includes("full");

  // Generate tooth geometry based on type
  const getToothColor = () => {
    switch (workType) {
      case "zirconia": return "#f5f0e8";
      case "emax": return "#ede8df";
      case "pfm": return "#d4cfc5";
      case "implant": return "#c8c3b8";
      default: return "#e8e3d8";
    }
  };

  return (
    <group ref={meshRef} onPointerDown={handlePointerDown}>
      {/* Base Plate / Die */}
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 2.8, 0.4, 32]} />
        <meshStandardMaterial color="#8a8578" roughness={0.7} />
      </mesh>

      {/* Gingiva / Gum */}
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[2.2, 2.5, 0.6, 32]} />
        <meshStandardMaterial color="#e8a0a0" roughness={0.5} transparent opacity={0.7} />
      </mesh>

      {/* Tooth Crowns */}
      {(isFull ? Array.from({ length: 6 }, (_, i) => i) : teeth).map((_, idx) => {
        const angle = isFull
          ? (idx / 6) * Math.PI - Math.PI / 2
          : teeth.length === 1 ? 0
          : (idx / (teeth.length - 1) - 0.5) * Math.PI * 0.6;
        const radius = isFull ? 1.5 : 0.8 * teeth.length;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius * 0.3;

        return (
          <group key={idx} position={[x, 0, z]}>
            {/* Root */}
            <mesh position={[0, -0.6, 0]}>
              <coneGeometry args={[0.25, 0.8, 8]} />
              <meshStandardMaterial color="#d4c8a8" roughness={0.6} />
            </mesh>
            {/* Crown */}
            <mesh
              position={[0, 0.3, 0]}
              castShadow
              onPointerOver={() => setHovered(true)}
              onPointerOut={() => setHovered(false)}
            >
              <capsuleGeometry args={[0.3, 0.5, 8, 16]} />
              <meshPhysicalMaterial
                color={hovered ? "#a8d8f0" : getToothColor()}
                roughness={0.2}
                metalness={workType === "pfm" ? 0.3 : 0.05}
                clearcoat={0.8}
                clearcoatRoughness={0.2}
                transmission={workType === "emax" ? 0.15 : 0}
              />
            </mesh>
            {/* Margin Line Ring */}
            <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.32, 0.02, 8, 32]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
            </mesh>
          </group>
        );
      })}

    </group>
  );
}

function CameraPresetController({ preset }: { preset: string }) {
  const { camera } = useThree();
  useEffect(() => {
    const p = VIEW_PRESETS.find((x) => x.id === preset);
    if (p && camera) {
      camera.position.set(p.pos[0] as number, p.pos[1] as number, p.pos[2] as number);
      camera.lookAt((p.target as number[])[0], (p.target as number[])[1], (p.target as number[])[2]);
      camera.updateProjectionMatrix();
    }
  }, [preset, camera]);
  return null;
}

function ViewerScene({
  toothNumbers,
  workType,
  annotations,
  viewMode,
  onModelClick,
  activeTool,
  isPickingEnabled,
  viewPreset,
  meshUrl,
  measurePoint1,
  measurePoint2,
}: {
  toothNumbers: string;
  workType: string;
  annotations: CADAnnotation[];
  viewMode: string;
  onModelClick?: (point: { x: number; y: number; z: number }) => void;
  activeTool?: string;
  isPickingEnabled?: boolean;
  viewPreset?: string;
  meshUrl?: string | null;
  measurePoint1?: THREE.Vector3 | null;
  measurePoint2?: THREE.Vector3 | null;
}) {
  const hasMesh = meshUrl && (meshUrl.startsWith("blob:") || meshUrl.startsWith("http"));
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={45} />
      {viewPreset && <CameraPresetController preset={viewPreset} />}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 4, -5]} intensity={0.3} />
      <spotLight position={[0, 10, 0]} intensity={0.5} angle={0.5} />
      <Environment preset="studio" />
      {hasMesh ? (
        <Suspense fallback={null}>
          <LoadedMeshViewer
            url={meshUrl}
            workType={workType}
            onModelClick={onModelClick}
            isPickingEnabled={isPickingEnabled}
          />
        </Suspense>
      ) : (
        <ToothModel
          toothNumbers={toothNumbers}
          workType={workType}
          annotations={annotations}
          onModelClick={onModelClick}
          activeTool={activeTool}
          isPickingEnabled={isPickingEnabled}
        />
      )}
      {annotations.filter((a) => a.position).map((ann) => (
        ann.position && (
          <group key={ann.id} position={[ann.position.x, ann.position.y, ann.position.z]}>
            <mesh>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial
                color={ann.color || "#3b82f6"}
                emissive={ann.color || "#3b82f6"}
                emissiveIntensity={0.5}
              />
            </mesh>
            <Html distanceFactor={8} position={[0, 0.15, 0]}>
              <div className="bg-black/85 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                {ann.label}{ann.value ? `: ${ann.value}` : ""}
              </div>
            </Html>
          </group>
        )
      ))}
      {measurePoint1 && measurePoint2 && (
        <MeasurementLine p1={measurePoint1} p2={measurePoint2} />
      )}
      {measurePoint1 && !measurePoint2 && (
        <group position={[measurePoint1.x, measurePoint1.y, measurePoint1.z]}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
          <Html position={[0, 0.2, 0]} center>
            <div className="text-[10px] text-blue-600 font-bold">1</div>
          </Html>
        </group>
      )}
      <Grid
        args={[20, 20]}
        position={[0, -1.9, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#d1d5db"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={15}
        infiniteGrid
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={15}
        maxPolarAngle={Math.PI * 0.85}
      />
    </>
  );
}

// ── Stage Action Panel - تعليمات وإجراءات كل مرحلة ────────
function StageActionPanel({
  stageIndex,
  stageNameAr,
  designFiles,
  annotations,
  marginType,
  connectorSize,
  wallThickness,
  insertDirection,
  setInsertDirection,
  occlusionType,
  setOcclusionType,
  dieTrimHeight,
  setDieTrimHeight,
  onAddMarginAnnotation,
  onAddContactAnnotation,
  onAddThicknessAnnotation,
  onExportSTL,
  onCompleteStage,
  canComplete,
  onRejectStage,
}: {
  stageIndex: number;
  stageNameAr: string;
  designFiles: { fileName: string }[];
  annotations: CADAnnotation[];
  marginType: string;
  connectorSize: number;
  wallThickness: number;
  insertDirection: string;
  setInsertDirection: (v: string) => void;
  occlusionType: string;
  setOcclusionType: (v: string) => void;
  dieTrimHeight: number;
  setDieTrimHeight: (v: number) => void;
  onAddMarginAnnotation: () => void;
  onAddContactAnnotation: () => void;
  onAddThicknessAnnotation: () => void;
  onExportSTL: () => void;
  onCompleteStage: () => void;
  canComplete: boolean;
  onRejectStage: () => void;
}) {
  const marginCount = annotations.filter((a) => a.type === "margin_line").length;
  const contactCount = annotations.filter((a) => a.type === "contact_point").length;
  const thicknessCount = annotations.filter((a) => a.type === "thickness").length;

  const stagePanels: Record<number, React.ReactNode> = {
    0: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">ارفع ملفات المسح الضوئي STL/PLY/OBJ</p>
        {designFiles.length > 0 ? (
          <div className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> تم رفع {designFiles.length} ملف
          </div>
        ) : (
          <p className="text-[10px] text-amber-600">يُفضّل رفع ملف واحد على الأقل للمتابعة</p>
        )}
      </div>
    ),
    1: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">حدد ارتفاع تقليم الداي (mm)</p>
        <Input
          type="number"
          value={dieTrimHeight}
          onChange={(e) => setDieTrimHeight(+e.target.value)}
          min={0.5}
          max={3}
          step={0.1}
          className="h-7 text-xs"
        />
        <p className="text-[10px] text-muted-foreground">القيمة الافتراضية 1.0mm</p>
      </div>
    ),
    2: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">أضف علامات خط الحافة على النموذج</p>
        <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={onAddMarginAnnotation}>
          <Circle className="w-3 h-3" /> إضافة خط حافة
        </Button>
        {marginCount > 0 && (
          <p className="text-[10px] text-green-600">{marginCount} علامة حافة</p>
        )}
      </div>
    ),
    3: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">اختر اتجاه الإدخال</p>
        <Select value={insertDirection} onValueChange={setInsertDirection}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {INSERT_DIRECTIONS.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    4: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">مرحلة التصميم الرئيسية - استخدم الأدوات للنموذج</p>
        <p className="text-[10px] text-muted-foreground">القياس، الحافة، التماس، السمك</p>
      </div>
    ),
    5: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">ضبط التشريح والتضاريس</p>
        <p className="text-[10px] text-muted-foreground">راجع الشكل النهائي في النموذج</p>
      </div>
    ),
    6: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">حدد نقاط التماس مع الأسنان المجاورة</p>
        <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={onAddContactAnnotation}>
          <Target className="w-3 h-3" /> إضافة نقطة تماس
        </Button>
        {contactCount > 0 && (
          <p className="text-[10px] text-green-600">{contactCount} نقطة تماس</p>
        )}
      </div>
    ),
    7: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">اختر نوع الإطباق</p>
        <Select value={occlusionType} onValueChange={setOcclusionType}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OCCLUSION_TYPES.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.nameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    8: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">حجم الموصل الحالي: {connectorSize} mm²</p>
        <p className="text-[10px] text-muted-foreground">يُفضّل ≥7 للخلفي، ≥9 للأمامي</p>
      </div>
    ),
    9: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">أضف قياسات السمك</p>
        <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={onAddThicknessAnnotation}>
          <Square className="w-3 h-3" /> إضافة قياس سمك
        </Button>
        {thicknessCount > 0 && (
          <p className="text-[10px] text-green-600">{thicknessCount} قياس</p>
        )}
        <p className="text-[10px] text-muted-foreground">الحد الأدنى: {wallThickness}mm</p>
      </div>
    ),
    10: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">المراجعة النهائية</p>
        <div className="text-[10px] space-y-0.5">
          <p>الحافة: {marginType} ✓</p>
          <p>السمك: {wallThickness}mm ✓</p>
          <p>الموصل: {connectorSize}mm² ✓</p>
        </div>
      </div>
    ),
    11: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">صدّر الملفات لبرنامج التصميم أو CAM</p>
        <Button size="sm" className="w-full h-7 text-xs gap-1 bg-green-600" onClick={onExportSTL}>
          <FileDown className="w-3 h-3" /> تصدير STL
        </Button>
      </div>
    ),
  };

  const content = stagePanels[stageIndex];

  return (
    <div className="bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg max-w-[240px] border">
      <p className="text-[10px] text-gray-500 mb-1">المرحلة {stageIndex + 1}/12</p>
      <p className="text-sm font-bold text-blue-700 mb-2">{stageNameAr}</p>
      {content}
      <div className="flex gap-1 mt-3">
        <Button size="sm" className="flex-1 h-7 text-xs gap-0.5" onClick={onCompleteStage} disabled={!canComplete}>
          <CheckCircle className="w-3 h-3" /> إتمام
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-red-600 border-red-300" onClick={onRejectStage}>
          <XCircle className="w-3 h-3" /> رفض
        </Button>
      </div>
    </div>
  );
}

// ── Design Stage Pipeline Component ────────
function StagePipeline({ stages, currentStage, onStageClick, onStageComplete }: {
  stages: CADDesignStage[];
  currentStage: string;
  onStageClick: (stageId: string) => void;
  onStageComplete: (stageId: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {stages.map((stage, idx) => {
        const isActive = stage.id === currentStage;
        const isCompleted = stage.status === "completed";
        const isRejected = stage.status === "rejected";
        const isPending = stage.status === "pending";
        const isInProgress = stage.status === "in_progress";

        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => onStageClick(stage.id)}
              className={`flex flex-col items-center px-2 py-1.5 rounded-lg text-[10px] min-w-[70px] transition-all border ${
                isActive ? "bg-blue-100 border-blue-400 shadow-md scale-105" :
                isCompleted ? "bg-green-50 border-green-300" :
                isRejected ? "bg-red-50 border-red-300" :
                isInProgress ? "bg-amber-50 border-amber-300" :
                "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold mb-0.5 ${
                isCompleted ? "bg-green-500" :
                isRejected ? "bg-red-500" :
                isInProgress ? "bg-amber-500" :
                isActive ? "bg-blue-500" : "bg-gray-300"
              }`}>
                {isCompleted ? "✓" : isRejected ? "✗" : idx + 1}
              </div>
              <span className={`text-center leading-tight ${isActive ? "font-bold text-blue-700" : ""}`}>
                {stage.nameAr}
              </span>
              {isInProgress && (
                <span className="text-[8px] text-amber-600 mt-0.5">جارٍ...</span>
              )}
            </button>
            {idx < stages.length - 1 && (
              <ChevronRight className={`w-3 h-3 mx-0.5 flex-shrink-0 ${isCompleted ? "text-green-400" : "text-gray-300"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────
export default function CADDepartment() {
  const { user } = useAuth();
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<DentalCase | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "workspace">("list");
  const [activeTab, setActiveTab] = useState("cases");

  // Workspace state
  const [activeTool, setActiveTool] = useState<string>("select");
  const [annotations, setAnnotations] = useState<CADAnnotation[]>([]);
  const [designStages, setDesignStages] = useState<CADDesignStage[]>([]);
  const [currentStageId, setCurrentStageId] = useState("");
  const [versions, setVersions] = useState<CADDesignVersion[]>([]);
  const [showParamsPanel, setShowParamsPanel] = useState(true);
  const [viewPreset, setViewPreset] = useState("iso");
  const [pendingAnnotationPosition, setPendingAnnotationPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [designFiles, setDesignFiles] = useState<CaseAttachment[]>([]);
  const [measurePoint1, setMeasurePoint1] = useState<THREE.Vector3 | null>(null);
  const [measurePoint2, setMeasurePoint2] = useState<THREE.Vector3 | null>(null);
  const [insertDirection, setInsertDirection] = useState("occlusal");
  const [occlusionType, setOcclusionType] = useState("centric");
  const [dieTrimHeight, setDieTrimHeight] = useState(1.0);

  // Design parameters
  const [software, setSoftware] = useState(() => {
    try {
      return localStorage.getItem("luster_default_cad_software") || "exocad";
    } catch {
      return "exocad";
    }
  });
  const [marginType, setMarginType] = useState("chamfer");
  const [cementGap, setCementGap] = useState(30);
  const [spacerThickness, setSpacerThickness] = useState(40);
  const [wallThickness, setWallThickness] = useState(0.6);
  const [connectorSize, setConnectorSize] = useState(9);
  const [designNotes, setDesignNotes] = useState("");

  // Dialogs
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [annotationType, setAnnotationType] = useState("measurement");
  const [annotationLabel, setAnnotationLabel] = useState("");
  const [annotationValue, setAnnotationValue] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");

  useEffect(() => { loadCases(); }, []);

  const loadCases = () => {
    api.get<any>("/cases?status=cad_design")
      .then((r) => setCases(r.data || []))
      .finally(() => setLoading(false));
  };

  const openWorkspace = (c: DentalCase) => {
    setSelectedCase(c);
    setViewMode("workspace");

    // Initialize design stages
    const existingStages = c.cadData?.designStages || [];
    if (existingStages.length === 0) {
      const newStages: CADDesignStage[] = DESIGN_STAGES_TEMPLATE.map((s, i) => ({
        ...s,
        id: `stage_${i}`,
        status: i === 0 ? "in_progress" as const : "pending" as const,
      }));
      setDesignStages(newStages);
      setCurrentStageId("stage_0");
    } else {
      setDesignStages(existingStages);
      setCurrentStageId(c.cadData?.currentStage || existingStages[0]?.id || "");
    }

    // Load existing data or apply work-type defaults (ISO/FDI specs)
    const params = WORK_TYPE_PARAMS[c.workType] || WORK_TYPE_PARAMS.other;
    setAnnotations(c.cadData?.annotations || []);
    setVersions(c.cadData?.versions || []);
    setDesignFiles(c.cadData?.designFiles || []);
    setSoftware(c.cadData?.software || "exocad");
    setMarginType(c.cadData?.marginType || params.marginType);
    setCementGap(c.cadData?.cementGap ?? params.cementGap);
    setSpacerThickness(c.cadData?.spacerThickness ?? params.spacerThickness);
    setWallThickness(c.cadData?.wallThickness ?? params.wallThickness);
    setConnectorSize(c.cadData?.connectorSize ?? params.connectorSize);
    setDesignNotes(c.cadData?.notes || "");
    setInsertDirection((c.cadData as any)?.insertDirection || "occlusal");
    setOcclusionType((c.cadData as any)?.occlusionType || "centric");
    setDieTrimHeight((c.cadData as any)?.dieTrimHeight ?? 1.0);
  };

  const saveDesign = async () => {
    if (!selectedCase) return;
    try {
      await api.put<any>(`/cases/${selectedCase.id}/cad`, {
        designerId: user?.id,
        designerName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        software,
        notes: designNotes,
        designStages,
        currentStage: currentStageId,
        annotations,
        versions,
        designFiles,
        marginType,
        cementGap,
        spacerThickness,
        wallThickness,
        connectorSize,
        insertDirection,
        occlusionType,
        dieTrimHeight,
        startTime: selectedCase.cadData?.startTime || new Date().toISOString(),
      });
      toast.success("تم حفظ التصميم بنجاح");
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const completeStage = (stageId: string) => {
    setDesignStages(prev => {
      const updated = prev.map((s, i, arr) => {
        if (s.id === stageId) return { ...s, status: "completed" as const, endTime: new Date().toISOString() };
        const prevIdx = arr.findIndex(x => x.id === stageId);
        if (i === prevIdx + 1 && (s.status === "pending" || s.status === "rejected")) {
          return { ...s, status: "in_progress" as const, startTime: new Date().toISOString() };
        }
        return s;
      });
      const nextIdx = updated.findIndex(s => s.status === "in_progress");
      if (nextIdx >= 0) setCurrentStageId(updated[nextIdx].id);
      return updated;
    });
    toast.success("تم إتمام المرحلة");
  };

  const rejectStage = (stageId: string) => {
    setDesignStages(prev => {
      const idx = prev.findIndex(s => s.id === stageId);
      const updated = prev.map((s) => {
        if (s.id === stageId) return { ...s, status: "rejected" as const };
        return s;
      });
      // Activate previous stage
      if (idx > 0) {
        updated[idx - 1] = { ...updated[idx - 1], status: "in_progress" as const, startTime: new Date().toISOString() };
        setCurrentStageId(updated[idx - 1].id);
      }
      return updated;
    });
    toast.warning("تم رفض المرحلة - العودة للمرحلة السابقة");
  };

  const handleModelClick = (point: { x: number; y: number; z: number }) => {
    const v = new THREE.Vector3(point.x, point.y, point.z);

    if (activeTool === "measure") {
      if (!measurePoint1) {
        setMeasurePoint1(v);
        setMeasurePoint2(null);
        toast.success("النقطة الأولى - انقر للنقطة الثانية");
      } else {
        const dist = measurePoint1.distanceTo(v);
        const distMm = (dist * 10).toFixed(2);
        setMeasurePoint2(v);
        setAnnotations((prev) => [
          ...prev,
          {
            id: `ann_${Date.now()}`,
            type: "measurement" as const,
            label: "قياس",
            value: `${distMm} mm`,
            position: point,
            color: "#3b82f6",
            createdAt: new Date().toISOString(),
            createdBy: user?.id || "",
          },
        ]);
        toast.success(`تم القياس: ${distMm} mm`);
        setTimeout(() => {
          setMeasurePoint1(null);
          setMeasurePoint2(null);
        }, 100);
      }
      return;
    }

    setPendingAnnotationPosition(point);
    setShowAnnotationDialog(true);
    toast.success("اختر نوع العلامة وأدخل الوصف");
  };

  const addAnnotation = () => {
    if (!annotationLabel) return;
    const annColor = ANNOTATION_TYPES.find(a => a.id === annotationType)?.color || "#3b82f6";
    const pos = pendingAnnotationPosition || {
      x: (Math.random() - 0.5) * 2,
      y: Math.random() * 1.5,
      z: (Math.random() - 0.5) * 1,
    };
    const newAnn: CADAnnotation = {
      id: `ann_${Date.now()}`,
      type: annotationType as any,
      label: annotationLabel,
      value: annotationValue || undefined,
      position: pos,
      color: annColor,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || "",
    };
    setAnnotations(prev => [...prev, newAnn]);
    setShowAnnotationDialog(false);
    setAnnotationLabel("");
    setAnnotationValue("");
    setPendingAnnotationPosition(null);
    toast.success("تم إضافة العلامة");
  };

  const handleExportForSoftware = async (softwareId: string) => {
    if (!selectedCase) return;
    try {
      const pkg = buildExportPackage(selectedCase, designFiles, {
        marginType,
        cementGap,
        spacerThickness,
        wallThickness,
        connectorSize,
      });
      const result = await exportForSoftware(pkg, softwareId);
      toast.success(result.message);
    } catch (err: any) {
      toast.error(err?.message || "خطأ في التصدير");
    }
  };

  const saveVersion = () => {
    const newVer: CADDesignVersion = {
      id: `ver_${Date.now()}`,
      version: versions.length + 1,
      label: versionLabel || `إصدار ${versions.length + 1}`,
      files: [],
      annotations: [...annotations],
      createdAt: new Date().toISOString(),
      createdBy: user?.id || "",
      notes: versionNotes,
    };
    setVersions(prev => [...prev, newVer]);
    setShowVersionDialog(false);
    setVersionLabel("");
    setVersionNotes("");
    toast.success(`تم حفظ الإصدار ${newVer.version}`);
  };

  const completeDesign = async () => {
    if (!selectedCase) return;
    try {
      await api.put<any>(`/cases/${selectedCase.id}/cad`, {
        designerId: user?.id,
        designerName: user?.fullNameAr || user?.fullName,
        status: "completed",
        software,
        notes: designNotes,
        designStages,
        currentStage: currentStageId,
        annotations,
        versions,
        designFiles,
        marginType,
        cementGap,
        spacerThickness,
        wallThickness,
        connectorSize,
        insertDirection,
        occlusionType,
        dieTrimHeight,
        endTime: new Date().toISOString(),
      });
      toast.success("تم إكمال التصميم بنجاح - جاهز للمراجعة");
      setViewMode("list");
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const transferToCAM = async (caseId: string) => {
    try {
      await api.post<any>(`/cases/${caseId}/transfer`, {
        toStatus: "cam_milling",
        notes: "CAD design completed & approved - transferred to CAM",
      });
      toast.success("تم تحويل الحالة لقسم التفريز");
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startDesign = async (c: DentalCase) => {
    try {
      await api.put<any>(`/cases/${c.id}/cad`, {
        designerId: user?.id,
        designerName: user?.fullNameAr || user?.fullName,
        status: "in_progress",
        software: "exocad",
        startTime: new Date().toISOString(),
        designFiles: [],
      });
      toast.success("تم بدء التصميم");
      loadCases();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getElapsed = (startTime?: string) => {
    if (!startTime) return null;
    const mins = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    if (mins < 60) return `${mins} دقيقة`;
    return `${Math.floor(mins / 60)} ساعة ${mins % 60} دقيقة`;
  };

  const completedStagesCount = designStages.filter(s => s.status === "completed").length;
  const progressPercent = designStages.length > 0 ? Math.round((completedStagesCount / designStages.length) * 100) : 0;

  const saveDesignRef = useRef(saveDesign);
  saveDesignRef.current = saveDesign;

  // Keyboard shortcuts (workspace): S=save, Esc=cancel, 1-6=tools
  useEffect(() => {
    if (viewMode !== "workspace") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        saveDesignRef.current();
      }
      if (e.key === "Escape") {
        setShowAnnotationDialog(false);
        setShowVersionDialog(false);
        setPendingAnnotationPosition(null);
        setMeasurePoint1(null);
        setMeasurePoint2(null);
      }
      if (e.key >= "1" && e.key <= "6") {
        const tools = ["select", "measure", "margin", "contact", "annotate", "thickness"];
        setActiveTool(tools[parseInt(e.key) - 1] || "select");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewMode]);

  // ── WORKSPACE VIEW ─────────────────────────
  if (viewMode === "workspace" && selectedCase) {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col gap-2">
        {/* Top Bar */}
        <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2 rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white hover:bg-gray-700"
              onClick={async () => {
                await saveDesign();
                setViewMode("list");
              }}
            >
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع
            </Button>
            <div className="h-6 w-px bg-gray-600" />
            <span className="font-mono text-sm text-blue-300">{selectedCase.caseNumber}</span>
            <Badge className="bg-purple-600 text-[10px]">{WORK_TYPE_LABELS[selectedCase.workType]?.ar}</Badge>
            <span className="text-xs text-gray-400">{selectedCase.patientName} | {selectedCase.doctorName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">التقدم:</span>
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[10px] text-green-400 font-bold">{progressPercent}%</span>
            <div className="h-6 w-px bg-gray-600" />
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700 gap-1 text-xs" onClick={saveDesign}>
              <Save className="w-3 h-3" /> حفظ
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700 gap-1 text-xs" onClick={() => setShowVersionDialog(true)}>
              <GitBranch className="w-3 h-3" /> إصدار
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700 gap-1 text-xs">
                  <FileDown className="w-3 h-3" /> تصدير
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                {CAD_SOFTWARES.filter((s) => s.id !== "other").map((sw) => (
                  <DropdownMenuItem key={sw.id} onClick={() => handleExportForSoftware(sw.id)}>
                    <span className="mr-2">{sw.icon}</span>
                    تصدير لـ {sw.nameAr}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => handleExportForSoftware("other")}>
                  <span className="mr-2">📁</span>
                  تصدير عام (STL/JSON)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {completedStagesCount === designStages.length && designStages.length > 0 && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1 text-xs" onClick={completeDesign}>
                <CheckCircle className="w-3 h-3" /> إنهاء التصميم
              </Button>
            )}
          </div>
        </div>

        {/* Stage Pipeline */}
        <Card className="p-2">
          <StagePipeline
            stages={designStages}
            currentStage={currentStageId}
            onStageClick={setCurrentStageId}
            onStageComplete={completeStage}
          />
        </Card>

        {/* Main workspace */}
        <div className="flex-1 flex gap-2 min-h-0">
          {/* Tools Panel (Right - vertical) */}
          <div className="w-12 bg-gray-900 rounded-lg flex flex-col items-center py-2 gap-1">
            {[
              { id: "select", icon: Crosshair, label: "تحديد" },
              { id: "measure", icon: Ruler, label: "قياس" },
              { id: "margin", icon: Circle, label: "حافة" },
              { id: "contact", icon: Target, label: "تماس" },
              { id: "annotate", icon: Pencil, label: "تعليق" },
              { id: "thickness", icon: Layers, label: "سمك" },
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.id !== "select") {
                    setAnnotationType(
                      tool.id === "measure" ? "measurement" :
                      tool.id === "margin" ? "margin_line" :
                      tool.id === "contact" ? "contact_point" :
                      tool.id === "annotate" ? "note" : "thickness"
                    );
                  }
                }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  activeTool === tool.id ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
                title={tool.label}
              >
                <tool.icon className="w-4 h-4" />
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => setShowParamsPanel(!showParamsPanel)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${showParamsPanel ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-700"}`}
              title="معاملات التصميم"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          {/* 3D Viewer (Center) */}
          <div className="flex-1 rounded-lg overflow-hidden border-2 border-gray-800 bg-gradient-to-b from-gray-100 to-gray-200 relative">
            <Canvas shadows>
              <Suspense fallback={null}>
                <ViewerScene
                  toothNumbers={selectedCase.teethNumbers}
                  workType={selectedCase.workType}
                  annotations={annotations}
                  viewMode="design"
                  onModelClick={handleModelClick}
                  activeTool={activeTool}
                  isPickingEnabled={activeTool !== "select"}
                  viewPreset={viewPreset}
                  meshUrl={designFiles.find((f) => /\.(stl|ply|obj)$/i.test(f.fileName))?.fileUrl}
                  measurePoint1={measurePoint1}
                  measurePoint2={measurePoint2}
                />
              </Suspense>
            </Canvas>

            {/* View preset buttons */}
            <div className="absolute bottom-3 right-3 flex gap-1 flex-wrap max-w-[320px]">
              {VIEW_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setViewPreset(p.id)}
                  className={`px-2 py-1 rounded text-[10px] transition-all ${
                    viewPreset === p.id ? "bg-blue-600 text-white" : "bg-white/90 hover:bg-white text-gray-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Overlay controls */}
            <div className="absolute top-3 left-3 flex gap-1">
              <Badge className="bg-black/70 text-white text-[10px] gap-1">
                <Box className="w-3 h-3" /> {selectedCase.workType.toUpperCase()}
              </Badge>
              <Badge className="bg-black/70 text-white text-[10px] gap-1">
                🦷 {selectedCase.teethNumbers}
              </Badge>
              <Badge className="bg-black/70 text-white text-[10px] gap-1">
                <Palette className="w-3 h-3" /> {selectedCase.shadeColor}
              </Badge>
            </div>

            <div className="absolute bottom-3 left-3 text-[10px] text-gray-500 bg-white/80 px-2 py-1 rounded max-w-[280px]">
              {activeTool !== "select"
                ? "انقر على النموذج لوضع العلامة | اسحب: تدوير"
                : "اسحب: تدوير | Scroll: تقريب | Shift+سحب: تحريك"}
              {" | "}
              <span className="text-blue-600">S</span> حفظ
            </div>

            {/* Stage Action Panel - إجراءات المرحلة */}
            <div className="absolute top-3 right-3 z-10">
              <StageActionPanel
                stageIndex={parseInt(currentStageId.replace("stage_", ""), 10) || 0}
                stageNameAr={designStages.find((s) => s.id === currentStageId)?.nameAr || "-"}
                designFiles={designFiles}
                annotations={annotations}
                marginType={marginType}
                connectorSize={connectorSize}
                wallThickness={wallThickness}
                insertDirection={insertDirection}
                setInsertDirection={setInsertDirection}
                occlusionType={occlusionType}
                setOcclusionType={setOcclusionType}
                dieTrimHeight={dieTrimHeight}
                setDieTrimHeight={setDieTrimHeight}
                onAddMarginAnnotation={() => {
                  setAnnotationType("margin_line");
                  setActiveTool("margin");
                  toast.info("انقر على النموذج لتحديد موقع خط الحافة");
                }}
                onAddContactAnnotation={() => {
                  setAnnotationType("contact_point");
                  setActiveTool("contact");
                  toast.info("انقر على النموذج لتحديد موقع نقطة التماس");
                }}
                onAddThicknessAnnotation={() => {
                  setAnnotationType("thickness");
                  setActiveTool("thickness");
                  toast.info("انقر على النموذج لتحديد موقع قياس السمك");
                }}
                onExportSTL={() => handleExportForSoftware(software)}
                onCompleteStage={() => completeStage(currentStageId)}
                canComplete={!!designStages.find((s) => s.id === currentStageId && s.status === "in_progress")}
                onRejectStage={() => rejectStage(currentStageId)}
              />
            </div>
          </div>

          {/* Right Panel - Parameters & Annotations */}
          {showParamsPanel && (
            <div className="w-72 flex flex-col gap-2 overflow-y-auto">
              {/* Design Parameters */}
              <Card className="flex-shrink-0">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <Settings2 className="w-3 h-3" /> معاملات التصميم
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  <div>
                    <Label className="text-[10px]">برنامج التصميم</Label>
                    <Select value={software} onValueChange={setSoftware}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CAD_SOFTWARE.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="flex items-center gap-1">{s.icon} {s.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px]">نوع الحافة (Margin)</Label>
                    <Select value={marginType} onValueChange={setMarginType}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MARGIN_TYPES.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="text-xs">{m.nameAr} ({m.name})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {MARGIN_TYPES.find(m => m.id === marginType)?.desc}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Cement Gap (µm)</Label>
                      <Input type="number" value={cementGap} onChange={e => setCementGap(+e.target.value)}
                        className="h-7 text-xs" min={10} max={80} step={5} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Spacer (µm)</Label>
                      <Input type="number" value={spacerThickness} onChange={e => setSpacerThickness(+e.target.value)}
                        className="h-7 text-xs" min={20} max={100} step={5} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Wall Thickness (mm)</Label>
                      <Input type="number" value={wallThickness} onChange={e => setWallThickness(+e.target.value)}
                        className="h-7 text-xs" min={0.3} max={2.0} step={0.1} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Connector (mm²)</Label>
                      <Input type="number" value={connectorSize} onChange={e => setConnectorSize(+e.target.value)}
                        className="h-7 text-xs" min={6} max={16} step={0.5} />
                    </div>
                  </div>

                  {/* ISO/FDI parameter validation */}
                  <div className="bg-gray-50 rounded p-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-600">فحص المعاملات (ISO/FDI):</p>
                    {[
                      {
                        label: "سمك الجدار",
                        ok: wallThickness >= PARAM_LIMITS.wallThickness.warningMin,
                        val: `${wallThickness}mm`,
                        hint: `≥${PARAM_LIMITS.wallThickness.warningMin}mm`,
                      },
                      {
                        label: "Cement Gap",
                        ok: cementGap >= PARAM_LIMITS.cementGap.warningMin! && cementGap <= PARAM_LIMITS.cementGap.warningMax!,
                        val: `${cementGap}µm`,
                        hint: "20-50µm",
                      },
                      {
                        label: "Spacer",
                        ok: spacerThickness >= PARAM_LIMITS.spacerThickness.warningMin! && spacerThickness <= (PARAM_LIMITS.spacerThickness.warningMax ?? 100),
                        val: `${spacerThickness}µm`,
                        hint: "20-60µm",
                      },
                      {
                        label: "حجم الموصل",
                        ok: connectorSize >= PARAM_LIMITS.connectorSize.warningMin,
                        val: `${connectorSize}mm²`,
                        hint: `≥${PARAM_LIMITS.connectorSize.warningMin}mm²`,
                      },
                    ].map((check) => (
                      <div key={check.label} className="flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1">
                          {check.ok ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                          {check.label}
                        </span>
                        <span className={check.ok ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                          {check.val}
                          <span className="text-gray-400 font-normal mr-0.5">({check.hint})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Design Files (STL/PLY) */}
              <Card className="flex-shrink-0">
                <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <FileUp className="w-3 h-3" /> ملفات التصميم
                  </CardTitle>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".stl,.ply,.obj"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        const newFiles = Array.from(files).map((f) => ({
                          id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                          fileName: f.name,
                          fileType: f.name.split(".").pop() || "stl",
                          fileUrl: URL.createObjectURL(f),
                          uploadedAt: new Date().toISOString(),
                          uploadedBy: user?.id || "",
                        }));
                        setDesignFiles((prev) => [...prev, ...newFiles]);
                        toast.success(`تم رفع ${files.length} ملف`);
                        e.target.value = "";
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                      <span><Plus className="w-3 h-3" /></span>
                    </Button>
                  </label>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {designFiles.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">STL, PLY, OBJ</p>
                  ) : (
                    <div className="space-y-1 max-h-[80px] overflow-y-auto">
                      {designFiles.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-[10px] p-1.5 bg-gray-50 rounded">
                          <FileDown className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-1 truncate">{f.fileName}</span>
                          <button
                            onClick={() => setDesignFiles((prev) => prev.filter((x) => x.id !== f.id))}
                            className="text-red-400 hover:text-red-600"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Annotations List */}
              <Card className="flex-shrink-0">
                <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> العلامات ({annotations.length})
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowAnnotationDialog(true)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {annotations.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">لا توجد علامات</p>
                  ) : (
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {annotations.map(ann => (
                        <div key={ann.id} className="flex items-center gap-2 text-[10px] p-1.5 bg-gray-50 rounded">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ann.color }} />
                          <span className="flex-1 truncate">{ann.label}</span>
                          {ann.value && <span className="text-blue-600 font-mono font-bold">{ann.value}</span>}
                          <button onClick={() => setAnnotations(prev => prev.filter(a => a.id !== ann.id))} className="text-red-400 hover:text-red-600">
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Versions */}
              <Card className="flex-shrink-0">
                <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <History className="w-3 h-3" /> الإصدارات ({versions.length})
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowVersionDialog(true)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {versions.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">لا توجد إصدارات محفوظة</p>
                  ) : (
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {versions.map(ver => (
                        <div key={ver.id} className="flex items-center gap-2 text-[10px] p-1.5 bg-gray-50 rounded">
                          <Badge className="bg-blue-100 text-blue-700 text-[9px] h-4">v{ver.version}</Badge>
                          <span className="flex-1 truncate">{ver.label}</span>
                          <span className="text-gray-400">{ver.annotations.length} علامة</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="flex-shrink-0">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> ملاحظات التصميم
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <Textarea
                    value={designNotes}
                    onChange={e => setDesignNotes(e.target.value)}
                    placeholder="ملاحظات المصمم..."
                    className="text-xs min-h-[60px] resize-none"
                  />
                  {selectedCase.doctorNotes && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-[10px] text-blue-700">
                      <strong>ملاحظات الطبيب:</strong> {selectedCase.doctorNotes}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ── Dialogs ────────────────────────── */}
        {/* Add Annotation */}
        <Dialog open={showAnnotationDialog} onOpenChange={(open) => { setShowAnnotationDialog(open); if (!open) setPendingAnnotationPosition(null); }}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader><DialogTitle>إضافة علامة / قياس</DialogTitle></DialogHeader>
            {pendingAnnotationPosition && (
              <div className="text-[10px] text-green-600 bg-green-50 p-2 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> تم تحديد الموقع على النموذج
              </div>
            )}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">النوع</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {ANNOTATION_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setAnnotationType(type.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-all ${
                        annotationType === type.id ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <type.icon className="w-4 h-4" style={{ color: type.color }} />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">الوصف</Label>
                <Input value={annotationLabel} onChange={e => setAnnotationLabel(e.target.value)}
                  placeholder="مثال: سمك الجدار الدهليزي" className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">القيمة (اختياري)</Label>
                <Input value={annotationValue} onChange={e => setAnnotationValue(e.target.value)}
                  placeholder="مثال: 1.2mm" className="text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addAnnotation} className="gap-1" disabled={!annotationLabel}>
                <Plus className="w-4 h-4" /> إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Version */}
        <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader><DialogTitle>حفظ إصدار جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">اسم الإصدار</Label>
                <Input value={versionLabel} onChange={e => setVersionLabel(e.target.value)}
                  placeholder={`إصدار ${versions.length + 1}`} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">ملاحظات</Label>
                <Textarea value={versionNotes} onChange={e => setVersionNotes(e.target.value)}
                  placeholder="التغييرات في هذا الإصدار..." className="text-xs min-h-[60px]" />
              </div>
              <div className="bg-gray-50 p-2 rounded text-[10px] space-y-1">
                <p>سيتم حفظ: {annotations.length} علامة</p>
                <p>المرحلة: {designStages.find(s => s.id === currentStageId)?.nameAr}</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={saveVersion} className="gap-1">
                <GitBranch className="w-4 h-4" /> حفظ الإصدار
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="w-7 h-7 text-purple-600" />
            قسم التصميم CAD
          </h1>
          <p className="text-muted-foreground">محطة عمل التصميم الاحترافية لمعمل الأسنان</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "إجمالي الحالات", value: cases.length, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
          { label: "في الانتظار", value: cases.filter(c => !c.cadData || c.cadData.status === "pending").length, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
          { label: "قيد التصميم", value: cases.filter(c => c.cadData?.status === "in_progress").length, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "مكتمل", value: cases.filter(c => c.cadData?.status === "completed").length, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "عاجل", value: cases.filter(c => c.priority === "rush" || c.priority === "urgent").length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map(stat => (
          <Card key={stat.label} className={`border ${stat.bg}`}>
            <CardContent className="pt-3 pb-2 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="w-5 h-5 text-purple-600" />
            حالات التصميم
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <PenTool className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-400">لا توجد حالات في قسم التصميم</p>
              <p className="text-sm text-gray-400">الحالات المحولة من الاستقبال ستظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => {
                const cadStatus = c.cadData?.status;
                const stagesCount = c.cadData?.designStages?.length || 0;
                const completedCount = c.cadData?.designStages?.filter(s => s.status === "completed").length || 0;
                const progress = stagesCount > 0 ? Math.round((completedCount / stagesCount) * 100) : 0;

                return (
                  <div key={c.id} className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    c.priority === "rush" ? "border-red-200 bg-red-50/30" :
                    c.priority === "urgent" ? "border-amber-200 bg-amber-50/30" :
                    "border-gray-200 hover:border-purple-200"
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-purple-700 text-lg">{c.caseNumber}</span>
                        <Badge variant="outline" className="bg-white">{WORK_TYPE_LABELS[c.workType]?.ar}</Badge>
                        <Badge className={
                          c.priority === "rush" ? "bg-red-500 text-white" :
                          c.priority === "urgent" ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-700"
                        }>
                          {c.priority === "rush" ? "🔴 عاجل جداً" : c.priority === "urgent" ? "🟡 مستعجل" : "عادي"}
                        </Badge>
                        {cadStatus && (
                          <Badge variant="outline" className={
                            cadStatus === "completed" ? "bg-green-100 text-green-800 border-green-300" :
                            cadStatus === "in_progress" ? "bg-blue-100 text-blue-800 border-blue-300" :
                            "bg-gray-100 border-gray-300"
                          }>
                            {cadStatus === "completed" ? "✅ مكتمل" : cadStatus === "in_progress" ? "🔵 قيد التصميم" : "⏳ معلق"}
                          </Badge>
                        )}
                        {cadStatus === "in_progress" && c.cadData?.startTime && (
                          <Badge variant="outline" className="gap-1 text-[10px] text-blue-600 border-blue-200">
                            <Clock className="w-3 h-3" /> {getElapsed(c.cadData.startTime)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/cases/${c.id}`}>
                          <Button variant="ghost" size="sm" className="h-8"><Eye className="w-4 h-4" /></Button>
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div><span className="text-muted-foreground text-xs">المريض:</span> <span className="font-medium">{c.patientName}</span></div>
                      <div><span className="text-muted-foreground text-xs">الطبيب:</span> <span className="font-medium">{c.doctorName}</span></div>
                      <div><span className="text-muted-foreground text-xs">الأسنان:</span> <span className="font-mono font-bold">{c.teethNumbers}</span></div>
                      <div><span className="text-muted-foreground text-xs">اللون:</span> <span className="font-mono">{c.shadeColor}</span></div>
                    </div>

                    {c.doctorNotes && (
                      <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg mb-3 border border-blue-200">
                        💬 ملاحظات الطبيب: {c.doctorNotes}
                      </div>
                    )}

                    {/* Progress bar for in-progress */}
                    {cadStatus === "in_progress" && stagesCount > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                          <span>تقدم التصميم</span>
                          <span>{completedCount}/{stagesCount} مراحل ({progress}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {(!cadStatus || cadStatus === "pending") && (
                        <>
                          <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700" onClick={() => startDesign(c)}>
                            <Play className="w-3 h-3" /> بدء التصميم
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => openWorkspace(c)}>
                            <Monitor className="w-3 h-3" /> فتح محطة العمل
                          </Button>
                        </>
                      )}
                      {cadStatus === "in_progress" && (
                        <>
                          <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => openWorkspace(c)}>
                            <Monitor className="w-3 h-3" /> فتح محطة العمل
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-300" onClick={async () => {
                            await api.put<any>(`/cases/${c.id}/cad`, { ...c.cadData, status: "completed", endTime: new Date().toISOString() });
                            toast.success("تم إكمال التصميم"); loadCases();
                          }}>
                            <CheckCircle className="w-3 h-3" /> إنهاء سريع
                          </Button>
                        </>
                      )}
                      {cadStatus === "completed" && (
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => transferToCAM(c.id)}>
                          <Send className="w-3 h-3" /> تحويل للتفريز (CAM)
                        </Button>
                      )}
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
