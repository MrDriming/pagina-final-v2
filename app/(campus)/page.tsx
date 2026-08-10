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

  return <DashboardHome user={user} resumen={resumen} />

}
