import { requireRole } from "@/lib/session"

export default async function Page() {
  await requireRole("admin", "profesor")
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
      <h2 className="text-lg font-semibold text-foreground">Configuración</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Módulo de administración disponible próximamente en esta sección.
      </p>
    </div>
  )
}
