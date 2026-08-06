import { CalendarDays } from "lucide-react"
import type { Role } from "@/lib/session"

export function CalendarioView({ rol }: { rol: Role }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Cronograma de Evaluaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          {rol === "alumno" && "Tus próximas evaluaciones trimestrales y entregas de taller."}
          {rol === "profesor" && "Fechas de exámenes y lecciones de tus asignaturas."}
          {rol === "admin" && "Calendario académico institucional."}
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CalendarDays className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          El calendario de exámenes todavía no está cargado
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Esta sección va a mostrar fechas reales de parciales, entregas y
          exámenes finales más adelante. Por ahora no hay nada cargado.
        </p>
      </div>
    </div>
  )
}
