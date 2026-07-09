import Link from "next/link";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-screen bg-[#f7f5ef] text-[#18201b]">
      <section className="hidden flex-1 border-r border-[#d9d4c7] bg-[#18201b] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="text-xl font-semibold">
          Mythos
        </Link>
        <div>
          <p className="max-w-lg text-4xl font-semibold leading-tight">
            Gestion profesional para planes, clientes y progreso.
          </p>
          <p className="mt-5 max-w-md leading-7 text-[#d7ded2]">
            Una base clara para entrenadores y dietistas que necesitan trabajar con orden desde el primer dia.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-lg border border-[#d9d4c7] bg-white p-6 shadow-sm">
          <Link href="/" className="mb-8 inline-flex text-lg font-semibold lg:hidden">
            Mythos
          </Link>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-3 leading-7 text-[#5d6959]">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 border-t border-[#ece7dc] pt-5 text-sm text-[#5d6959]">{footer}</div>
        </div>
      </section>
    </main>
  );
}
