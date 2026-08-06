import Link from "next/link"
import { BookOpen, Layers } from "lucide-react"
import type { Catedra } from "@/lib/catedras"

export function CatedrasView({ catedras }: { catedras: Catedra[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Mis Cátedras</h1>
        <p className="text-sm text-muted-foreground">
          Materias y divisiones que dictás. Las asigna Secretaría Académica.
        </p>
      </div>

      {catedras.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Todavía no tenés cátedras
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Pedile a Secretaría Académica que te asigne las materias y divisiones
            que dictás.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {catedras.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-emerald-500/40"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                  <BookOpen className="size-5" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <Layers className="size-3" /> {c.anio} {c.division}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {c.materiaNombre}
              </h3>
              <div className="mt-4 border-t border-border pt-4">
                <Link
                  href={`/notas?catedra=${c.id}`}
                  className="block rounded-md border border-border bg-background py-1.5 text-center text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cargar notas
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
