import { AppShell } from "@/components/AppShell";
import { ProfileClient } from "./ProfileClient";

export default function ProfilePage() {
  return (
    <AppShell title="Perfil" description="Datos visibles del profesional y ajustes basicos de la cuenta.">
      <ProfileClient />
    </AppShell>
  );
}
