import { AppShell } from "@/components/AppShell";
import { ClientsClient } from "./ClientsClient";

export default function ClientsPage() {
  return (
    <AppShell title="Clientes" description="Gestiona clientes asignados, objetivos, datos de contacto e IDs para crear planes.">
      <ClientsClient />
    </AppShell>
  );
}
