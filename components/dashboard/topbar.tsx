"use client"

import type { Role } from "@/lib/session"
import { Menu, Bell, Search } from "lucide-react"
import { LogoutButton } from "@/components/auth/logout-button"

export function Topbar({
  rol,
  onOpenMenu,
  nombre,
  detalle,
  devBypass,
}: {
  rol: Role
  onOpenMenu: () => void
  nombre: string
  detalle: string
  // Viene del servidor (campus-shell <- layout de /(campus)), no de
  // `lib/dev-auth` directamente: ese módulo no es "use client"-safe porque
  // reexporta un tipo de `lib/session.ts`, que sí es server-only.
  devBypass: boolean
}) {
  const iniciales = nombre
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
        {/* Solo en desarrollo, y como indicador: el rol real lo decide el servidor. */}
        {devBypass && (
          <span className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            rol: {rol} · DEV_BYPASS_ROLE
          </span>
        )}

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
            <p className="text-sm font-medium text-foreground">{nombre}</p>
            <p className="text-xs text-muted-foreground">{detalle}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
