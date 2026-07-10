import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Crear cuenta"
      description="Configura tu acceso como profesional o cliente para empezar a usar Mythos."
      footer={
        <>
          Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-[#c75432]">
            Entrar
          </Link>
        </>
      }
    >
      <Suspense fallback={<p className="text-sm text-[#5d6959]">Preparando formulario...</p>}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
