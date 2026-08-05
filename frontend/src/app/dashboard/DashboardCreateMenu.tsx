"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const createOptions = [
  {
    href: "/training",
    icon: "\u{1F3CB}\uFE0F",
    label: "Entrenamiento",
    detail: "Crear o asignar rutinas",
  },
  {
    href: "/nutrition-plans",
    icon: "\u{1F957}",
    label: "Dieta",
    detail: "Crear o asignar nutricion",
  },
];

export function DashboardCreateMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={menuRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-center gap-3 rounded-md bg-[#a30000] px-4 py-3 text-center font-semibold text-white shadow-lg shadow-[#a30000]/20 transition hover:bg-[#8b0000] sm:w-auto"
      >
        <span>Agregar plan</span>
        <span className="text-lg leading-none">{isOpen ? "\u{2303}" : "\u{2304}"}</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-full min-w-64 overflow-hidden rounded-md border border-[#d9d4c7] bg-white shadow-xl sm:w-72">
          {createOptions.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 border-b border-[#eee8db] px-4 py-3 text-[#0b0c10] transition last:border-b-0 hover:bg-[#f8f6f0]"
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-[#0b0c10] text-lg text-white">{option.icon}</span>
              <span>
                <span className="block font-semibold">{option.label}</span>
                <span className="block text-sm text-[#4f5d75]">{option.detail}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
