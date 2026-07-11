import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Nueva contrasena"
      description="Introduce el token recibido y define una nueva contrasena para tu cuenta."
      footer={
        <>
          Ya tienes acceso?{" "}
          <Link href="/login" className="font-semibold text-[#c75432]">
            Entrar
          </Link>
        </>
      }
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
