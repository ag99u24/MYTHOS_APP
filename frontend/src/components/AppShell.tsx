"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AuthUser, getStoredUser } from "@/lib/session";
import { PrivateRoute } from "./PrivateRoute";
import { SessionPanel } from "./SessionPanel";

const navigation = [
  { href: "/dashboard", label: "Panel", icon: "P", roles: ["professional", "client"] },
  { href: "/clients", label: "Clientes", icon: "C", roles: ["professional"] },
  { href: "/plans", label: "Planes", icon: "N", roles: ["professional", "client"] },
  { href: "/sessions", label: "Agenda", icon: "S", roles: ["professional", "client"] },
  { href: "/messages", label: "Chat", icon: "M", roles: ["professional", "client"] },
  { href: "/progress", label: "Progreso", icon: "G", roles: ["professional", "client"] },
  { href: "/nutrition", label: "Nutrición", icon: "A", roles: ["professional", "client"] },
  { href: "/status", label: "Estado", icon: "E", roles: ["professional", "client"] },
  { href: "/profile", label: "Perfil", icon: "U", roles: ["professional", "client"] },
];

type AppShellProps = {
  title: string;
  description: string;
  allowedRoles?: AuthUser["role"][];
  action?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, description, allowedRoles, action, children }: AppShellProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  const filteredNavigation = navigation.filter((item) => !user || item.roles.includes(user.role));
  const roleLabel = user?.role === "client" ? "Cliente" : "Profesional";

  return (
    <PrivateRoute allowedRoles={allowedRoles}>
      <main className="min-h-screen bg-[#f7f5ef] text-[#18201b]">
        <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-[#d9d4c7] bg-white px-5 py-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between lg:block">
              <Link href="/" className="text-xl font-semibold">
                Mythos
              </Link>
              <span className="rounded-md bg-[#edf4e9] px-3 py-1 text-sm font-semibold text-[#37513b] lg:mt-4 lg:inline-flex">
                {roleLabel}
              </span>
            </div>
            <nav className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-1">
              {filteredNavigation.map((item) => (
                <NavigationLink key={item.href} item={item} isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
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

function NavigationLink({ item, isActive }: { item: (typeof navigation)[number]; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-12 items-center justify-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold lg:justify-start ${
        isActive
          ? "border-[#d9d4c7] bg-[#f7f5ef] text-[#18201b]"
          : "border-transparent text-[#3d493f] hover:border-[#d9d4c7] hover:bg-[#f7f5ef]"
      }`}
    >
      <span className={`flex size-7 items-center justify-center rounded-md text-xs ${isActive ? "bg-[#18201b] text-white" : "bg-[#f0ece1]"}`}>{item.icon}</span>
      <span className="hidden lg:inline">{item.label}</span>
    </Link>
  );
}
