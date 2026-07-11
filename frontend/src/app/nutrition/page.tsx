import { AppShell } from "@/components/AppShell";
import { NutritionClient } from "./NutritionClient";

export default function NutritionPage() {
  return (
    <AppShell title="Nutricion" description="Busca alimentos reales y consulta valores nutricionales desde Open Food Facts.">
      <NutritionClient />
    </AppShell>
  );
}
