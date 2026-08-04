"use client"

import { cn } from "@/lib/utils"
import type { Rol } from "@/lib/mock-data"
import {
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Landmark,
  MessageSquare, // Icono para consultas
  Settings,
  Users,
  X,
} from "lucide-react"

// 1. Agregamos "consultas" y "catedras" a la unión de tipos
export type SectionId = "inicio" | "notas" | "calendario" | "mesas" | "consultas" | "catedras" | "usuarios" | "config"

interface NavItem {
  id: SectionId
  label: string
  icon: React.ElementType
  roles: Rol[]
}

// 2. Agregamos las nuevas opciones en la lista fija respetando la lógica de permisos
const NAV_ITEMS: NavItem[] = [
  { id: "inicio", label: "Inicio", icon: LayoutDashboard, roles: ["alumno", "profesor", "admin"] },
  { id: "notas", label: "Notas", icon: ClipboardList, roles: ["alumno", "profesor", "admin"] },
  { id: "calendario", label: "Calendario de exámenes", icon: CalendarDays, roles: ["alumno", "profesor", "admin"] },
  { id: "mesas", label: "Mesas especiales", icon: Landmark, roles: ["alumno", "profesor", "admin"] },
  
  // NUEVO: "Consultas" disponible para Alumnos y Profesores
  { id: "consultas", label: "Consultas Docentes", icon: MessageSquare, roles: ["alumno", "profesor"] },
  
  // NUEVO: "Mis Cátedras" exclusivo para el Profesor (para configurar materias/años)
  { id: "catedras", label: "Mis Cátedras / Años", icon: Settings, roles: ["profesor"] },
  
  { id: "usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { id: "config", label: "Configuración", icon: Settings, roles: ["admin", "profesor"] },
]

export function Sidebar({
  rol,
  active,
  onSelect,
  open,
  onClose,
}: {
  rol: Rol
  active: SectionId
  onSelect: (section: SectionId) => void
  open: boolean
  onClose: () => void
}) {
  // Filtramos la lista según el rol activo de la sesión
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

      {/* Contenedor principal del Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-wide text-white">IPESMI Técnico</span>
            <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase font-semibold">Campus Virtual</span>
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
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id)
                  onClose()
                }}
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
              </button>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-xs text-sidebar-foreground/55">
            Ciclo lectivo 2026
          </p>
          <p className="text-xs text-sidebar-foreground/40">v1.0 · Producción</p>
        </div>
      </aside>
    </>
  )
}