"use client"

import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import type { FilaAdmin } from "@/lib/notas"
import { notaReal, esDesaprobada, ANIOS, DIVISIONES } from "@/lib/grades"

interface Props {
  filas: FilaAdmin[]
  materias: { id: string; nombre: string; anio: string }[]
  filtros: { anio?: string; division?: string; materiaId?: string }
}

export function NotasAdmin({ filas, materias, filtros }: Props) {
  const router = useRouter()

  const aplicar = (clave: string, valor: string) => {
    const params = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v) as [string, string][],
    )
    if (valor) params.set(clave, valor)
    else params.delete(clave)
    router.push(`/notas?${params.toString()}`)
  }

  const selectClass =
    "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Supervisión de Calificaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Supervisión institucional de boletines trimestrales.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400">
          <ShieldAlert className="size-4 shrink-0" />
          <span>Modo Preceptor: visualización y auditoría sin permisos de edición</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={filtros.anio ?? ""} onChange={(e) => aplicar("anio", e.target.value)} className={selectClass}>
          <option value="">Todos los años</option>
          {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtros.division ?? ""} onChange={(e) => aplicar("division", e.target.value)} className={selectClass}>
          <option value="">Todas las divisiones</option>
          {DIVISIONES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filtros.materiaId ?? ""} onChange={(e) => aplicar("materiaId", e.target.value)} className={selectClass}>
          <option value="">Todas las materias</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre} ({m.anio})</option>
          ))}
        </select>
      </div>

      {filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
          No hay calificaciones que coincidan con esos filtros.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Estudiante</th>
                  <th className="px-6 py-4">Curso</th>
                  <th className="px-6 py-4">Materia</th>
                  <th className="px-6 py-4 text-center">1°</th>
                  <th className="px-6 py-4 text-center">2°</th>
                  <th className="px-6 py-4 text-center">3°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filas.map((f, i) => (
                  <tr key={`${f.alumnoId}-${f.materia}-${i}`} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">{f.alumnoNombre}</td>
                    <td className="px-6 py-4 text-muted-foreground">{f.anio} {f.division}</td>
                    <td className="px-6 py-4 text-muted-foreground">{f.materia}</td>
                    {([f.t1, f.t2, f.t3] as const).map((n, j) => (
                      <td key={j} className="px-6 py-4 text-center">
                        <span className={esDesaprobada(n) ? "font-bold text-destructive" : "font-semibold text-foreground"}>
                          {notaReal(n)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
