import { AppShell } from "@/components/AppShell";
import { PlansClient } from "../plans/PlansClient";

export default function TrainingPage() {
  return (
    <AppShell
      title="Entrenamiento"
      description="Asigna rutinas, sesiones, ejercicios y objetivos fisicos a cada cliente."
    >
      <PlansClient mode="training" />
    </AppShell>
  );
}
