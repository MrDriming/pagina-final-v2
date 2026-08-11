"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/session"
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Landmark,
  MessageSquare,
  Settings,
  Users,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, roles: ["alumno", "profesor", "admin"] },
  { href: "/notas", label: "Notas", icon: ClipboardList, roles: ["alumno", "profesor", "admin"] },
  { href: "/calendario", label: "Calendario de exámenes", icon: CalendarDays, roles: ["alumno", "profesor", "admin"] },
  { href: "/mesas", label: "Mesas especiales", icon: Landmark, roles: ["alumno", "profesor", "admin"] },
  { href: "/consultas", label: "Consultas Docentes", icon: MessageSquare, roles: ["alumno", "profesor"] },
  { href: "/catedras", label: "Mis Cátedras", icon: Settings, roles: ["profesor"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { href: "/auditoria", label: "Auditoría", icon: ScrollText, roles: ["admin"] },
  { href: "/config", label: "Configuración", icon: Settings, roles: ["admin", "profesor"] },
]

export function Sidebar({
  rol,
  open,
  onClose,
  colapsado,
  onToggleColapso,
}: {
  rol: Role
  /** Drawer móvil. En desktop el sidebar está siempre visible. */
  open: boolean
  onClose: () => void
  /** Modo angosto, solo desktop: iconos sin texto. */
  colapsado: boolean
  onToggleColapso: () => void
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
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[transform,width] lg:sticky lg:translate-x-0",
          // El drawer móvil se abre siempre ancho: colapsarlo ahí no tiene
          // sentido, porque el espacio horizontal no es el problema.
          "w-64",
          colapsado && "lg:w-16",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border",
            colapsado ? "lg:justify-center lg:px-0" : "",
            "justify-between px-6",
          )}
        >
          <div className={cn("flex flex-col", colapsado && "lg:hidden")}>
            <span className="text-lg font-bold tracking-wide text-white">IPESMI Técnico</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Campus Virtual</span>
          </div>

          {/* Colapsar: solo desktop. En móvil el botón de al lado es "cerrar". */}
          <button
            onClick={onToggleColapso}
            className="hidden rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:block"
            aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
            title={colapsado ? "Expandir menú" : "Colapsar menú"}
          >
            {colapsado ? (
              <PanelLeftOpen className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </button>

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
                // Colapsado el texto no está, así que el nombre accesible sale
                // del title y del aria-label.
                title={colapsado ? item.label : undefined}
                aria-label={colapsado ? item.label : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  colapsado && "lg:justify-center lg:px-0",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-4.5 shrink-0" />
                <span className={cn("truncate", colapsado && "lg:hidden")}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div
          className={cn(
            "border-t border-sidebar-border px-5 py-4",
            colapsado && "lg:hidden",
          )}
        >
          <p className="text-xs text-sidebar-foreground/55">Ciclo lectivo 2026</p>
          <p className="text-xs text-sidebar-foreground/40">En desarrollo</p>
        </div>
      </aside>
    </>
  )
}
