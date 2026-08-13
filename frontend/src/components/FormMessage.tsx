type FormMessageProps = {
  type: "error" | "success";
  children: string;
};

export function FormMessage({ type, children }: FormMessageProps) {
  const styles =
    type === "error"
      ? "border-[#f1b5a4] bg-[#fff4ef] text-[#963519]"
      : "border-[#cddfbd] bg-[#f2f8ed] text-[#365b30]";

  return <p className={`rounded-md border px-3 py-2 text-sm font-medium ${styles}`}>{children}</p>;
}
