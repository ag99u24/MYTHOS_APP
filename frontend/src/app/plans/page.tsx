import { AppShell } from "@/components/AppShell";
import { plans } from "@/data/mock";

const planItems = [
  { day: "Lunes", title: "Tren inferior", details: "Sentadilla, peso muerto rumano, core" },
  { day: "Martes", title: "Menu alto en carbohidratos", details: "Ajustado a sesion intensa" },
  { day: "Jueves", title: "Tren superior", details: "Empuje, traccion y movilidad escapular" },
];

export default function PlansPage() {
  return (
    <AppShell
      title="Planes"
      description="CRUD principal de Mythos: crear, editar, asignar y revisar planes de entrenamiento o nutricion."
      action={<button className="rounded-md bg-[#c75432] px-4 py-3 font-semibold text-white hover:bg-[#a94529]">Crear plan</button>}
    >
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Listado de planes</h2>
          <div className="mt-5 grid gap-3">
            {plans.map((plan) => (
              <div key={plan.title} className="rounded-md border border-[#ece7dc] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{plan.title}</p>
                    <p className="mt-1 text-sm text-[#5d6959]">{plan.client}</p>
                  </div>
                  <span className="rounded-md bg-[#f7f5ef] px-3 py-1 text-sm font-semibold">{plan.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-[#5d6959]">
                  <span>{plan.category}</span>
                  <span>{plan.start}</span>
                  <span>{plan.items} bloques</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Editor de plan</h2>
          <div className="mt-5 grid gap-4">
            <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue="Fuerza base 8 semanas" />
            <div className="grid gap-4 md:grid-cols-2">
              <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue="Entrenamiento">
                <option>Entrenamiento</option>
                <option>Nutricion</option>
                <option>Mixto</option>
              </select>
              <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue="Activo">
                <option>Borrador</option>
                <option>Activo</option>
                <option>Finalizado</option>
              </select>
            </div>
            <textarea
              className="min-h-24 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3"
              defaultValue="Bloque inicial para construir fuerza tecnica y adherencia semanal."
            />
          </div>

          <div className="mt-6 grid gap-3">
            {planItems.map((item) => (
              <div key={`${item.day}-${item.title}`} className="grid gap-3 rounded-md bg-[#f7f5ef] p-4 md:grid-cols-[120px_1fr_auto] md:items-center">
                <span className="font-semibold text-[#c75432]">{item.day}</span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-[#5d6959]">{item.details}</p>
                </div>
                <button className="rounded-md border border-[#d9d4c7] bg-white px-3 py-2 text-sm font-semibold">Editar</button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f]">Guardar cambios</button>
            <button className="rounded-md border border-[#d9d4c7] px-4 py-3 font-semibold hover:bg-[#f7f5ef]">Archivar plan</button>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
