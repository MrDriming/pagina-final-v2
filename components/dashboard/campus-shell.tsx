"use client"

import { useEffect, useState } from "react"
import type { SessionUser } from "@/lib/session"
import type { Notificacion } from "@/lib/notificaciones"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"

/** Clave de localStorage donde queda si el usuario colapsó el menú. */
const CLAVE_COLAPSO = "campus:sidebar-colapsado"

export function CampusShell({
  user,
  devBypass,
  notificaciones,
  children,
}: {
  user: SessionUser
  devBypass: boolean
  notificaciones: Notificacion[]
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [colapsado, setColapsado] = useState(false)

  // El estado inicial es "expandido" y recién después se lee localStorage.
  // Leerlo durante el render rompería la hidratación: el servidor no tiene
  // localStorage y pintaría lo contrario. El precio es un parpadeo del menú
  // ancho para quien lo dejó colapsado.
  useEffect(() => {
    setColapsado(window.localStorage.getItem(CLAVE_COLAPSO) === "1")
  }, [])

  const toggleColapso = () => {
    setColapsado((previo) => {
      const proximo = !previo
      window.localStorage.setItem(CLAVE_COLAPSO, proximo ? "1" : "0")
      return proximo
    })
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        rol={user.role}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        colapsado={colapsado}
        onToggleColapso={toggleColapso}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          rol={user.role}
          onOpenMenu={() => setMenuOpen(true)}
          nombre={user.name}
          detalle={user.email}
          devBypass={devBypass}
          notificaciones={notificaciones}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
