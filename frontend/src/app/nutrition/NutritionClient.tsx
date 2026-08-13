"use client";

import { useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/session";

type Product = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriscore_grade?: string;
  image_front_small_url?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    sugars_100g?: number;
    salt_100g?: number;
  };
};

type OpenFoodFactsResponse = {
  products?: Product[];
};

function formatNumber(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function NutritionClient() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setError("Introduce un alimento para buscar.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = getToken();
      const data = await apiRequest<OpenFoodFactsResponse>(`/nutrition/search?q=${encodeURIComponent(query.trim())}`, { token });
      setProducts(data.products ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo buscar alimentos.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-6">
      <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
        <form className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={handleSearch}>
          <input
            className="h-12 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3"
            placeholder="Buscar alimento: yogur griego, arroz, avena..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button disabled={isLoading} className="rounded-md bg-[#18201b] px-5 py-3 font-semibold text-white hover:bg-[#2c372f] disabled:opacity-70">
            {isLoading ? "Buscando..." : "Buscar"}
          </button>
        </form>
        {error ? (
          <div className="mt-4">
            <FormMessage type="error">{error}</FormMessage>
          </div>
        ) : null}
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!isLoading && products.length === 0 ? (
          <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 text-sm text-[#5d6959] shadow-sm">
            Busca un alimento para ver calorias, macros y Nutri-Score por cada 100g.
          </article>
        ) : null}

        {products.map((product) => {
          const nutriments = product.nutriments ?? {};
          const name = product.product_name || "Producto sin nombre";

          return (
            <article key={product.code || name} className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f7f5ef] text-sm font-semibold text-[#5d6959]">
                  {product.image_front_small_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_front_small_url} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    "Food"
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="line-clamp-2 font-semibold">{name}</h2>
                  <p className="mt-1 truncate text-sm text-[#5d6959]">{product.brands || "Marca no disponible"}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Kcal" value={formatNumber(nutriments["energy-kcal_100g"])} />
                <Metric label="Proteina" value={`${formatNumber(nutriments.proteins_100g)}g`} />
                <Metric label="Carbohidratos" value={`${formatNumber(nutriments.carbohydrates_100g)}g`} />
                <Metric label="Grasas" value={`${formatNumber(nutriments.fat_100g)}g`} />
                <Metric label="Azucares" value={`${formatNumber(nutriments.sugars_100g)}g`} />
                <Metric label="Sal" value={`${formatNumber(nutriments.salt_100g)}g`} />
              </div>

              <div className="mt-4 flex items-center justify-between rounded-md bg-[#f7f5ef] px-3 py-2 text-sm">
                <span className="font-semibold">Nutri-Score</span>
                <span className="font-semibold uppercase text-[#c75432]">{product.nutriscore_grade || "-"}</span>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f5ef] p-3">
      <p className="text-xs font-semibold text-[#64715f]">{label}</p>
      <p className="mt-1 font-semibold text-[#18201b]">{value}</p>
    </div>
  );
}
