// Nota mínima de aprobación en la escuela secundaria técnica.
export const NOTA_APROBACION = 6

// Años disponibles en la secundaria técnica (1ro a 6to).
export const ANIOS = ["1ro", "2do", "3ro", "4to", "5to", "6to"] as const
export const DIVISIONES = ["A", "B", "C", "D"] as const
export const TRIMESTRES = [1, 2, 3] as const

export function notaToNumber(nota: string | number | null): number | null {
  if (nota === null || nota === undefined || nota === "") return null
  const n = typeof nota === "number" ? nota : Number.parseFloat(nota)
  return Number.isNaN(n) ? null : n
}

export function esDesaprobada(nota: string | number | null): boolean {
  const n = notaToNumber(nota)
  return n !== null && n < NOTA_APROBACION
}

/**
 * Lo que ve un ALUMNO. Si la nota está desaprobada, la escuela impone mostrar
 * "EP" (En Proceso) en lugar del número real: el alumno no conoce la nota exacta.
 */
export function notaParaAlumno(
  nota: string | number | null,
): { display: string; ep: boolean } {
  const n = notaToNumber(nota)
  if (n === null) return { display: "—", ep: false }
  if (n < NOTA_APROBACION) return { display: "EP", ep: true }
  return { display: String(n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)), ep: false }
}

/** Lo que ve un PROFESOR o ADMIN: la nota real. */
export function notaReal(nota: string | number | null): string {
  const n = notaToNumber(nota)
  if (n === null) return "—"
  return String(n % 1 === 0 ? n.toFixed(0) : n.toFixed(2))
}
