"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck } from "lucide-react"
import type { Notificacion } from "@/lib/notificaciones"
import {
  marcarLeidaAction,
  marcarTodasLeidasAction,
} from "@/app/(campus)/notificaciones/actions"

/** "hace 5 minutos", "ayer". Suficiente para una campana. */
function haceCuanto(d: Date | null): string {
  if (!d) return ""
  const ms = Date.now() - new Date(d).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  return dias === 1 ? "ayer" : `hace ${dias} días`
}

export function NotificacionesMenu({
  notificaciones,
}: {
  notificaciones: Notificacion[]
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [, startTransition] = useTransition()
  const contenedor = useRef<HTMLDivElement>(null)

  const noLeidas = notificaciones.filter((n) => !n.leidaAt).length

  // Cerrar al hacer click afuera o con Escape. Sin esto el panel queda
  // abierto tapando media pantalla.
  useEffect(() => {
    if (!abierto) return

    const alClickear = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false)
    }

    document.addEventListener("mousedown", alClickear)
    document.addEventListener("keydown", alTeclear)
    return () => {
      document.removeEventListener("mousedown", alClickear)
      document.removeEventListener("keydown", alTeclear)
    }
  }, [abierto])

  const abrir = (n: Notificacion) => {
    setAbierto(false)
    startTransition(async () => {
      if (!n.leidaAt) await marcarLeidaAction(n.id)
      if (n.link) router.push(n.link)
      else router.refresh()
    })
  }

  const marcarTodas = () => {
    startTransition(async () => {
      await marcarTodasLeidasAction()
      router.refresh()
    })
  }

  return (
    <div className="relative" ref={contenedor}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted"
        aria-label={
          noLeidas > 0
            ? `Notificaciones, ${noLeidas} sin leer`
            : "Notificaciones"
        }
        aria-expanded={abierto}
      >
        <Bell className="size-5" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4.5 text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground">
              Notificaciones
            </span>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodas}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <CheckCheck className="size-3.5" /> Marcar todas
              </button>
            )}
          </div>

          {notificaciones.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tenés notificaciones.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {notificaciones.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => abrir(n)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      n.leidaAt ? "" : "bg-emerald-500/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.leidaAt && (
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {n.titulo}
                        </p>
                        {n.cuerpo && (
                          <p className="text-xs text-muted-foreground">
                            {n.cuerpo}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                          {haceCuanto(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
