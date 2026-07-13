import { AppShell } from "@/components/AppShell";
import { SessionsClient } from "./SessionsClient";

export default function SessionsPage() {
  return (
    <AppShell title="Agenda" description="Programa revisiones, llamadas y sesiones con clientes asignados.">
      <SessionsClient />
    </AppShell>
  );
}
