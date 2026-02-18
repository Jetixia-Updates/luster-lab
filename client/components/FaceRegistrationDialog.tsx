/**
 * تسجيل الوجه للموظف - التعرف بالوجه
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { loadFaceModels, detectFaceDescriptor } from "@/lib/faceApi";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userName: string;
  userId: string;
  onSaved: (descriptor: number[]) => void;
}

export default function FaceRegistrationDialog({ open, onOpenChange, userName, userId, onSaved }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadFaceModels()
      .then(() => setReady(true))
      .catch(() => toast.error("فشل تحميل النماذج"));
    return () => setReady(false);
  }, [open]);

  useEffect(() => {
    if (!open || !ready) return;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
      .then((s) => {
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => toast.error("لا يمكن الوصول للكاميرا"));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, ready]);

  const capture = async () => {
    if (!videoRef.current) return;
    setCapturing(true);
    try {
      const desc1 = await detectFaceDescriptor(videoRef.current);
      if (!desc1) {
        toast.error("لم يتم اكتشاف وجه. انظر للكاميرا مباشرة مع إضاءة جيدة");
        setCapturing(false);
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
      const desc2 = await detectFaceDescriptor(videoRef.current);
      const a1 = Array.from(desc1 as Float32Array);
      const avg = desc2
        ? a1.map((v, i) => (v + (desc2 as Float32Array)[i]) / 2)
        : a1;
      onSaved(avg);
      onOpenChange(false);
      toast.success("تم تسجيل الوجه بنجاح");
    } catch {
      toast.error("فشل التقاط الوجه");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl" aria-describedby="face-reg-desc">
        <DialogHeader>
          <DialogTitle>تسجيل الوجه - {userName}</DialogTitle>
          <DialogDescription id="face-reg-desc">انظر للكاميرا واضغط التقط لتسجيل الوجه للموظف</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          </div>
          <p className="text-sm text-muted-foreground">وجّه وجهك للكاميرا مباشرة مع إضاءة جيدة واضغط التقاط</p>
          <Button onClick={capture} disabled={!ready || capturing} className="w-full">
            {capturing ? "جاري التقاط..." : "التقط الوجه"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
