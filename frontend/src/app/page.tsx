import Link from "next/link";
import Image from "next/image";

const features = [
  {
    title: "Planes en un solo lugar",
    description: "Entrenamiento, nutricion y notas de seguimiento organizadas por cliente.",
  },
  {
    title: "Seguimiento visible",
    description: "Registros de peso, sensaciones y progreso para tomar mejores decisiones.",
  },
  {
    title: "Trabajo profesional",
    description: "Una experiencia pensada para entrenadores, dietistas y clientes reales.",
  },
];

const stats = [
  { label: "Clientes activos", value: "128" },
  { label: "Planes asignados", value: "342" },
  { label: "Check-ins este mes", value: "918" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f6f0] text-[#0b0c10]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-[#d9d4c7] pb-5">
          <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
            <span className="flex size-11 items-center justify-center rounded-md border border-[#c5a059] bg-[#0b0c10] p-2">
              <Image src="/mythos-logo.png" alt="Mythos" width={28} height={40} className="h-8 w-auto invert" priority />
            </span>
            <span>Mythos</span>
          </Link>
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/login" className="rounded-md px-3 py-2 text-[#1f2833] hover:bg-white">
              Entrar
            </Link>
            <Link href="/register" className="rounded-md bg-[#0b0c10] px-4 py-2 text-white hover:bg-[#1f2833]">
              Crear cuenta
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-md border border-[#c5a059] bg-white px-3 py-1 text-sm font-medium text-[#4f5d75]">
              Plataforma para entrenadores, dietistas y clientes
            </p>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal text-[#0b0c10] sm:text-6xl lg:text-7xl">
              Mythos
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4f5d75]">
              Gestiona clientes, crea planes personalizados y acompana el progreso con una experiencia clara, elegante y preparada para crecer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="rounded-md bg-[#a30000] px-5 py-3 text-center font-semibold text-white hover:bg-[#8b0000]">
                Empezar ahora
              </Link>
              <Link href="/dashboard" className="rounded-md border border-[#c5a059] bg-white px-5 py-3 text-center font-semibold text-[#0b0c10] hover:bg-[#faf9f5]">
                Ver demo
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#ece7dc] pb-4">
                <div>
                  <p className="text-sm font-medium text-[#64715f]">Panel semanal</p>
                  <h2 className="mt-1 text-2xl font-semibold">Clientes en seguimiento</h2>
                </div>
                <span className="rounded-md bg-[#0b0c10] px-3 py-1 text-sm font-semibold text-[#c5a059]">Activo</span>
              </div>
              <div className="mt-5 grid gap-3">
                {["Plan fuerza - Laura M.", "Dieta rendimiento - Hugo R.", "Check-in inicial - Nadia S."].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-md bg-[#f7f5ef] p-4">
                    <span className="font-medium">{item}</span>
                    <span className="text-sm text-[#64715f]">Hoy</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-[#d9d4c7] bg-white p-4">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="mt-1 text-sm text-[#64715f]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="grid gap-4 pb-8 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-[#d9d4c7] bg-white p-5">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-[#5d6959]">{feature.description}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
