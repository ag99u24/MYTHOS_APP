import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { FormField } from "@/components/FormField";

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
      <form className="grid gap-4">
        <FormField label="Nombre" name="name" placeholder="Alex Garcia" />
        <FormField label="Email" name="email" type="email" placeholder="tu@email.com" />
        <label className="grid gap-2 text-sm font-medium text-[#344036]">
          Tipo de cuenta
          <select name="role" className="h-12 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-base">
            <option value="professional">Profesional</option>
            <option value="client">Cliente</option>
          </select>
        </label>
        <FormField label="Contrasena" name="password" type="password" placeholder="Minimo 8 caracteres" />
        <Link href="/dashboard" className="rounded-md bg-[#18201b] px-4 py-3 text-center font-semibold text-white hover:bg-[#2c372f]">
          Crear cuenta
        </Link>
      </form>
    </AuthCard>
  );
}
