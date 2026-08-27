import { AppShell } from "@/components/AppShell";
import { ProfileClient } from "./ProfileClient";

export default function ProfilePage() {
  return (
    <AppShell title="Perfil" description="Datos visibles y ajustes basicos de tu cuenta.">
      <ProfileClient />
    </AppShell>
  );
}
