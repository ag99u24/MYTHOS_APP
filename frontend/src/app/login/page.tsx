import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthCard
      title="Entrar"
      description="Accede a tus clientes, planes y seguimiento desde tu panel de Mythos."
      footer={
        <>
          No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-[#c75432]">
            Crear cuenta
          </Link>
        </>
      }
    >
      <Suspense fallback={<p className="text-sm text-[#5d6959]">Preparando formulario...</p>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
