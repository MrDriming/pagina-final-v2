import Link from "next/link"
import { AuthCard } from "@/components/auth/auth-card"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <AuthCard titulo="Uy, algo salió mal">
      <p className="text-sm text-muted-foreground text-center">
        {params?.error ?? "Ocurrió un error no especificado."}
      </p>
      <div className="pt-4 border-t border-border/60 text-center">
        <Link
          href="/"
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          Volver al inicio
        </Link>
      </div>
    </AuthCard>
  )
}
