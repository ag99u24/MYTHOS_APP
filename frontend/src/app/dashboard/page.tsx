import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { checkIns, clients, plans } from "@/data/mock";

export default function DashboardPage() {
  return (
    <AppShell
      title="Panel profesional"
      description="Resumen operativo para controlar clientes, planes y revisiones pendientes."
      action={
        <Link href="/plans" className="rounded-md bg-[#c75432] px-4 py-3 text-center font-semibold text-white hover:bg-[#a94529]">
          Nuevo plan
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Clientes activos" value="24" detail="3 necesitan revision esta semana" />
        <StatCard label="Planes en curso" value="31" detail="12 de nutricion, 19 de entrenamiento" />
        <StatCard label="Check-ins" value="86%" detail="Cumplimiento medio de los ultimos 7 dias" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Clientes prioritarios</h2>
            <Link href="/clients" className="text-sm font-semibold text-[#c75432]">
              Ver todos
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {clients.map((client) => (
              <div key={client.name} className="grid gap-3 rounded-md bg-[#f7f5ef] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{client.name}</p>
                  <p className="mt-1 text-sm text-[#5d6959]">{client.goal}</p>
                </div>
                <span className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-[#37513b]">{client.lastCheckIn}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Actividad reciente</h2>
          <div className="mt-5 grid gap-3">
            {checkIns.map((item) => (
              <div key={item} className="rounded-md border border-[#ece7dc] p-4 text-sm leading-6 text-[#3d493f]">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Planes activos</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.title} className="rounded-md border border-[#ece7dc] p-4">
              <p className="font-semibold">{plan.title}</p>
              <p className="mt-1 text-sm text-[#5d6959]">{plan.client}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>{plan.category}</span>
                <span className="font-semibold text-[#c75432]">{plan.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
