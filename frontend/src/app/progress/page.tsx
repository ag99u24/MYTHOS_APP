import { AppShell } from "@/components/AppShell";
import { ProgressClient } from "./ProgressClient";

export default function ProgressPage() {
  return (
    <AppShell title="Progreso" description="Registra check-ins, entrenamientos y adherencia a la dieta.">
      <ProgressClient />
    </AppShell>
  );
}
