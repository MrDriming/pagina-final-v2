"use client"

import { useState } from "react"
import type { SessionUser } from "@/lib/session"
import { Sidebar, type SectionId } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"
import { DashboardHome } from "@/components/dashboard/dashboard-home"
import { NotasView } from "@/components/dashboard/notas-view"
import { CalendarioView } from "@/components/dashboard/calendario-view"
import { MesasView } from "@/components/dashboard/mesas-view"
import { ConsultasView } from "@/components/dashboard/consultas-view"
import { CatedrasView } from "@/components/dashboard/catedras-view"
import { Users, Settings } from "lucide-react"

interface ClientProps {
  inicialUser: SessionUser
}

// 2️⃣ COMPONENTE DE CLIENTE: Maneja la navegación interactiva interna
export function MainDashboardClient({ inicialUser }: ClientProps) {
  // Inicializamos el rol dinámicamente con el rol que viene de la base de datos (Better Auth)
  const [rol, setRol] = useState<"alumno" | "profesor" | "admin">(inicialUser.role)
  const [section, setSection] = useState<SectionId>("inicio")
  const [menuOpen, setMenuOpen] = useState(false)

  function handleRolChange(nuevo: "alumno" | "profesor" | "admin") {
    setRol(nuevo)
    if (nuevo === "alumno") {
      if (section === "usuarios" || section === "config" || section === "catedras") {
        setSection("inicio")
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        rol={rol}
        active={section}
        onSelect={setSection}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar rol={rol} onRolChange={handleRolChange} onOpenMenu={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
          {section === "inicio" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-600 font-medium">
                👋 Hola {inicialUser.name} — Conectado como {rol} en el sistema del IPESMI
              </div>
              <DashboardHome rol={rol} onNavigate={setSection} />
            </div>
          )}
          {section === "notas" && <NotasView rol={rol} />}
          {section === "calendario" && <CalendarioView rol={rol} />}
          {section === "mesas" && <MesasView />}
          {section === "consultas" && <ConsultasView rol={rol} />}
          {section === "catedras" && rol === "profesor" && <CatedrasView />}

          {section === "usuarios" && <Placeholder icon={Users} title="Gestión de usuarios" />}
          {section === "config" && <Placeholder icon={Settings} title="Configuración" />}
        </main>
      </div>
    </div>
  )
}

function Placeholder({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Módulo de administración disponible próximamente en esta sección.
      </p>
    </div>
  )
}