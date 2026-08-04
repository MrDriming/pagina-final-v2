import { describe, it, expect } from "vitest"
import { validarNota, resumenAlumno } from "@/lib/grades"

describe("validarNota", () => {
  it("acepta enteros de 1 a 10", () => {
    expect(validarNota(1)).toEqual({ ok: true, valor: 1 })
    expect(validarNota(10)).toEqual({ ok: true, valor: 10 })
    expect(validarNota("7")).toEqual({ ok: true, valor: 7 })
  })

  it("acepta vacío como nota sin cargar", () => {
    expect(validarNota("")).toEqual({ ok: true, valor: null })
    expect(validarNota(null)).toEqual({ ok: true, valor: null })
    expect(validarNota(undefined)).toEqual({ ok: true, valor: null })
  })

  it("rechaza fuera de rango", () => {
    expect(validarNota(0).ok).toBe(false)
    expect(validarNota(11).ok).toBe(false)
    expect(validarNota(-3).ok).toBe(false)
  })

  it("rechaza decimales", () => {
    expect(validarNota(7.5).ok).toBe(false)
  })

  it("rechaza lo que no es número", () => {
    expect(validarNota("ocho").ok).toBe(false)
    expect(validarNota({}).ok).toBe(false)
  })
})

describe("resumenAlumno", () => {
  it("promedia los trimestres cargados e ignora los vacíos", () => {
    const r = resumenAlumno([{ t1: 8, t2: 6, t3: null }])
    expect(r.promedio).toBe(7)
  })

  it("cuenta como aprobada la materia cuyo promedio llega a 6", () => {
    const r = resumenAlumno([
      { t1: 8, t2: 8, t3: 8 },
      { t1: 4, t2: 4, t3: 4 },
    ])
    expect(r.aprobadas).toBe(1)
    expect(r.pendientes).toBe(1)
  })

  it("una materia sin ninguna nota queda pendiente", () => {
    const r = resumenAlumno([{ t1: null, t2: null, t3: null }])
    expect(r.aprobadas).toBe(0)
    expect(r.pendientes).toBe(1)
  })

  it("sin materias devuelve todo en cero", () => {
    expect(resumenAlumno([])).toEqual({ promedio: 0, aprobadas: 0, pendientes: 0 })
  })
})
