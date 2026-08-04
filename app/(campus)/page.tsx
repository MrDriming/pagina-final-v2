import { requireUser } from "@/lib/session"
import { getNotasDeAlumno } from "@/lib/notas"
import { resumenAlumno } from "@/lib/grades"
import { DashboardHome } from "@/components/dashboard/dashboard-home"

export default async function Page() {
  const user = await requireUser()

  // El resumen del alumno sale de sus notas reales, no de los mocks.
  const resumen =
    user.role === "alumno"
      ? resumenAlumno(await getNotasDeAlumno())
      : { promedio: 0, aprobadas: 0, pendientes: 0 }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-600 font-medium">
        👋 Hola {user.name} — Conectado como {user.role} en el sistema del IPESMI
      </div>
      <DashboardHome rol={user.role} resumen={resumen} />
    </div>
  )
}
