"use client"

import { useState } from "react"
import type { Role } from "@/lib/session"
import { MessageSquare, Send, CheckCircle2, Clock } from "lucide-react"

export function ConsultasView({ rol }: { rol: Role }) {
  const [mensaje, setMensaje] = useState("")

  // Simulación de bandeja de consultas
  const consultasMock = [
    { id: 1, alumno: "Blanco, Facundo", materia: "Programación I", duda: "No me compila el script de Arduino del barquito al conectar el Bluetooth.", estado: "respondido", respuesta: "Revisá los pines TX y RX, recordá cruzarlos." },
    { id: 2, alumno: "Nuñez, Lautaro", materia: "Diseño Web", duda: "Para qué sirve exactamente la etiqueta <section> en el layout?", estado: "pendiente", respuesta: null }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Consultas Docentes</h1>
        <p className="text-sm text-muted-foreground">
          {rol === "alumno" 
            ? "Envia tus dudas técnicas directas a tus profesores de cátedra." 
            : "Bandeja de consultas académicas de tus alumnos asignados."}
        </p>
      </div>

      {rol === "alumno" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Nueva Consulta</h2>
          <div className="space-y-2">
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribí tu consulta aquí..."
              className="w-full min-h-[100px] rounded-lg border border-input bg-background p-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
            />
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              <Send className="size-4" /> Enviar Consulta
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Historial de Mensajes</h2>
        <div className="grid gap-4">
          {consultasMock.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider font-mono">{c.materia}</span>
                {c.estado === "respondido" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success border border-success/20">
                    <CheckCircle2 className="size-3" /> Respondido
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning-foreground border border-warning/30">
                    <Clock className="size-3" /> Pendiente
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground font-medium">"{c.duda}"</p>
              <p className="text-xs text-muted-foreground">Enviado por: {c.alumno}</p>
              
              {c.respuesta && (
                <div className="mt-2 rounded-lg bg-muted p-3 border border-border">
                  <p className="text-xs font-semibold text-foreground">Respuesta del Profesor:</p>
                  <p className="text-sm text-muted-foreground mt-1">{c.respuesta}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}