import type { ReactNode } from "react"

/**
 * Contenedor visual compartido por las pantallas sueltas de auth
 * (recuperar contraseña, cambiarla, confirmación, error), para que
 * coincidan con el look de `AuthScreen`.
 */
export function AuthCard({
  titulo,
  descripcion,
  children,
}: {
  titulo: string
  descripcion?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {titulo}
          </h2>
          {descripcion && (
            <p className="text-sm text-muted-foreground">{descripcion}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export const inputClass =
  "w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:border-emerald-500"

export const submitClass =
  "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"

export const labelClass =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wider"
