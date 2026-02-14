import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-6xl font-bold text-muted-foreground/30">404</h1>
      <p className="text-xl text-muted-foreground mt-4">الصفحة غير موجودة</p>
      <Link to="/" className="mt-6">
        <Button>العودة للرئيسية</Button>
      </Link>
    </div>
  );
}
