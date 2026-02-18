/**
 * تسجيل دخول محطة البصمة - واجهة بسيطة للدخول من الخارج
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, User, Lock } from "lucide-react";

export default function KioskLogin() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("أدخل اسم المستخدم وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err?.message || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur mb-4">
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">محطة البصمة</h1>
          <p className="text-indigo-200 text-sm mt-1">تسجيل الدخول للتسجيل</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white/10 backdrop-blur rounded-2xl p-6">
          <div>
            <Label className="text-white/90 text-sm">اسم المستخدم</Label>
            <div className="relative mt-1">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="اسم المستخدم"
                className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-white/50"
                dir="ltr"
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label className="text-white/90 text-sm">كلمة المرور</Label>
            <div className="relative mt-1">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-white/50"
                dir="ltr"
              />
            </div>
          </div>

          {error && <p className="text-red-300 text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full h-12 text-lg bg-white text-indigo-800 hover:bg-indigo-50" disabled={loading}>
            {loading ? "جاري الدخول..." : "دخول"}
          </Button>

          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs text-white/60 text-center mb-2">حساب تجريبي:</p>
            <button
              type="button"
              onClick={() => { setUsername("biosma"); setPassword("biosma123"); }}
              className="w-full py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 text-sm"
            >
              محطة البصمة (biosma / biosma123)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
