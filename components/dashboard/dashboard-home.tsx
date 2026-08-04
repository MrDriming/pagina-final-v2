"use client"

import Link from "next/link"
import { EVENTOS, MESAS, PERFIL, type Rol } from "@/lib/mock-data"
import { StatusBadge } from "./status-badge"
import {
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  ArrowRight,
} from "lucide-react"

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string
  value: string
  hint: string
  icon: React.ElementType
  tone?: "primary" | "success" | "destructive" | "warning"
}) {
  const toneBg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    destructive: "bg-destructive/12 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-lg ${toneBg[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function formatFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  })
}

export function DashboardHome({
  rol,
  resumen,
}: {
  rol: Rol
  resumen: { promedio: number; aprobadas: number; pendientes: number }
}) {
  const perfil = PERFIL[rol]
  const { promedio, aprobadas, pendientes } = resumen
  const proximos = [...EVENTOS].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 4)

  const stats =
    rol === "alumno"
      ? [
          { label: "Promedio general", value: promedio.toFixed(1), hint: "Sobre materias con final cargado", icon: TrendingUp, tone: "primary" as const },
          { label: "Materias aprobadas", value: `${aprobadas}`, hint: "Ciclo lectivo 2026", icon: CheckCircle2, tone: "success" as const },
          { label: "Pendientes / a recuperar", value: `${pendientes}`, hint: "Requieren atención", icon: AlertTriangle, tone: "destructive" as const },
          { label: "Próximos exámenes", value: `${EVENTOS.length}`, hint: "En las próximas semanas", icon: CalendarClock, tone: "warning" as const },
        ]
      : rol === "profesor"
        ? [
            { label: "Cursos a cargo", value: "3", hint: "Bases de Datos y Programación III", icon: TrendingUp, tone: "primary" as const },
            { label: "Notas por cargar", value: "12", hint: "Cierre del 2.º cuatrimestre", icon: AlertTriangle, tone: "warning" as const },
            { label: "Exámenes publicados", value: "5", hint: "Visibles para los alumnos", icon: CalendarClock, tone: "success" as const },
            { label: "Mesas asignadas", value: "4", hint: "Como tribunal examinador", icon: Landmark, tone: "destructive" as const },
          ]
        : [
            { label: "Alumnos activos", value: "428", hint: "Matrícula 2026", icon: TrendingUp, tone: "primary" as const },
            { label: "Docentes", value: "37", hint: "Plantel completo", icon: CheckCircle2, tone: "success" as const },
            { label: "Mesas programadas", value: `${MESAS.length}`, hint: "Previas, recuperatorios y equivalencias", icon: Landmark, tone: "warning" as const },
            { label: "Solicitudes pendientes", value: "9", hint: "Equivalencias por revisar", icon: AlertTriangle, tone: "destructive" as const },
          ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-r from-primary to-primary/85 p-6 text-primary-foreground">
        <p className="text-sm text-primary-foreground/80">Bienvenido/a de nuevo,</p>
        <h1 className="mt-1 text-2xl font-semibold text-balance">{perfil.nombre}</h1>
        <p className="mt-1 text-sm text-primary-foreground/85">{perfil.detalle} · Legajo {perfil.legajo}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Próximos exámenes */}
        <div className="rounded-xl border border-border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Próximas evaluaciones</h2>
            <Link
              href="/calendario"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver calendario <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {proximos.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex w-12 flex-col items-center rounded-lg bg-muted py-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {formatFecha(e.fecha).split(" ")[1]}
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {formatFecha(e.fecha).split(" ")[0]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {e.titulo} · {e.materia}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.hora} hs · {e.aula} · {e.docente}
                  </p>
                </div>
                <StatusBadge tone={e.tipo === "final" ? "destructive" : e.tipo === "parcial" ? "warning" : "primary"}>
                  {e.tipo === "tp" ? "TP" : e.tipo}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </div>

        {/* Accesos rápidos */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Accesos rápidos</h2>
          </div>
          <div className="space-y-2 p-4">
            <QuickLink label="Ver mis notas" href="/notas" icon={TrendingUp} />
            <QuickLink label="Calendario de exámenes" href="/calendario" icon={CalendarClock} />
            <QuickLink label="Mesas especiales" href="/mesas" icon={Landmark} />
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickLink({
  label,
  href,
  icon: Icon,
}: {
  label: string
  href: string
  icon: React.ElementType
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="flex-1">{label}</span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  )
}
