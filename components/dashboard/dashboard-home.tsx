"use client"

import Link from "next/link"
import type { SessionUser } from "@/lib/session"
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

export function DashboardHome({
  user,
  resumen,
}: {
  user: SessionUser
  resumen: { promedio: number; aprobadas: number; pendientes: number }
}) {
  const { promedio, aprobadas, pendientes } = resumen

  // Solo las estadísticas del alumno salen de datos reales (sus notas
  // cargadas). Para profesor/admin no hay todavía una fuente real de datos
  // agregados, así que no se muestra ningún número inventado.
  const stats =
    user.role === "alumno"
      ? [
          { label: "Promedio general", value: promedio.toFixed(1), hint: "Sobre materias con final cargado", icon: TrendingUp, tone: "primary" as const },
          { label: "Materias aprobadas", value: `${aprobadas}`, hint: "Ciclo lectivo 2026", icon: CheckCircle2, tone: "success" as const },
          { label: "Pendientes / a recuperar", value: `${pendientes}`, hint: "Requieren atención", icon: AlertTriangle, tone: "destructive" as const },
        ]
      : []

  const detalle =
    user.role === "alumno"
      ? [user.anio, user.division].filter(Boolean).join(" ") || "Sin curso asignado"
      : user.role === "profesor"
        ? "Profesor/a"
        : "Administrador/a"

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-r from-primary to-primary/85 p-6 text-primary-foreground">
        <p className="text-sm text-primary-foreground/80">Bienvenido/a de nuevo,</p>
        <h1 className="mt-1 text-2xl font-semibold text-balance">{user.name}</h1>
        <p className="mt-1 text-sm text-primary-foreground/85">{detalle} · {user.email}</p>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Próximas evaluaciones */}
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
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              El calendario de exámenes todavía no está cargado.
            </p>
          </div>
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
