import { AppShell } from "@/components/AppShell";

export default function ProfilePage() {
  return (
    <AppShell
      title="Perfil"
      description="Datos visibles del profesional y ajustes basicos de la cuenta."
      action={<button className="rounded-md bg-[#18201b] px-4 py-3 font-semibold text-white hover:bg-[#2c372f]">Guardar perfil</button>}
    >
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-lg bg-[#18201b] text-2xl font-semibold text-white">AG</div>
            <div>
              <h2 className="text-xl font-semibold">Alex Garcia</h2>
              <p className="mt-1 text-[#5d6959]">Entrenador y nutricion deportiva</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-md bg-[#f7f5ef] p-4">
              <p className="font-semibold">Especialidad</p>
              <p className="mt-1 text-[#5d6959]">Fuerza, recomposicion y habitos</p>
            </div>
            <div className="rounded-md bg-[#f7f5ef] p-4">
              <p className="font-semibold">Clientes activos</p>
              <p className="mt-1 text-[#5d6959]">24 clientes asignados</p>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Informacion de cuenta</h2>
          <form className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nombre
              <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue="Alex Garcia" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Email
              <input className="h-11 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3" defaultValue="alex@mythos.app" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Objetivo profesional
              <textarea
                className="min-h-28 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 py-3"
                defaultValue="Ayudar a clientes a mejorar su composicion corporal con planes claros y sostenibles."
              />
            </label>
          </form>
        </article>
      </section>
    </AppShell>
  );
}
