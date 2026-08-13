import { AppShell } from "@/components/AppShell";
import { DashboardCreateMenu } from "./DashboardCreateMenu";
import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <AppShell
      title="Panel de control"
      description="Resumen operativo de planes, seguimiento, sesiones y mensajes."
      action={<DashboardCreateMenu />}
    >
      <DashboardClient />
    </AppShell>
  );
}
