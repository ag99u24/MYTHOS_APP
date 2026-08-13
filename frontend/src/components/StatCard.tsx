type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="rounded-lg border border-[#d9d4c7] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#5d6959]">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-[#64715f]">{detail}</p>
    </article>
  );
}
