import { requireUser } from "@/lib/session"
import { getNotasDeAlumno, getPlanilla } from "@/lib/notas"
import { getMisCatedras } from "@/lib/catedras"
import { NotasAlumno } from "@/components/dashboard/notas/notas-alumno"
import { PlanillaProfesor } from "@/components/dashboard/notas/planilla-profesor"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ catedra?: string }>
}) {
  const user = await requireUser()

  if (user.role === "alumno") {
    const filas = await getNotasDeAlumno()
    return <NotasAlumno filas={filas} />
  }

  if (user.role === "profesor") {
    const { catedra: catedraId } = await searchParams
    const catedras = await getMisCatedras()
    const planilla = catedraId ? await getPlanilla(catedraId) : null
    return (
      <PlanillaProfesor
        catedras={catedras}
        catedraId={catedraId ?? null}
        planilla={planilla}
      />
    )
  }

  return null // admin se completa en la task 11
}
