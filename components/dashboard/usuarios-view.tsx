"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Plus } from "lucide-react"
import type { Catedra } from "@/lib/catedras"
import { ANIOS, DIVISIONES } from "@/lib/grades"
import {
  asignarCatedraAction,
  quitarCatedraAction,
  cambiarRolAction,
  asignarCursoAction,
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
  usuarioActualId: string
}

const ROLES = ["alumno", "profesor", "admin"] as const

export function UsuariosView({
  usuarios,
  materias,
  seleccionado,
  catedras,
  usuarioActualId,
}: Props) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [materiaId, setMateriaId] = useState("")
  const [division, setDivision] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [rol, setRol] = useState(seleccionado?.rol ?? "")
  const [anioCurso, setAnioCurso] = useState(seleccionado?.anio ?? "")
  const [divisionCurso, setDivisionCurso] = useState(seleccionado?.division ?? "")

  // El select de rol y los de curso se reinician cuando cambia el usuario
  // seleccionado, para no arrastrar el valor del usuario anterior.
  useEffect(() => {
    setRol(seleccionado?.rol ?? "")
    setAnioCurso(seleccionado?.anio ?? "")
    setDivisionCurso(seleccionado?.division ?? "")
    setError(null)
  }, [seleccionado?.userId])

  const esUsuarioActual = seleccionado?.userId === usuarioActualId

  const guardarRol = () => {
    if (!seleccionado || !rol) return
    setError(null)
    startTransition(async () => {
      const r = await cambiarRolAction({ userId: seleccionado.userId, rol })
      if (!r.ok) { setError(r.error ?? "No se pudo cambiar el rol"); return }
      router.refresh()
    })
  }

  const guardarCurso = () => {
    if (!seleccionado) return
    setError(null)
    startTransition(async () => {
      const r = await asignarCursoAction({
        userId: seleccionado.userId,
        anio: anioCurso || null,
        division: divisionCurso || null,
      })
      if (!r.ok) { setError(r.error ?? "No se pudo asignar el curso"); return }
      router.refresh()
    })
  }

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
          Rol, curso y cátedras de cada usuario del campus.
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
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="font-semibold text-foreground">{seleccionado.nombre || "(sin nombre)"}</h2>
                <p className="text-xs text-muted-foreground">{seleccionado.rol}</p>
              </div>

              <div className="space-y-2 border-b border-border pb-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rol
                </p>
                {esUsuarioActual && (
                  <p className="text-xs text-muted-foreground">
                    No podés cambiar tu propio rol.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={rol}
                    disabled={esUsuarioActual}
                    onChange={(e) => setRol(e.target.value)}
                    className={selectClass}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    disabled={pendiente || esUsuarioActual || rol === seleccionado.rol}
                    onClick={guardarRol}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Guardar rol
                  </button>
                </div>
              </div>

              {seleccionado.rol === "alumno" && (
                <div className="space-y-2 border-b border-border pb-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Curso
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={anioCurso ?? ""}
                      onChange={(e) => setAnioCurso(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Sin año…</option>
                      {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select
                      value={divisionCurso ?? ""}
                      onChange={(e) => setDivisionCurso(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Sin división…</option>
                      {DIVISIONES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button
                      disabled={pendiente}
                      onClick={guardarCurso}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Guardar curso
                    </button>
                  </div>
                </div>
              )}

              {seleccionado.rol !== "profesor" ? (
                <p className="text-sm text-muted-foreground">
                  Solo los profesores tienen cátedras. {seleccionado.nombre || "Este usuario"} es{" "}
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
          )}
        </div>
      </div>
    </div>
  )
}
