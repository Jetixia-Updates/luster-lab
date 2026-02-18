/**
 * Login Page - Professional authentication screen
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, User, Eye, EyeOff, Loader2, Fingerprint } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success("تم تسجيل الدخول بنجاح");
    } catch (err: any) {
      toast.error(err.message || "خطأ في اسم المستخدم أو كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      dir="rtl"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo1.png" alt="لاستر" className="inline-block w-24 h-24 object-contain mb-4 drop-shadow-2xl" />
          <h1 className="text-3xl font-bold text-white">Luster Dental Lab</h1>
          <p className="text-blue-200/70 mt-2 text-lg">نظام إدارة معمل لاستر لطب الأسنان</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-white">تسجيل الدخول</CardTitle>
            <p className="text-sm text-blue-200/60">أدخل بياناتك للوصول للنظام</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-blue-100">اسم المستخدم</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400/30"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-blue-100">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="admin123"
                    className="pr-10 pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-blue-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-l from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-semibold text-base shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "دخول"
                )}
              </Button>
            </form>

            {/* Kiosk link - دخول مباشر للموظفين */}
            <Link
              to="/attendance/kiosk"
              className="mt-4 flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/30 hover:text-white transition-colors text-sm"
            >
              <Fingerprint className="w-4 h-4" />
              محطة البصمة (دخول مباشر للموظفين)
            </Link>

            {/* Quick login hints */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-xs text-blue-200/40 text-center mb-3">حسابات تجريبية:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { user: "admin", pass: "admin123", label: "مدير النظام" },
                  { user: "reception1", pass: "pass123", label: "الاستقبال" },
                  { user: "designer1", pass: "pass123", label: "المصمم" },
                  { user: "tech1", pass: "pass123", label: "الفني" },
                  { user: "qc1", pass: "pass123", label: "الجودة" },
                  { user: "accountant1", pass: "pass123", label: "المحاسب" },
                  { user: "biosma", pass: "biosma123", label: "محطة البصمة" },
                ].map((acc) => (
                  <button
                    key={acc.user}
                    type="button"
                    onClick={() => { setUsername(acc.user); setPassword(acc.pass); }}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-blue-200/70 hover:bg-white/10 hover:text-white transition-colors text-center"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-blue-200/30 text-xs mt-6">
          Luster Dental Lab ERP v1.0 &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
