import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <AppShell
      title="Panel de control"
      description="Resumen operativo de planes, seguimiento, sesiones y mensajes."
      action={
        <Link href="/training" className="rounded-md bg-[#a30000] px-4 py-3 text-center font-semibold text-white hover:bg-[#8b0000]">
          Agregar entrenamiento
        </Link>
      }
    >
      <DashboardClient />
    </AppShell>
  );
}
