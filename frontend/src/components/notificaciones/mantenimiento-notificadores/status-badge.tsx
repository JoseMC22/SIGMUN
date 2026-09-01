import { cn } from "@/lib/utils";

export function isActivo(estado: string): boolean {
  return (estado || "").trim().toUpperCase() === "ACTIVADO";
}

export function StatusBadge({ estado }: { estado: string }) {
  const activo = isActivo(estado);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        activo
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/40"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-300/40",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          activo ? "bg-emerald-500" : "bg-slate-400",
        )}
      />
      {estado}
    </span>
  );
}

export default StatusBadge;
