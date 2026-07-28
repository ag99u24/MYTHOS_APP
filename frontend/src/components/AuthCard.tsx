import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-screen bg-[#f8f6f0] text-[#0b0c10]">
      <section className="hidden flex-1 border-r border-[#c5a059] bg-[#0b0c10] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3 text-xl font-semibold">
          <span className="flex size-12 items-center justify-center rounded-md border border-[#c5a059] p-2">
            <Image src="/mythos-logo.png" alt="Mythos" width={30} height={44} className="h-9 w-auto invert" priority />
          </span>
          <span>Mythos</span>
        </Link>
        <div>
          <p className="max-w-lg text-4xl font-semibold leading-tight">
            Gestion profesional para planes, clientes y progreso.
          </p>
          <p className="mt-5 max-w-md leading-7 text-[#d7d0bd]">
            Una base clara para entrenadores y dietistas que necesitan trabajar con orden desde el primer dia.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-lg border border-[#d9d4c7] bg-white p-6 shadow-sm">
          <Link href="/" className="mb-8 inline-flex items-center gap-3 text-lg font-semibold lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-md border border-[#c5a059] bg-[#0b0c10] p-2">
              <Image src="/mythos-logo.png" alt="Mythos" width={24} height={34} className="h-7 w-auto invert" priority />
            </span>
            <span>Mythos</span>
          </Link>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-3 leading-7 text-[#4f5d75]">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 border-t border-[#ece7dc] pt-5 text-sm text-[#4f5d75]">{footer}</div>
        </div>
      </section>
    </main>
  );
}
