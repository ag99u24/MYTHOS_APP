"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AuthUser, getStoredUser } from "@/lib/session";
import { PrivateRoute } from "./PrivateRoute";
import { SessionPanel } from "./SessionPanel";

const navigation = [
  { href: "/dashboard", label: "Panel", icon: "\u{1F3DB}\uFE0F", roles: ["professional", "client"] },
  { href: "/clients", label: "Clientes", icon: "\u{1F465}", roles: ["professional"] },
  { href: "/training", label: "Entrenamiento", icon: "\u{1F3CB}\uFE0F", roles: ["professional", "client"] },
  { href: "/nutrition-plans", label: "Nutricion", icon: "\u{1F957}", roles: ["professional", "client"] },
  { href: "/sessions", label: "Agenda", icon: "\u{1F4C5}", roles: ["professional", "client"] },
  { href: "/messages", label: "Chat", icon: "\u{1F4AC}", roles: ["professional", "client"] },
  { href: "/progress", label: "Progreso", icon: "\u{1F4C8}", roles: ["professional", "client"] },
  { href: "/nutrition", label: "Alimentos", icon: "\u{1F50E}", roles: ["professional", "client"] },
  { href: "/profile", label: "Perfil", icon: "\u{1F464}", roles: ["professional", "client"] },
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => setUser(getStoredUser()));
  }, []);

  const filteredNavigation = navigation.filter((item) => !user || item.roles.includes(user.role));
  const activeNavigation = filteredNavigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const roleLabel = user?.role === "client" ? "Cliente" : "Profesional";
  const visibleAction = user && user.role !== "client" ? action : null;

  return (
    <PrivateRoute allowedRoles={allowedRoles}>
      <main className="min-h-screen bg-[#f8f6f0] text-[#0b0c10]">
        <div className="grid min-h-screen lg:grid-cols-[1fr_292px]">
          <section className="px-5 py-6 sm:px-8 lg:px-10">
            <header className="flex flex-col gap-4 border-b border-[#d9d4c7] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#a30000]">Mythos App</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{title}</h1>
                <p className="mt-3 max-w-2xl leading-7 text-[#4f5d75]">{description}</p>
              </div>
              {visibleAction}
            </header>
            <div className="py-6">{children}</div>
          </section>

          <aside className="order-first border-b border-[#d9d4c7] bg-[#0b0c10] px-5 py-5 text-white shadow-xl lg:order-last lg:border-b-0 lg:border-l lg:border-[#c5a059]/30">
            <div className="flex items-center justify-between lg:block">
              <Link href="/" className="flex items-center gap-3 text-xl font-semibold">
                <span className="flex size-11 items-center justify-center rounded-md border border-[#c5a059] bg-white p-2">
                  <Image src="/mythos-logo.png" alt="Mythos" width={28} height={40} className="h-8 w-auto" priority />
                </span>
                <span>Mythos</span>
              </Link>
              <span className="rounded-md bg-white/10 px-3 py-1 text-sm font-semibold text-[#f8f6f0] ring-1 ring-[#c5a059]/60 lg:mt-4 lg:inline-flex">
                {roleLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-expanded={isMenuOpen}
              className="mt-5 flex w-full items-center justify-between rounded-md border border-[#c5a059]/70 bg-white/10 px-4 py-3 text-sm font-semibold text-white lg:hidden"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-md bg-white text-[#0b0c10]">{activeNavigation?.icon ?? "\u{1F9ED}"}</span>
                {activeNavigation?.label ?? "Menu"}
              </span>
              <span className="text-lg leading-none">{isMenuOpen ? "\u{2303}" : "\u{2304}"}</span>
            </button>

            <nav className={`${isMenuOpen ? "grid" : "hidden"} mt-3 gap-2 lg:mt-5 lg:grid lg:grid-cols-1`}>
              {filteredNavigation.map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  onNavigate={() => setIsMenuOpen(false)}
                />
              ))}
            </nav>
            <SessionPanel />
          </aside>
        </div>
      </main>
    </PrivateRoute>
  );
}

function NavigationLink({ item, isActive, onNavigate }: { item: (typeof navigation)[number]; isActive: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold transition ${
        isActive
          ? "border-[#c5a059] bg-[#a30000] text-white shadow-lg shadow-black/20"
          : "border-transparent text-[#f8f6f0] hover:border-[#c5a059]/60 hover:bg-white/10"
      }`}
    >
      <span className={`flex size-7 items-center justify-center rounded-md text-sm ${isActive ? "bg-white text-[#0b0c10]" : "bg-white/10 text-white"}`}>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}
