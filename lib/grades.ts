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

/** Lo que ve un PROFESOR o ADMIN: la nota real. */
export function notaReal(nota: string | number | null): string {
  const n = notaToNumber(nota)
  if (n === null) return "—"
  return String(n % 1 === 0 ? n.toFixed(0) : n.toFixed(2))
}

/**
 * Valida una nota que llega de un formulario. Corre en el SERVIDOR: los
 * atributos min/max del input se saltean con el inspector.
 */
export function validarNota(
  valor: unknown,
): { ok: true; valor: number | null } | { ok: false; error: string } {
  if (valor === null || valor === undefined || valor === "") {
    return { ok: true, valor: null }
  }
  if (typeof valor !== "number" && typeof valor !== "string") {
    return { ok: false, error: "Nota inválida" }
  }
  const n = typeof valor === "number" ? valor : Number(valor)
  if (!Number.isInteger(n)) {
    return { ok: false, error: "La nota debe ser un número entero" }
  }
  if (n < 1 || n > 10) {
    return { ok: false, error: "La nota debe estar entre 1 y 10" }
  }
  return { ok: true, valor: n }
}

/**
 * Resumen para la home del alumno. Una materia se considera aprobada si el
 * promedio de sus trimestres cargados llega a la nota de aprobación; si no
 * tiene ninguna nota todavía, queda pendiente.
 */
export function resumenAlumno(
  filas: { t1: number | null; t2: number | null; t3: number | null }[],
): { promedio: number; aprobadas: number; pendientes: number } {
  const promedios = filas.map((f) => {
    const cargadas = [f.t1, f.t2, f.t3].filter(
      (n): n is number => n !== null,
    )
    if (cargadas.length === 0) return null
    return cargadas.reduce((a, b) => a + b, 0) / cargadas.length
  })

  const conNota = promedios.filter((p): p is number => p !== null)
  const promedio =
    conNota.length === 0
      ? 0
      : conNota.reduce((a, b) => a + b, 0) / conNota.length

  const aprobadas = promedios.filter(
    (p) => p !== null && p >= NOTA_APROBACION,
  ).length

  return { promedio, aprobadas, pendientes: filas.length - aprobadas }
}
