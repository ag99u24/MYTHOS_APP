import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Introduce tu email y te enviaremos instrucciones para crear una nueva contraseña."
      footer={
        <>
          Ya la recuerdas?{" "}
          <Link href="/login" className="font-semibold text-[#c75432]">
            Volver a entrar
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
