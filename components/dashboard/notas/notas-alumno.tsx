import type { FilaNotaAlumno } from "@/lib/notas"
import { notaReal, esDesaprobada } from "@/lib/grades"

function Nota({ valor }: { valor: number | null }) {
  return (
    <span
      className={
        esDesaprobada(valor)
          ? "font-bold text-destructive"
          : "font-semibold text-foreground"
      }
    >
      {notaReal(valor)}
    </span>
  )
}

export function NotasAlumno({ filas }: { filas: FilaNotaAlumno[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Mis Calificaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro de rendimiento académico personal por trimestre.
        </p>
      </div>

      {filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
          Todavía no hay notas cargadas para este ciclo lectivo.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Espacio Curricular</th>
                  <th className="px-6 py-4 text-center">1° Trimestre</th>
                  <th className="px-6 py-4 text-center">2° Trimestre</th>
                  <th className="px-6 py-4 text-center">3° Trimestre</th>
                  <th className="px-6 py-4 text-center">Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filas.map((f) => (
                  <tr key={f.materiaId} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {f.materia}
                    </td>
                    <td className="px-6 py-4 text-center"><Nota valor={f.t1} /></td>
                    <td className="px-6 py-4 text-center"><Nota valor={f.t2} /></td>
                    <td className="px-6 py-4 text-center"><Nota valor={f.t3} /></td>
                    <td className="px-6 py-4 text-center"><Nota valor={f.t4} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
