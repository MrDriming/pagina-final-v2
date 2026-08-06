"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Plus } from "lucide-react"
import type { Catedra } from "@/lib/catedras"
import { DIVISIONES } from "@/lib/grades"
import {
  asignarCatedraAction,
  quitarCatedraAction,
} from "@/app/(campus)/usuarios/actions"

interface Usuario {
  userId: string
  nombre: string
  rol: string
  anio: string | null
  division: string | null
}

interface Props {
  usuarios: Usuario[]
  materias: { id: string; nombre: string; anio: string }[]
  seleccionado: Usuario | null
  catedras: Catedra[]
}

export function UsuariosView({ usuarios, materias, seleccionado, catedras }: Props) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [materiaId, setMateriaId] = useState("")
  const [division, setDivision] = useState("")
  const [error, setError] = useState<string | null>(null)

  const agregar = () => {
    if (!seleccionado || !materiaId || !division) return
    setError(null)
    startTransition(async () => {
      const r = await asignarCatedraAction({
        profesorId: seleccionado.userId,
        materiaId,
        division,
      })
      if (!r.ok) { setError(r.error ?? "No se pudo asignar"); return }
      setMateriaId("")
      setDivision("")
      router.refresh()
    })
  }

  const quitar = (id: string) => {
    setError(null)
    startTransition(async () => {
      const r = await quitarCatedraAction(id)
      if (!r.ok) { setError(r.error ?? "No se pudo quitar"); return }
      router.refresh()
    })
  }

  const selectClass =
    "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Gestión de usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Asignación de materias y divisiones a cada docente.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {usuarios.map((u) => (
            <li key={u.userId}>
              <button
                onClick={() => router.push(`/usuarios?u=${u.userId}`)}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  seleccionado?.userId === u.userId ? "bg-muted" : ""
                }`}
              >
                <p className="text-sm font-medium text-foreground">
                  {u.nombre || "(sin nombre)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.rol}
                  {u.anio ? ` · ${u.anio} ${u.division ?? ""}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-border bg-card p-5">
          {!seleccionado ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Elegí un usuario de la lista.
            </p>
          ) : seleccionado.rol !== "profesor" ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Solo los profesores tienen cátedras. {seleccionado.nombre} es{" "}
              {seleccionado.rol}.
            </p>
          ) : (
            <div className="space-y-5">
              <h2 className="font-semibold text-foreground">
                Cátedras de {seleccionado.nombre}
              </h2>

              {catedras.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no tiene cátedras asignadas.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {catedras.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-foreground">
                        {c.materiaNombre} — {c.anio} {c.division}
                      </span>
                      <button
                        disabled={pendiente}
                        onClick={() => quitar(c.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Quitar cátedra"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className={selectClass}>
                  <option value="">Materia…</option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} ({m.anio})</option>
                  ))}
                </select>
                <select value={division} onChange={(e) => setDivision(e.target.value)} className={selectClass}>
                  <option value="">División…</option>
                  {DIVISIONES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <button
                  disabled={pendiente || !materiaId || !division}
                  onClick={agregar}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Plus className="size-4" /> Asignar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
