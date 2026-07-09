import { AppShell } from "@/components/AppShell";
import { clients } from "@/data/mock";

export default function ClientsPage() {
  return (
    <AppShell
      title="Clientes"
      description="Gestiona clientes asignados, objetivos, planes activos y ultimos check-ins."
      action={<button className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f]">Anadir cliente</button>}
    >
      <section className="rounded-lg border border-[#d9d4c7] bg-white shadow-sm">
        <div className="grid gap-3 border-b border-[#ece7dc] p-5 md:grid-cols-[1fr_220px]">
          <input
            placeholder="Buscar cliente"
            className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
          />
          <select className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3">
            <option>Todos los estados</option>
            <option>Activo</option>
            <option>Revision</option>
          </select>
        </div>

        <div className="grid">
          {clients.map((client) => (
            <article key={client.name} className="grid gap-4 border-b border-[#ece7dc] p-5 last:border-b-0 lg:grid-cols-[1.2fr_1fr_140px_120px] lg:items-center">
              <div>
                <p className="font-semibold">{client.name}</p>
                <p className="mt-1 text-sm text-[#5d6959]">{client.goal}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#344036]">{client.plan}</p>
                <p className="mt-1 text-sm text-[#64715f]">Ultimo check-in: {client.lastCheckIn}</p>
              </div>
              <span className="w-fit rounded-md bg-[#edf4e9] px-3 py-1 text-sm font-semibold text-[#37513b]">{client.status}</span>
              <button className="rounded-md border border-[#d9d4c7] px-3 py-2 text-sm font-semibold hover:bg-[#f7f5ef]">
                Ver ficha
              </button>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
