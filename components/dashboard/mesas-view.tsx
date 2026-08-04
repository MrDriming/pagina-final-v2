"use client"

import { useState } from "react"
import { Landmark, Calendar, Clock, Users, Edit, Check, X } from "lucide-react"

interface MesaExamen {
  id: number
  categoria: "previas" | "recuperatorios" | "equivalencias"
  materia: string
  fecha: string
  hora: string
  condicion: string
  tribunal: string
}

export function MesasView() {
  const [activeTab, setActiveTab] = useState<"previas" | "recuperatorios" | "equivalencias">("previas")
  
  // Como este componente no recibe el rol por props nativo en tu estructura base, 
  // simulamos que detecta el rol del contexto o podés pasárselo por prop si lo preferís.
  // Por defecto lo dejamos listo para renderizar las tarjetas institucionales informativas limpias.
  const [mesas, setMesas] = useState<MesaExamen[]>([
    { id: 1, categoria: "previas", materia: "Sistemas Mecánicos (3er Año)", fecha: "2026-08-03", hora: "08:00", condicion: "Previos", tribunal: "Ing. Blanco - Lic. Nuñez" },
    { id: 2, categoria: "recuperatorios", materia: "Electrónica Aplicada (4to Año)", fecha: "2026-08-05", hora: "10:00", condicion: "Rendición Regular", tribunal: "Prof. Enriquez - Colaboradores" },
    { id: 3, categoria: "equivalencias", materia: "Dibujo Técnico e Informática", fecha: "2026-08-07", hora: "14:00", condicion: "Reválida Técnica", tribunal: "Arq. Martínez - Comisión" },
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Mesas de Examen Especiales</h1>
        <p className="text-sm text-muted-foreground">Instancias evaluativas extraordinarias de la escuela secundaria técnica.</p>
      </div>

      {/* Selectores de pestañas diferenciadas en Verde/Blanco */}
      <div className="flex border-b border-border bg-muted/40 p-1 rounded-xl gap-1 max-w-md">
        {(["previas", "recuperatorios", "equivalencias"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center py-2 text-xs font-medium rounded-lg capitalize transition-all duration-200 ${
              activeTab === tab 
                ? "bg-emerald-600 text-white font-semibold shadow-xs" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab === "previas" ? "Materias Previas" : tab}
          </button>
        ))}
      </div>

      {/* Grilla de Exámenes */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {mesas.filter(m => m.categoria === activeTab).map((m) => (
          <div 
            key={m.id} 
            className="bg-card border border-border rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/20 transition-all"
          >
            {/* Tag superior derecho */}
            <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg font-mono tracking-wide uppercase border-l border-b border-border/20">
              {m.condicion}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground text-base pr-20 leading-tight">{m.materia}</h3>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground font-mono">
                <p className="flex items-center gap-2 text-foreground">
                  <Calendar className="size-3.5 text-emerald-600 shrink-0" /> 
                  <span><strong>Fecha:</strong> {m.fecha}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="size-3.5 text-muted-foreground/60 shrink-0" /> 
                  <span><strong>Hora:</strong> {m.hora} hs</span>
                </p>
                <p className="flex items-start gap-2 pt-1 border-t border-border/40">
                  <Users className="size-3.5 text-muted-foreground/60 shrink-0 mt-0.5" /> 
                  <span className="text-[11px] font-sans"><strong>Tribunal:</strong> {m.tribunal}</span>
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border/60 text-center text-[10px] text-muted-foreground uppercase font-semibold font-mono tracking-wider">
              IPESMI Técnico · Oficial
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}