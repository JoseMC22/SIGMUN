import React from "react";
import { 
  TrendingUp, 
  Users, 
  FileText, 
  AlertCircle 
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { title: "Recaudación Hoy", value: "S/ 12,450.00", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Nuevos Contribuyentes", value: "24", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Trámites Pendientes", value: "156", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Alertas Críticas", value: "3", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-800 font-outfit">Panel de Control</h1>
        <p className="text-slate-500 font-inter">Bienvenido al sistema SIGMUN Modernization. Aquí tienes un resumen de hoy.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-bold text-slate-400 font-inter">+12% vs ayer</span>
            </div>
            <p className="text-slate-500 text-sm font-medium font-inter">{stat.title}</p>
            <h3 className="text-2xl font-bold text-slate-800 font-outfit mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Contenido de Ejemplo (Placeholder para tablas/gráficos) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm h-100 p-6"> 
          <h3 className="text-lg font-bold text-slate-800 font-outfit mb-4">Últimas Declaraciones Juradas</h3>
          <div className="flex items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
            <p className="font-inter italic">Gráfico de recaudación mensual será implementado aquí</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 font-outfit mb-4">Actividad Reciente</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                  JD
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 font-inter">Juan Diaz registró predio</p>
                  <p className="text-xs text-slate-500 font-inter">Hace 10 minutos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
