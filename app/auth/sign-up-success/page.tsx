import Link from "next/link"
import { AuthCard } from "@/components/auth/auth-card"

export default function Page() {
  return (
    <AuthCard
      titulo="¡Cuenta creada!"
      descripcion="Revisá tu correo para confirmarla"
    >
      <p className="text-sm text-muted-foreground text-center">
        Te mandamos un mail con un link de confirmación. Tenés que abrirlo
        antes de poder entrar al campus.
      </p>
      <div className="pt-4 border-t border-border/60 text-center">
        <Link
          href="/login"
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          Volver al inicio
        </Link>
      </div>
    </AuthCard>
  )
}
