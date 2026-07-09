import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { FormField } from "@/components/FormField";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contrasena"
      description="Introduce tu email y te enviaremos instrucciones para crear una nueva contrasena."
      footer={
        <>
          Ya la recuerdas?{" "}
          <Link href="/login" className="font-semibold text-[#c75432]">
            Volver a entrar
          </Link>
        </>
      }
    >
      <form className="grid gap-4">
        <FormField label="Email" name="email" type="email" placeholder="tu@email.com" />
        <button type="button" className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f]">
          Enviar enlace
        </button>
      </form>
    </AuthCard>
  );
}
