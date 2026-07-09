import Link from "next/link";
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
      <LoginForm />
    </AuthCard>
  );
}
