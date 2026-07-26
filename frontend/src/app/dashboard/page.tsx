import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <AppShell
      title="Panel profesional"
      description="Resumen operativo para controlar clientes, planes y revisiones pendientes."
      action={
        <Link href="/training" className="rounded-md bg-[#c75432] px-4 py-3 text-center font-semibold text-white hover:bg-[#a94529]">
          Nuevo entrenamiento
        </Link>
      }
    >
      <DashboardClient />
    </AppShell>
  );
}
