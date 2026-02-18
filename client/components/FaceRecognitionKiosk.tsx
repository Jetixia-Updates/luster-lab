/**
 * التعرف بالوجه - محطة البصمة
 */

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, Camera, Scan } from "lucide-react";
import { loadFaceModels, detectFaceDescriptor, findBestMatch } from "@/lib/faceApi";

interface UserWithFace {
  id: string;
  fullNameAr: string;
  faceDescriptor?: number[];
}

interface Props {
  users: UserWithFace[];
  onPunch: (userId: string) => Promise<void>;
  result: { action: string; userName: string; time: string } | null;
  error: string;
  loading: boolean;
}

const FACE_THRESHOLD = 0.7;
const SCAN_INTERVAL_MS = 800;
const COOLDOWN_MS = 4000;

export default function FaceRecognitionKiosk({ users, onPunch, result, error, loading: parentLoading }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const lastPunchRef = useRef<number>(0);
  const faceUsers = users.filter((u) => u.faceDescriptor && u.faceDescriptor.length === 128);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setCameraError("فشل تحميل نماذج التعرف"));
  }, []);

  useEffect(() => {
    if (!modelsReady || !videoRef.current || faceUsers.length === 0 || parentLoading) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraError("لا يمكن الوصول للكاميرا"));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [modelsReady, faceUsers.length, parentLoading]);

  useEffect(() => {
    if (!modelsReady || !videoRef.current || faceUsers.length === 0 || parentLoading || cameraError) return;
    const video = videoRef.current;

    const run = async () => {
      if (Date.now() - lastPunchRef.current < COOLDOWN_MS) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;
      setScanning(true);
      try {
        const descriptor = await detectFaceDescriptor(video);
        if (descriptor) {
          const match = findBestMatch(descriptor, faceUsers, FACE_THRESHOLD);
          if (match) {
            lastPunchRef.current = Date.now();
            await onPunch(match.id);
          }
        }
      } catch (_) {}
      setScanning(false);
    };

    const id = setInterval(run, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [modelsReady, faceUsers, parentLoading, cameraError, onPunch]);

  if (faceUsers.length === 0) {
    return (
      <div className="text-center py-8 text-white/70">
        <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>لا يوجد موظفين مسجلين للتعرف بالوجه</p>
        <p className="text-sm mt-2">سجّل الوجه من إدارة المستخدمين</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-black/30 aspect-video max-w-lg mx-auto">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {!modelsReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white">جاري تحميل النماذج...</p>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-red-300">{cameraError}</p>
          </div>
        )}
        {modelsReady && !cameraError && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 text-white/90 text-sm">
            <Scan className={`w-4 h-4 ${scanning ? "animate-pulse" : ""}`} />
            {scanning ? "جاري المسح..." : "انظر للكاميرا مباشرة"}
          </div>
        )}
      </div>
      <p className="text-white/50 text-xs text-center mt-1">إضاءة جيدة + وجه مستقيم. إن لم يتعرّف أعد التسجيل من إدارة المستخدمين</p>

      {result && (
        <div className="p-4 rounded-2xl bg-green-500/90 text-white text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-2" />
          <p className="font-bold">{result.action}</p>
          <p>{result.userName}</p>
          <p className="text-sm opacity-90">{result.time}</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/90 text-white text-center">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
