"use client"

import { BookOpen, Layers, Plus } from "lucide-react"

export function CatedrasView() {
  // Mock de las materias técnicas del IPESMI
  const misMaterias = [
    { id: 1, nombre: "Programación I", año: "4to Año Técnico", alumnos: 24 },
    { id: 2, nombre: "Diseño y Desarrollo Web", año: "5to Año Técnico", alumnos: 18 },
    { id: 3, nombre: "Sistemas Digitales", año: "4to Año Técnico", alumnos: 24 }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mis Cátedras y Años</h1>
          <p className="text-sm text-muted-foreground">Configuración del dictado de asignaturas técnicas.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="size-4" /> Asociar Materia
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {misMaterias.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-card p-5 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-start justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                <BookOpen className="size-5" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                <Layers className="size-3" /> {m.año}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-foreground text-lg">{m.nombre}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{m.alumnos} alumnos inscritos en el curso</p>
            
            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <button className="flex-1 text-center rounded-md border border-border bg-background py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                Ver Alumnos
              </button>
              <button className="flex-1 text-center rounded-md border border-transparent bg-emerald-50 text-emerald-600 py-1.5 text-xs font-medium hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400">
                Planificación
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}