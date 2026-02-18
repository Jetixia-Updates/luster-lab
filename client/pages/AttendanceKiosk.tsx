/**
 * محطة البصمة - واجهة كاملة الشاشة لتسجيل الحضور والانصراف
 * بصمة / رقم الموظف / التعرف بالوجه
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fingerprint, LogIn, LogOut, Users, CheckCircle, ScanFace } from "lucide-react";
import FaceRecognitionKiosk from "@/components/FaceRecognitionKiosk";

interface TodayStatus {
  userId: string;
  userName: string;
  fingerprintId?: string;
  present: boolean;
  isCurrentlyIn: boolean;
  checkIn: string | null;
  checkOut: string | null;
}

export default function AttendanceKiosk() {
  const [fingerprintId, setFingerprintId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ action: string; userName: string; time: string } | null>(null);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<{ id: string; fullNameAr: string; fingerprintId?: string; faceDescriptor?: number[] }[]>([]);
  const [todayStatus, setTodayStatus] = useState<TodayStatus[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadKioskData = () => {
    api.get<any>("/attendance/kiosk-data").then((r) => {
      const d = r?.data || r;
      setUsers(d.users || []);
      setTodayStatus(d.todayStatus || []);
    }).catch(() => {});
  };

  useEffect(() => {
    loadKioskData();
  }, []);

  const handlePunch = useCallback(async (idOrFingerprint: string) => {
    if (!idOrFingerprint.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post<any>("/attendance/punch", { fingerprintId: idOrFingerprint.trim() });
      const d = res.data || res;
      setResult({
        action: d.action === "checkIn" ? "حضور" : "انصراف",
        userName: d.userName || d.data?.userName,
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      });
      setFingerprintId("");
      loadKioskData();
      inputRef.current?.focus();
      setTimeout(() => setResult(null), 4000);
    } catch (e: any) {
      setError(e?.message || "فشل التسجيل");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePunch(fingerprintId);
  };

  return (
    <div className="min-h-dvh min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="absolute top-4 right-4 text-white/80 text-sm flex items-center gap-2">
        <span>{new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        <span className="font-mono text-lg">{new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      </div>

      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur mb-4">
            <Fingerprint className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">محطة البصمة</h1>
          <p className="text-indigo-200">رقم البصمة، اختيار سريع، أو التعرف بالوجه</p>
        </div>

        <Tabs defaultValue="fingerprint" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10">
            <TabsTrigger value="fingerprint" className="gap-2 data-[state=active]:bg-white/20">
              <Fingerprint className="w-4 h-4" /> بصمة / يدوي
            </TabsTrigger>
            <TabsTrigger value="face" className="gap-2 data-[state=active]:bg-white/20">
              <ScanFace className="w-4 h-4" /> التعرف بالوجه
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fingerprint" className="mt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              ref={inputRef}
              value={fingerprintId}
              onChange={(e) => setFingerprintId(e.target.value)}
              placeholder="رقم البصمة"
              className="h-16 text-2xl text-center font-mono bg-white/95 border-0"
              dir="ltr"
              autoFocus
              disabled={loading}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 mt-4 text-xl bg-white text-indigo-800 hover:bg-indigo-50"
              disabled={loading || !fingerprintId.trim()}
            >
              {loading ? (
                <span className="animate-pulse">جاري التسجيل...</span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Fingerprint className="w-6 h-6" />
                  تسجيل الحضور / الانصراف
                </span>
              )}
            </Button>
          </div>
        </form>

        {result && (
          <div className="mt-6 p-6 rounded-2xl bg-green-500/90 text-white text-center animate-in zoom-in duration-300">
            <CheckCircle className="w-16 h-16 mx-auto mb-2" />
            <p className="text-2xl font-bold">{result.action}</p>
            <p className="text-xl">{result.userName}</p>
            <p className="text-lg opacity-90">{result.time}</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/90 text-white text-center animate-in zoom-in duration-300">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/20">
          <p className="text-white/80 text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> اختيار سريع
          </p>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => {
              const status = todayStatus.find((s) => s.userId === u.id);
              const isIn = status?.isCurrentlyIn;
              return (
                <Button
                  key={u.id}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/25 hover:border-white/50"
                  onClick={() => handlePunch(u.fingerprintId || u.id)}
                  disabled={loading}
                >
                  <span className="flex items-center gap-2">
                    {isIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                    {u.fullNameAr}
                    <span className="text-xs opacity-75">({u.fingerprintId})</span>
                  </span>
                </Button>
              );
            })}
            {users.length === 0 && (
              <p className="text-white/60 text-sm">أضف رقم البصمة للموظفين من إدارة المستخدمين</p>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="face" className="mt-4">
            <FaceRecognitionKiosk
              users={users}
              onPunch={handlePunch}
              result={result}
              error={error}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>

      <a href="/attendance" className="absolute bottom-4 left-4 text-white/60 hover:text-white text-sm">
        ← لوحة الإدارة
      </a>
    </div>
  );
}
