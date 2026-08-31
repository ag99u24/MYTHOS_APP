import { AppShell } from "@/components/AppShell";
import { ProgressClient } from "./ProgressClient";

export default function ProgressPage() {
  return (
    <AppShell title="Progreso" description="Registra mediciones corporales y revisa la evolucion de tus clientes." allowedRoles={["professional"]}>
      <ProgressClient />
    </AppShell>
  );
}
