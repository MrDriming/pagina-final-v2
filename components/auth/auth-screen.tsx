"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShieldCheck, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react"
// ➡️ Auth de Supabase (mismo kit que lib/supabase/*)
import { createClient } from "@/lib/supabase/client"

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Estados de los campos
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setError(null)
    setIsLoading(true)

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        // El Server Component de `/` vuelve a leer la sesión y muestra el dashboard.
        router.push("/")
        router.refresh()
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Sin `role`: el signup público solo crea alumnos. Los
            // profesores los promueve el admin a mano. No agregues acá un
            // selector de rol "por comodidad": el trigger de la DB también
            // lo ignoraría (ver drizzle/0006_signup_solo_alumno.sql).
            data: { name: nombre },
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
          },
        })
        if (signUpError) throw signUpError

        if (data.session) {
          // Confirmación de mail desactivada: entra directo.
          router.push("/")
          router.refresh()
        } else {
          router.push("/auth/sign-up-success")
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-7 bg-card p-8 rounded-2xl border border-border shadow-xs">

        {/* Encabezado */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
            <ShieldCheck className="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {isLogin ? "Ingresar al Campus" : "Crear cuenta institucional"}
          </h2>
          <p className="text-sm text-muted-foreground">
            IPESMI Técnico — Sistema Virtual Integrado
          </p>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive text-center">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre y Apellido</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                <input
                  type="text"
                  required
                  placeholder="Ej: Facundo Blanco"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
              <input
                type="email"
                required
                placeholder="usuario@ipesmi.edu.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contraseña</label>
              {isLogin && (
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  ¿La olvidaste?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <>{isLogin ? "Iniciar Sesión" : "Registrarse"} <ArrowRight className="size-4" /></>}
          </button>
        </form>

        <div className="pt-4 border-t border-border/60 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
            }}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            {isLogin ? "¿Sos nuevo? Creá tu cuenta institucional acá" : "¿Ya tenés usuario? Inicia sesión"}
          </button>
        </div>

      </div>
    </div>
  )
}
