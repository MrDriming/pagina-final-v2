import { Landmark } from "lucide-react"

export function MesasView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Mesas de Examen Especiales
        </h1>
        <p className="text-sm text-muted-foreground">
          Instancias evaluativas extraordinarias: previas, recuperatorios y equivalencias.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Landmark className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Todavía no hay mesas programadas
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Esta sección va a mostrar mesas de previas, recuperatorios y
          equivalencias reales más adelante. Por ahora no hay nada cargado.
        </p>
      </div>
    </div>
  )
}
