import { listarNotificadoresAction } from "@/actions/notificaciones/mantenimiento-notificadores";
import NotificadorGrid from "@/components/notificaciones/mantenimiento-notificadores/grid";

export const dynamic = "force-dynamic";

export default async function MantenimientoNotificadoresPage() {
  const res = await listarNotificadoresAction();
  const initialData = res.success ? (res.data ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sat-navy via-[#1b2b4a] to-slate-800 px-5 py-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 0.5px, transparent 0.5px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/10">
            <span className="text-sm font-bold text-white">N</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-outfit tracking-tight">
              Mantenimiento de Notificadores
            </h1>
            <p className="text-xs text-white/50 font-inter">
              Gestión de notificadores municipales
            </p>
          </div>
        </div>
      </div>

      {res.success ? (
        <NotificadorGrid initialData={initialData} />
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm font-medium text-red-600">
          Error al cargar notificadores: {res.error}
        </div>
      )}
    </div>
  );
}
