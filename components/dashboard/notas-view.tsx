"use client"

import { useState } from "react"
import type { Rol } from "@/lib/mock-data"
import { ShieldAlert, Edit2, Check, X, AlertTriangle } from "lucide-react"
import { notaParaAlumno, notaReal } from "@/lib/grades"

// Estructura de datos tipada para las calificaciones de la escuela técnica
interface CalificacionTrimestral {
  id: number
  alumno: string
  materia: string
  t1: number | null
  t2: number | null
  t3: number | null
}

export function NotasView({ rol }: { rol: Rol }) {
  // Simulación de la base de datos (Supabase) adaptada al IPESMI Técnico
  const [calificaciones, setCalificaciones] = useState<CalificacionTrimestral[]>([
    { id: 1, alumno: "Blanco, Facundo", materia: "Sistemas Digitales", t1: 8, t2: 7, t3: 9 },
    { id: 2, alumno: "Blanco, Facundo", materia: "Taller de Electromecánica", t1: 5, t2: 6, t3: 4 }, // t1 y t3 mostrarán "EP" al alumno
    { id: 3, alumno: "Nuñez, Lautaro", materia: "Sistemas Digitales", t1: 7, t2: 8, t3: 6 },
    { id: 4, alumno: "Nuñez, Lautaro", materia: "Diseño y Desarrollo Web", t1: 4, t2: 7, t3: 8 }, // t1 mostrará "EP" al alumno
    { id: 5, alumno: "Enriquez, Tomás", materia: "Instalaciones Eléctricas", t1: 9, t2: 9, t3: 10 },
  ])

  // Estados para la edición (Exclusivo Profesores)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ t1: number | null; t2: number | null; t3: number | null }>({
    t1: null,
    t2: null,
    t3: null,
  })

  // Función clave: Renderiza la nota protegiendo la privacidad según el archivo de lógica centralizado
  const renderNota = (nota: number | null) => {
    if (rol === "alumno") {
      const { display, ep } = notaParaAlumno(nota)
      if (ep) {
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
            {display}
          </span>
        )
      }
      return <span className="font-semibold text-foreground">{display}</span>
    }

    // Profesores y Admins ven la nota real. Si es un aplazo (< 6), se destaca en rojo
    const esAplazo = nota !== null && nota < 6
    return (
      <span className={esAplazo ? "font-bold text-destructive" : "font-semibold text-foreground"}>
        {notaReal(nota)}
      </span>
    )
  }

  const iniciarEdicion = (fila: CalificacionTrimestral) => {
    setEditingId(fila.id)
    setEditForm({ t1: fila.t1, t2: fila.t2, t3: fila.t3 })
  }

  const guardarCambios = (id: number) => {
    setCalificaciones(calificaciones.map(c => c.id === id ? { ...c, ...editForm } : c))
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado dinámico según el rol */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Planilla de Calificaciones</h1>
          <p className="text-sm text-muted-foreground">
            {rol === "alumno" && "Registro de rendimiento académico personal por trimestre."}
            {rol === "profesor" && "Panel de carga pedagógica y evaluación de trayectorias."}
            {rol === "admin" && "Supervisión institucional de boletines trimestrales."}
          </p>
        </div>

        {/* Alerta visual si entra un Preceptor/Directivo */}
        {rol === "admin" && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
            <ShieldAlert className="size-4 shrink-0" />
            <span>Modo Preceptor: Visualización y auditoría sin permisos de edición</span>
          </div>
        )}
      </div>

      {/* Explicación del sistema EP solo visible para el alumno */}
      {rol === "alumno" && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/10 flex gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-400 space-y-1">
            <p className="font-semibold">Aviso sobre el estado "EP" (En Proceso):</p>
            <p>Aquellos trimestres que requieran mayor profundización de contenidos figurarán bajo las siglas **EP**. Deberás coordinar con tu profesor las instancias de apoyo técnico.</p>
          </div>
        </div>
      )}

      {/* Tabla Principal */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {rol !== "alumno" && <th className="px-6 py-4">Estudiante</th>}
                <th className="px-6 py-4">Espacio Curricular (Materia)</th>
                <th className="px-6 py-4 text-center">1° Trimestre</th>
                <th className="px-6 py-4 text-center">2° Trimestre</th>
                <th className="px-6 py-4 text-center">3° Trimestre</th>
                {rol === "profesor" && <th className="px-6 py-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {calificaciones.map((row) => {
                // PRIVACIDAD ESTRICTA: El alumno "Facundo Blanco" solo ve sus registros
                if (rol === "alumno" && row.alumno !== "Blanco, Facundo") return null

                const isEditing = editingId === row.id

                return (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {rol !== "alumno" && (
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                        <div className="size-2 rounded-full bg-emerald-500" />
                        {row.alumno}
                      </td>
                    )}
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{row.materia}</td>
                    
                    {/* Celda 1° Trimestre */}
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editForm.t1 ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, t1: e.target.value ? Number(e.target.value) : null })}
                          className="w-14 text-center text-xs rounded border border-input bg-background p-1 outline-none focus:border-emerald-500"
                        />
                      ) : (
                        renderNota(row.t1)
                      )}
                    </td>

                    {/* Celda 2° Trimestre */}
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editForm.t2 ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, t2: e.target.value ? Number(e.target.value) : null })}
                          className="w-14 text-center text-xs rounded border border-input bg-background p-1 outline-none focus:border-emerald-500"
                        />
                      ) : (
                        renderNota(row.t2)
                      )}
                    </td>

                    {/* Celda 3° Trimestre */}
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editForm.t3 ?? ""}
                          onChange={(e) => setEditForm({ ...editForm, t3: e.target.value ? Number(e.target.value) : null })}
                          className="w-14 text-center text-xs rounded border border-input bg-background p-1 outline-none focus:border-emerald-500"
                        />
                      ) : (
                        renderNota(row.t3)
                      )}
                    </td>

                    {/* Columna de Acciones exclusiva del Profesor */}
                    {rol === "profesor" && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => guardarCambios(row.id)}
                              className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700"
                              title="Guardar notas"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted"
                              title="Cancelar"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => iniciarEdicion(row)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            title="Editar trimestre"
                          >
                            <Edit2 className="size-3.5" /> Editar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}