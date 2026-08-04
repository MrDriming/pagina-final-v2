"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Rol } from "@/lib/mock-data"
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Landmark,
  MessageSquare,
  Settings,
  Users,
  X,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: Rol[]
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, roles: ["alumno", "profesor", "admin"] },
  { href: "/notas", label: "Notas", icon: ClipboardList, roles: ["alumno", "profesor", "admin"] },
  { href: "/calendario", label: "Calendario de exámenes", icon: CalendarDays, roles: ["alumno", "profesor", "admin"] },
  { href: "/mesas", label: "Mesas especiales", icon: Landmark, roles: ["alumno", "profesor", "admin"] },
  { href: "/consultas", label: "Consultas Docentes", icon: MessageSquare, roles: ["alumno", "profesor"] },
  { href: "/catedras", label: "Mis Cátedras", icon: Settings, roles: ["profesor"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { href: "/config", label: "Configuración", icon: Settings, roles: ["admin", "profesor"] },
]

export function Sidebar({
  rol,
  open,
  onClose,
}: {
  rol: Rol
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(rol))

  return (
    <>
      {/* Backdrop móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-wide text-white">IPESMI Técnico</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Campus Virtual</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navegación principal">
          {items.map((item) => {
            const Icon = item.icon
            // Coincidencia exacta: si no, "/" quedaría activo en toda ruta.
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-xs text-sidebar-foreground/55">Ciclo lectivo 2026</p>
          <p className="text-xs text-sidebar-foreground/40">v1.0 · Producción</p>
        </div>
      </aside>
    </>
  )
}
