type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
};

export function FormField({ label, name, type = "text", placeholder }: FormFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#344036]">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="h-12 rounded-md border border-[#d9d4c7] bg-[#fbfaf7] px-3 text-base text-[#18201b] placeholder:text-[#9a9488]"
      />
    </label>
  );
}
