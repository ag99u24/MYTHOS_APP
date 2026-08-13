import { AppShell } from "@/components/AppShell";
import { PlansClient } from "../plans/PlansClient";

export default function NutritionPlansPage() {
  return (
    <AppShell
      title="Nutricion"
      description="Asigna pautas nutricionales, comidas y objetivos de adherencia a cada cliente."
    >
      <PlansClient mode="nutrition" />
    </AppShell>
  );
}
