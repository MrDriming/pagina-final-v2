import { requireUser } from "@/lib/session"
import { getNotasDeAlumno } from "@/lib/notas"
import { NotasAlumno } from "@/components/dashboard/notas/notas-alumno"

export default async function Page() {
  const user = await requireUser()

  if (user.role === "alumno") {
    const filas = await getNotasDeAlumno()
    return <NotasAlumno filas={filas} />
  }

  return null // profesor y admin se completan en las tasks 10 y 11
}
