export type PaginationMeta = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
};

type PaginationControlsProps = {
  meta: PaginationMeta | null;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ meta, isLoading = false, onPageChange }: PaginationControlsProps) {
  if (!meta || meta.pages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[#ece7dc] p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[#5d6959]">
        Pagina {meta.page} de {meta.pages} - {meta.total} registros
      </p>
      <div className="flex gap-2">
        <button
          className="rounded-md border border-[#d9d4c7] px-3 py-2 font-semibold hover:bg-[#f7f5ef] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading || !meta.has_prev}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Anterior
        </button>
        <button
          className="rounded-md border border-[#d9d4c7] px-3 py-2 font-semibold hover:bg-[#f7f5ef] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading || !meta.has_next}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
