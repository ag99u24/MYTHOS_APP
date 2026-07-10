"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/session";

type PrivateRouteProps = {
  children: React.ReactNode;
};

export function PrivateRoute({ children }: PrivateRouteProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const token = getToken();

      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        setIsAllowed(false);
        setIsChecking(false);
        return;
      }

      setIsAllowed(true);
      setIsChecking(false);
    });
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-5 text-[#18201b]">
        <div className="rounded-lg border border-[#d9d4c7] bg-white p-5 text-center shadow-sm">
          <p className="font-semibold">Comprobando sesion</p>
          <p className="mt-2 text-sm text-[#5d6959]">Un momento.</p>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return children;
}
