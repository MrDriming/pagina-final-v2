"use client"

import { useState } from "react"
import type { Rol } from "@/lib/mock-data"
import { CalendarDays, Clock, User, Edit3, Check, X, ShieldAlert } from "lucide-react"

interface Evaluacion {
  id: number
  materia: string
  fecha: string
  hora: string
  profesor: string
  tipo: string // Lección oral, escrito, entrega de proyecto técnico
  alumnoAsignado: string // Para controlar la privacidad estricta
}

export function CalendarioView({ rol }: { rol: Rol }) {
  // Mock adaptado con los apellidos de tu equipo y términos de secundaria técnica
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([
    { id: 1, materia: "Sistemas Digitales", fecha: "2026-07-06", hora: "07:30", profesor: "Ing. Blanco", tipo: "Entrega de Proyecto (Barco Arduino)", alumnoAsignado: "Blanco, Facundo" },
    { id: 2, materia: "Taller de Electromecánica", fecha: "2026-07-08", hora: "09:40", profesor: "Prof. Enriquez", tipo: "Evaluación Escrita", alumnoAsignado: "Blanco, Facundo" },
    { id: 3, materia: "Diseño y Desarrollo Web", fecha: "2026-07-09", hora: "11:00", profesor: "Lic. Nuñez", tipo: "Lección Oral HTML/CSS", alumnoAsignado: "Nuñez, Lautaro" },
    { id: 4, materia: "Sistemas Digitales", fecha: "2026-07-13", hora: "07:30", profesor: "Ing. Blanco", tipo: "Entrega de Proyecto (Barco Arduino)", alumnoAsignado: "Enriquez, Tomás" },
  ])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [nuevaFecha, setNuevaFecha] = useState("")
  const [nuevaHora, setNuevaHora] = useState("")

  const iniciarEdicion = (ev: Evaluacion) => {
    setEditingId(ev.id)
    setNuevaFecha(ev.fecha)
    setNuevaHora(ev.hora)
  }

  const guardarFecha = (id: number) => {
    setEvaluaciones(evaluaciones.map(ev => ev.id === id ? { ...ev, fecha: nuevaFecha, hora: nuevaHora } : ev))
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Cronograma de Evaluaciones</h1>
          <p className="text-sm text-muted-foreground">
            {rol === "alumno" && "Tus próximas evaluaciones trimestrales y entregas de taller."}
            {rol === "profesor" && "Gestión de fechas de exámenes y lecciones de tus asignaturas."}
            {rol === "admin" && "Seguimiento general del calendario académico institucional."}
          </p>
        </div>
        
        {rol === "admin" && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400">
            <ShieldAlert className="size-3.5" />
            <span>Calendario Institucional (Solo Lectura)</span>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {evaluaciones.map((ev) => {
          // REGLA DE PRIVACIDAD: El alumno solo ve sus propios exámenes
          if (rol === "alumno" && ev.alumnoAsignado !== "Blanco, Facundo") return null

          const isEditing = editingId === ev.id

          return (
            <div 
              key={ev.id} 
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border border-border bg-card shadow-xs hover:border-emerald-500/20 transition-colors gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-200/40">
                    {ev.tipo}
                  </span>
                  {rol !== "alumno" && (
                    <span className="text-xs text-muted-foreground">
                      • Alumno: <strong className="text-foreground font-medium">{ev.alumnoAsignado}</strong>
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-base text-foreground">{ev.materia}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="size-3.5" /> Dictado por: {ev.profesor}
                </p>
              </div>

              {/* Controles de fecha o inputs de edición */}
              <div className="flex items-center gap-3 sm:self-center self-end">
                {isEditing ? (
                  <div className="flex items-center gap-2 bg-muted p-2 rounded-lg border border-border">
                    <input 
                      type="date" 
                      value={nuevaFecha} 
                      onChange={(e) => setNuevaFecha(e.target.value)} 
                      className="text-xs rounded border border-input bg-background p-1 outline-none text-foreground focus:border-emerald-500"
                    />
                    <input 
                      type="time" 
                      value={nuevaHora} 
                      onChange={(e) => setNuevaHora(e.target.value)} 
                      className="text-xs rounded border border-input bg-background p-1 outline-none text-foreground focus:border-emerald-500"
                    />
                    <button onClick={() => guardarFecha(ev.id)} className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                      <Check className="size-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded border bg-background text-muted-foreground hover:bg-muted">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1 font-mono text-xs text-right">
                    <span className="flex items-center gap-1 font-semibold text-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
                      <CalendarDays className="size-3.5 text-emerald-600" /> {ev.fecha}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground pr-1">
                      <Clock className="size-3" /> {ev.hora} hs
                    </span>
                  </div>
                )}

                {/* Botón de edición visible y funcional SOLAMENTE para el rol profesor */}
                {rol === "profesor" && !isEditing && (
                  <button 
                    onClick={() => iniciarEdicion(ev)}
                    className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
                    title="Modificar fecha de evaluación"
                  >
                    <Edit3 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}