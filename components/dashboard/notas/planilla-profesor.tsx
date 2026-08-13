"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Edit2, Check, X } from "lucide-react"
import type { Catedra } from "@/lib/catedras"
import type { Planilla } from "@/lib/notas"
import { notaReal, esDesaprobada } from "@/lib/grades"
import { guardarNotaAction } from "@/app/(campus)/notas/actions"

interface Props {
  catedras: Catedra[]
  catedraId: string | null
  planilla: Planilla | null
}

export function PlanillaProfesor({ catedras, catedraId, planilla }: Props) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState({ t1: "", t2: "", t3: "", t4: "" })
  const [error, setError] = useState<string | null>(null)

  if (catedras.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          No tenés cátedras asignadas
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Pedile a Secretaría Académica que te asigne las materias y divisiones
          que dictás.
        </p>
      </div>
    )
  }

  const guardar = (alumnoId: string) => {
    if (!planilla) return
    setError(null)
    startTransition(async () => {
      const r = await guardarNotaAction({
        alumnoId,
        materiaId: planilla.catedra.materiaId,
        t1: form.t1,
        t2: form.t2,
        t3: form.t3,
        t4: form.t4,
      })
      if (!r.ok) {
        setError(r.error)
        return
      }
      setEditando(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Planilla de Calificaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Carga de notas de las materias que dictás.
          </p>
        </div>

        <select
          value={catedraId ?? ""}
          onChange={(e) => router.push(`/notas?catedra=${e.target.value}`)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Elegí una cátedra…</option>
          {catedras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.materiaNombre} — {c.anio} {c.division}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {!planilla ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
          Elegí una cátedra para ver sus alumnos.
        </div>
      ) : planilla.filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
          No hay alumnos cargados en {planilla.catedra.anio}{" "}
          {planilla.catedra.division}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Estudiante</th>
                  <th className="px-6 py-4 text-center">1° Trim.</th>
                  <th className="px-6 py-4 text-center">2° Trim.</th>
                  <th className="px-6 py-4 text-center">3° Trim.</th>
                  <th className="px-6 py-4 text-center">Promedio</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {planilla.filas.map((fila) => {
                  const editandoEsta = editando === fila.alumnoId
                  return (
                    <tr key={fila.alumnoId} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {fila.alumnoNombre}
                      </td>
                      {(["t1", "t2", "t3", "t4"] as const).map((k) => (
                        <td key={k} className="px-6 py-4 text-center">
                          {editandoEsta ? (
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={form[k]}
                              onChange={(e) =>
                                setForm({ ...form, [k]: e.target.value })
                              }
                              className="w-14 rounded border border-input bg-background p-1 text-center text-xs outline-none focus:border-emerald-500"
                            />
                          ) : (
                            <span
                              className={
                                esDesaprobada(fila[k])
                                  ? "font-bold text-destructive"
                                  : "font-semibold text-foreground"
                              }
                            >
                              {notaReal(fila[k])}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {editandoEsta ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={pendiente}
                              onClick={() => guardar(fila.alumnoId)}
                              className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                              title="Guardar notas"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setEditando(null)}
                              className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted"
                              title="Cancelar"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditando(fila.alumnoId)
                              setError(null)
                              setForm({
                                t1: fila.t1?.toString() ?? "",
                                t2: fila.t2?.toString() ?? "",
                                t3: fila.t3?.toString() ?? "",
                                t4: fila.t4?.toString() ?? "",
                              })
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            <Edit2 className="size-3.5" /> Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
