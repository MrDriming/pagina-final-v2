"use client"

import { useRouter } from "next/navigation"
import type { FilaAuditoria } from "@/lib/auditoria"

const ACCIONES: { valor: string; etiqueta: string }[] = [
  { valor: "", etiqueta: "Todas las acciones" },
  { valor: "nota.guardar", etiqueta: "Notas" },
  { valor: "usuario.crear", etiqueta: "Altas de usuario" },
  { valor: "usuario.rol", etiqueta: "Cambios de rol" },
  { valor: "usuario.curso", etiqueta: "Cambios de curso" },
  { valor: "catedra.asignar", etiqueta: "Cátedras asignadas" },
  { valor: "catedra.quitar", etiqueta: "Cátedras quitadas" },
]

const PERIODOS: { valor: string; etiqueta: string }[] = [
  { valor: "", etiqueta: "Desde siempre" },
  { valor: "1", etiqueta: "Último día" },
  { valor: "7", etiqueta: "Última semana" },
  { valor: "30", etiqueta: "Último mes" },
]

/** Nota que puede no estar cargada. `null` se muestra como raya. */
function nota(v: unknown): string {
  return v === null || v === undefined ? "—" : String(v)
}

/**
 * Traduce el evento a una frase. El `detalle` es jsonb, así que del lado de
 * TypeScript es `unknown`: se lee con cuidado y, si no se reconoce la forma,
 * se cae al JSON crudo en vez de romper la página.
 */
function describir(fila: FilaAuditoria): string {
  const d = (fila.detalle ?? {}) as Record<string, unknown>

  switch (fila.accion) {
    case "nota.guardar": {
      const antes = (d.antes ?? {}) as Record<string, unknown>
      const ahora = (d.ahora ?? {}) as Record<string, unknown>
      const cambios = ([1, 2, 3] as const)
        .filter((i) => antes[`t${i}`] !== ahora[`t${i}`])
        .map((i) => `${i}º trim.: ${nota(antes[`t${i}`])} → ${nota(ahora[`t${i}`])}`)
        .join(" · ")
      return `${d.materia} de ${d.alumno}. ${cambios || "sin cambios"}`
    }
    case "usuario.crear":
      return `Alta de ${d.nombre} (${d.email}) como ${d.rol}${
        d.anio ? ` en ${d.anio} ${d.division ?? ""}` : ""
      }`
    case "usuario.rol":
      return `De ${d.rolAnterior} a ${d.rolNuevo}`
    case "usuario.curso":
      return `De ${d.cursoAnterior} a ${d.cursoNuevo}`
    case "catedra.asignar":
      return `${d.materia} — ${d.curso}`
    case "catedra.quitar":
      return `${d.materia} — ${d.curso}`
    default:
      return JSON.stringify(d)
  }
}

function etiquetaAccion(accion: string): string {
  return ACCIONES.find((a) => a.valor === accion)?.etiqueta ?? accion
}

function fecha(d: Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AuditoriaView({
  filas,
  accion,
  dias,
}: {
  filas: FilaAuditoria[]
  accion: string
  dias: string
}) {
  const router = useRouter()

  const navegar = (nuevaAccion: string, nuevosDias: string) => {
    const params = new URLSearchParams()
    if (nuevaAccion) params.set("accion", nuevaAccion)
    if (nuevosDias) params.set("dias", nuevosDias)
    const qs = params.toString()
    router.push(qs ? `/auditoria?${qs}` : "/auditoria")
  }

  const selectClass =
    "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Registro de auditoría
        </h1>
        <p className="text-sm text-muted-foreground">
          Todo lo que profesores y administradores modificaron en el campus.
          El registro no se puede editar ni borrar desde la aplicación.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={accion}
          onChange={(e) => navegar(e.target.value, dias)}
          className={selectClass}
        >
          {ACCIONES.map((a) => (
            <option key={a.valor} value={a.valor}>{a.etiqueta}</option>
          ))}
        </select>
        <select
          value={dias}
          onChange={(e) => navegar(accion, e.target.value)}
          className={selectClass}
        >
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
          ))}
        </select>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No hay movimientos que coincidan con el filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Cuándo</th>
                <th className="px-4 py-3 font-medium">Quién</th>
                <th className="px-4 py-3 font-medium">Qué</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((f) => (
                <tr key={f.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {fecha(f.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {f.actorNombre || "(sin nombre)"}
                    </p>
                    <p className="text-xs text-muted-foreground">{f.actorRol}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">
                    {etiquetaAccion(f.accion)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {describir(f)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filas.length >= 200 && (
        <p className="text-xs text-muted-foreground">
          Se muestran los 200 movimientos más recientes. Achicá el período para
          ver los anteriores.
        </p>
      )}
    </div>
  )
}
