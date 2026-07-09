import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { FormField } from "@/components/FormField";

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
      <form className="grid gap-4">
        <FormField label="Email" name="email" type="email" placeholder="tu@email.com" />
        <FormField label="Contrasena" name="password" type="password" placeholder="Tu contrasena" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-[#5d6959]">
            <input type="checkbox" className="size-4 rounded border-[#d9d4c7]" />
            Recordarme
          </label>
          <Link href="/forgot-password" className="font-semibold text-[#c75432]">
            Recuperar contrasena
          </Link>
        </div>
        <Link href="/dashboard" className="rounded-md bg-[#18201b] px-4 py-3 text-center font-semibold text-white hover:bg-[#2c372f]">
          Entrar al panel
        </Link>
      </form>
    </AuthCard>
  );
}
