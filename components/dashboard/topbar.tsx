"use client"

import { cn } from "@/lib/utils"
import { PERFIL, ROLES, type Rol } from "@/lib/mock-data"
import { Menu, Bell, Search } from "lucide-react"
import { LogoutButton } from "@/components/auth/logout-button"

export function Topbar({
  rol,
  onRolChange,
  onOpenMenu,
  nombre,
  detalle,
}: {
  rol: Rol
  onRolChange: (rol: Rol) => void
  onOpenMenu: () => void
  nombre?: string
  detalle?: string
}) {
  const perfil = PERFIL[rol]
  // Si viene el usuario real de la sesión lo usamos; si no, el mock de demo.
  const nombreMostrado = nombre || perfil.nombre
  const detalleMostrado = detalle || perfil.detalle
  const iniciales = nombreMostrado
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6">
      <button
        onClick={onOpenMenu}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <div className="relative hidden flex-1 md:block md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar materia, examen o alumno..."
          className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {/* Selector de rol (demo) */}
        <div
          className="flex items-center rounded-lg border border-border bg-muted p-0.5"
          role="group"
          aria-label="Cambiar rol"
        >
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => onRolChange(r.value)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                rol === r.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label="Notificaciones"
        >
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
        </button>

        <div className="flex items-center gap-2.5 border-l border-border pl-2 md:pl-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {iniciales}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-foreground">{nombreMostrado}</p>
            <p className="text-xs text-muted-foreground">{detalleMostrado}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
