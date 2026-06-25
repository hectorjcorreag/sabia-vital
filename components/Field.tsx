// components/Field.tsx
"use client";

export function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-black text-black/60">{label}</label>
      {children}
      {help ? <p className="text-[11px] text-black/50">{help}</p> : null}
    </div>
  );
}