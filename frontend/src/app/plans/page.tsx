import { AppShell } from "@/components/AppShell";
import { PlansClient } from "./PlansClient";

export default function PlansPage() {
  return (
    <AppShell
      title="Planes"
      description="CRUD principal de Mythos: crear, editar, asignar y revisar planes de entrenamiento o nutricion."
    >
      <PlansClient />
    </AppShell>
  );
}
