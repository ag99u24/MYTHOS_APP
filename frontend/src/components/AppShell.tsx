import Link from "next/link";
import type { ReactNode } from "react";
import { PrivateRoute } from "./PrivateRoute";
import { SessionPanel } from "./SessionPanel";

const navigation = [
  { href: "/dashboard", label: "Panel", icon: "P" },
  { href: "/clients", label: "Clientes", icon: "C" },
  { href: "/plans", label: "Planes", icon: "N" },
  { href: "/progress", label: "Progreso", icon: "G" },
  { href: "/profile", label: "Perfil", icon: "U" },
];

type AppShellProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, description, action, children }: AppShellProps) {
  return (
    <PrivateRoute>
      <main className="min-h-screen bg-[#f7f5ef] text-[#18201b]">
        <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-[#d9d4c7] bg-white px-5 py-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between lg:block">
              <Link href="/" className="text-xl font-semibold">
                Mythos
              </Link>
              <span className="rounded-md bg-[#edf4e9] px-3 py-1 text-sm font-semibold text-[#37513b] lg:mt-4 lg:inline-flex">
                Profesional
              </span>
            </div>
            <nav className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-12 items-center justify-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm font-semibold text-[#3d493f] hover:border-[#d9d4c7] hover:bg-[#f7f5ef] lg:justify-start"
                >
                  <span className="flex size-7 items-center justify-center rounded-md bg-[#f0ece1] text-xs">{item.icon}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              ))}
            </nav>
            <SessionPanel />
          </aside>

          <section className="px-5 py-6 sm:px-8 lg:px-10">
            <header className="flex flex-col gap-4 border-b border-[#d9d4c7] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#c75432]">Mythos App</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{title}</h1>
                <p className="mt-3 max-w-2xl leading-7 text-[#5d6959]">{description}</p>
              </div>
              {action}
            </header>
            <div className="py-6">{children}</div>
          </section>
        </div>
      </main>
    </PrivateRoute>
  );
}
