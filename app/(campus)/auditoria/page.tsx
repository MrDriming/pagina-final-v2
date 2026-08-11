import { requireRole } from "@/lib/session"
import { listarAuditoria } from "@/lib/auditoria"
import { AuditoriaView } from "@/components/dashboard/auditoria-view"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ accion?: string; dias?: string }>
}) {
  await requireRole("admin")
  const { accion, dias } = await searchParams

  // El filtro llega por query string, así que se sanea acá: `listarAuditoria`
  // ignora un `dias` que no sea un número finito, pero mejor no mandárselo.
  const diasNum = Number(dias)

  const filas = await listarAuditoria({
    accion: accion || undefined,
    dias: Number.isFinite(diasNum) && diasNum > 0 ? diasNum : undefined,
  })

  return (
    <AuditoriaView
      filas={filas}
      accion={accion ?? ""}
      dias={dias ?? ""}
    />
  )
}
