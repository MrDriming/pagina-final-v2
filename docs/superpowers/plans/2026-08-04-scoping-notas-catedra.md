# Scoping de notas por cátedra — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un profesor vea y cargue únicamente las notas de las materias que dicta, y que ninguna nota ajena llegue al browser.

**Architecture:** El acceso a notas se mueve del cliente al servidor. Una tabla `catedras` (profesor + materia + división) define los permisos; un módulo puro `lib/permisos.ts` los evalúa; los módulos `lib/notas.ts` y `lib/catedras.ts` (marcados `server-only`) hacen las consultas ya filtradas. Las secciones del dashboard pasan de `useState` a rutas para poder ser Server Components.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), Drizzle ORM sobre Postgres (Supabase), Supabase Auth, Tailwind v4, Vitest.

## Global Constraints

- Cátedra = **materia + año + división**. El año sale de `materias.anio`, nunca se duplica en `catedras`.
- Ninguna función de acceso a datos recibe el rol por parámetro. Lo obtiene de `getSessionUser()`.
- Toda escritura reverifica permisos en el servidor. Nunca se confía en el `alumnoId` / `materiaId` del formulario.
- El `ciclo_lectivo` lo determina el servidor con el año en curso. Nunca llega del formulario.
- El alumno ve su **nota real**. El enmascarado "EP" se elimina.
- Notas válidas: entero de 1 a 10, o nulo.
- Idioma del código y de la UI: español, como el resto del repo. Comillas dobles, sin punto y coma final (estilo de `lib/session.ts`).
- Usar `drizzle-kit generate` + `migrate`. **Nunca `drizzle-kit push`** (borraría el trigger, la FK y el RLS de `drizzle/0001_supabase_auth.sql`).
- Rama de trabajo: `roman`.

## File Structure

**Se crean:**

| Archivo | Responsabilidad |
|---|---|
| `vitest.config.ts` | Config de tests, alias `@/` |
| `lib/permisos.ts` | Regla de permisos, **pura** (sin DB, sin `server-only`) |
| `lib/permisos.test.ts` | Tests de la regla |
| `lib/catedras.ts` | Consultas y ABM de cátedras (`server-only`) |
| `lib/notas.ts` | Consultas de notas + Server Action de guardado (`server-only`) |
| `drizzle/0005_seed_materias.sql` | Seed del catálogo de materias |
| `app/(campus)/layout.tsx` | Sidebar + Topbar |
| `app/(campus)/page.tsx` | Inicio |
| `app/(campus)/error.tsx` | Boundary de errores del campus |
| `app/(campus)/{notas,calendario,mesas,consultas,catedras,usuarios,config}/page.tsx` | Una ruta por sección |
| `components/dashboard/notas/notas-alumno.tsx` | Vista alumno |
| `components/dashboard/notas/planilla-profesor.tsx` | Planilla del profesor |
| `components/dashboard/notas/notas-admin.tsx` | Vista admin, solo lectura |
| `components/dashboard/usuarios-view.tsx` | ABM de cátedras por usuario |

**Se modifican:**

| Archivo | Cambio |
|---|---|
| `lib/db/schema.ts` | `materias`, `catedras`, `calificaciones` reescrita, `perfiles.catedras` eliminada |
| `lib/grades.ts` | Se elimina `notaParaAlumno()`; se agrega `validarNota()` |
| `components/dashboard/sidebar.tsx` | `onSelect` → `<Link>`, activo por `usePathname()` |
| `components/dashboard/dashboard-home.tsx` | Resumen real por prop en vez de `NOTAS_ALUMNO`; `onNavigate` → links |
| `components/dashboard/topbar.tsx` | Selector de rol solo con `DEV_AUTH_BYPASS` |
| `components/dashboard/catedras-view.tsx` | Datos reales, sin botón de autoasignación |
| `package.json` | `server-only`, `vitest`, script `test` |

**Se eliminan:**

| Archivo | Motivo |
|---|---|
| `app/dashboard-client.tsx` | Reemplazado por el layout y las rutas |
| `components/dashboard/notas-view.tsx` | Partido en tres componentes por rol |

---

### Task 1: Infraestructura de tests y `server-only`

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada
- Produces: comando `npm test`; el alias `@/` resuelve a la raíz del repo en tests

- [ ] **Step 1: Instalar dependencias**

```bash
npm install server-only
npm install -D vitest
```

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    // process.cwd(), no __dirname: en un config .ts cargado por Vite,
    // __dirname puede quedar indefinido según cómo se transpile.
    alias: {
      "@": path.resolve(process.cwd()),
    },
  },
})
```

Nota para quien extienda los tests más adelante: `lib/permisos.ts` es puro a
propósito y **no** importa `server-only`, por eso se puede testear directo. Si
algún día hace falta testear `lib/notas.ts` o `lib/catedras.ts`, hay que agregar
un alias que apunte `server-only` a un módulo vacío, porque ese paquete tira al
importarse fuera de un Server Component.

- [ ] **Step 3: Agregar el script de test**

En `package.json`, dentro de `"scripts"`, agregar después de `"lint"`:

```json
    "test": "vitest run"
```

- [ ] **Step 4: Verificar que el runner arranca**

Run: `npm test`
Expected: sale sin error, con "No test files found" (todavía no hay tests).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(test): add vitest and server-only"
```

---

### Task 2: Modelo de datos

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `drizzle/0002_*.sql` (generado por drizzle-kit)

**Interfaces:**
- Consumes: nada
- Produces: tablas `materias`, `catedras`, `calificaciones`; exports `materias`, `catedras`, `calificaciones`, `perfiles` desde `@/lib/db/schema`

- [ ] **Step 1: Reescribir `lib/db/schema.ts`**

Reemplazar el contenido completo por:

```ts
import {
  pgTable,
  text,
  integer,
  uuid,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

/**
 * Perfil de la aplicación, 1:1 con `auth.users` de Supabase.
 *
 * `userId` es el mismo UUID que `auth.users.id`. La fila la crea sola el
 * trigger `on_auth_user_created` (ver `drizzle/0001_supabase_auth.sql`),
 * leyendo `raw_user_meta_data` del signup.
 *
 * OJO: la FK contra `auth.users` y los triggers viven en ese SQL manual,
 * fuera del schema de Drizzle. Usá `drizzle-kit generate` + `migrate`,
 * NUNCA `drizzle-kit push`, o el push te los borra al no verlos acá.
 */
export const perfiles = pgTable("perfiles", {
  userId: uuid("user_id").primaryKey(),
  nombre: text("nombre").notNull().default(""),
  rol: text("rol")
    .$type<"alumno" | "profesor" | "admin">()
    .notNull()
    .default("alumno"),
  anio: text("anio"),
  division: text("division"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/** Catálogo de materias. Cada materia pertenece a un año del plan. */
export const materias = pgTable(
  "materias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    anio: text("anio").notNull(),
  },
  (t) => [unique("materias_nombre_anio_key").on(t.nombre, t.anio)],
)

/**
 * Quién dicta qué. Esta tabla decide todos los permisos sobre notas.
 * El año no está acá: sale de `materias.anio`.
 */
export const catedras = pgTable(
  "catedras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profesorId: uuid("profesor_id")
      .notNull()
      .references(() => perfiles.userId, { onDelete: "cascade" }),
    materiaId: uuid("materia_id")
      .notNull()
      .references(() => materias.id, { onDelete: "cascade" }),
    division: text("division").notNull(),
  },
  (t) => [
    unique("catedras_profesor_materia_division_key").on(
      t.profesorId,
      t.materiaId,
      t.division,
    ),
  ],
)

/** Calificaciones por trimestre, una fila por alumno + materia + ciclo. */
export const calificaciones = pgTable(
  "calificaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alumnoId: uuid("alumno_id")
      .notNull()
      .references(() => perfiles.userId, { onDelete: "cascade" }),
    materiaId: uuid("materia_id")
      .notNull()
      .references(() => materias.id),
    cicloLectivo: integer("ciclo_lectivo").notNull(),
    trimestre1: integer("trimestre_1"),
    trimestre2: integer("trimestre_2"),
    trimestre3: integer("trimestre_3"),
    actualizadoPor: uuid("actualizado_por").references(() => perfiles.userId),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("calificaciones_alumno_materia_ciclo_key").on(
      t.alumnoId,
      t.materiaId,
      t.cicloLectivo,
    ),
  ],
)

// Tabla para Consultas Docentes
export const consultas = pgTable("consultas", {
  id: uuid("id").primaryKey().defaultRandom(),
  alumnoId: uuid("alumno_id").notNull(),
  profesorId: uuid("profesor_id").notNull(),
  materia: text("materia").notNull(),
  mensaje: text("mensaje").notNull(),
  respuesta: text("respuesta"),
  estado: text("estado").default("pendiente"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
```

- [ ] **Step 2: Fase A — agregar, sin borrar todavía**

`drizzle-kit generate` es interactivo, y **no hay TTY disponible**: si pregunta
algo, el comando muere con `Interactive prompts require a TTY terminal`.

Drizzle solo pregunta por renames cuando en una misma tabla detecta columnas
agregadas **y** borradas en el mismo diff. Así que la migración va en dos pasos,
cada uno sin ambigüedad.

Para esta fase, al schema del Step 1 hay que devolverle **temporalmente** las dos
columnas que se van a borrar. En `calificaciones`, agregar dentro del objeto de
columnas:

```ts
    materia: text("materia"),
```

(sin `.notNull()`: la columna vieja se va en la fase B). Y en `perfiles`:

```ts
  catedras: text("catedras").array(),
```

Ahora el diff es solo "tablas nuevas + columnas nuevas".

Run: `npx drizzle-kit generate`
Expected: `drizzle/0002_<nombre>.sql`, **sin ningún prompt**. Si igual pregunta
algo, el comando falla con el error de TTY: parar, no reintentar, y reportar
BLOCKED — hay que resolverlo con el dueño del proyecto.

Revisar el SQL generado antes de aplicar. Debe contener:
- `CREATE TABLE materias` y `CREATE TABLE catedras`
- `ALTER TABLE calificaciones ADD COLUMN` de `materia_id`, `ciclo_lectivo`, `actualizado_por`
- **ningún** `DROP COLUMN` y **ningún** `DROP TABLE`

Run: `npx drizzle-kit migrate`
Expected: `migrations applied successfully!`

- [ ] **Step 3: Fase B — borrar las columnas viejas**

Sacar del schema las dos líneas temporales del Step 2 (`materia` en
`calificaciones`, `catedras` en `perfiles`), dejándolo idéntico al Step 1.

Ahora el diff es solo "columnas borradas", que tampoco dispara el prompt de
rename.

Run: `npx drizzle-kit generate`
Expected: `drizzle/0003_<nombre>.sql`, sin prompts.

Revisar que contenga exactamente dos `DROP COLUMN` (`calificaciones.materia` y
`perfiles.catedras`) y ningún `DROP TABLE`. Si aparece un `DROP TABLE`, parar y
revisar el schema antes de aplicar.

Run: `npx drizzle-kit migrate`
Expected: `migrations applied successfully!`

**Ojo con la numeración:** esta task consume los números `0002` y `0003`, así que
el seed de la Task 3 pasa a ser `0005_seed_materias.sql`, con `idx: 5` en el
journal.

- [ ] **Step 4: Verificar contra la base**

```bash
PGPASSWORD="$(grep -oP '(?<=postgres:)[^@]+' .env.local | head -1)" \
psql -h db.usdcjtohempuoztierzj.supabase.co -p 5432 -U postgres -d postgres \
  -c "\d catedras" -c "\d calificaciones" -c "\d materias" -c "\d perfiles"
```

Expected: las tres tablas nuevas existen; `calificaciones` tiene `materia_id`,
`ciclo_lectivo` y `actualizado_por` y **ya no** tiene `materia`; `perfiles` ya no
tiene `catedras`.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat(db): add materias and catedras, rework calificaciones"
```

---

### Task 3: Seed del catálogo de materias

**Files:**
- Create: `drizzle/0005_seed_materias.sql`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**
- Consumes: tabla `materias` de la Task 2
- Produces: filas de `materias` con las que la UI puede poblar los selects

- [ ] **Step 1: Crear `drizzle/0005_seed_materias.sql`**

Catálogo provisional, armado con las materias que aparecían en los mocks. El
dueño del proyecto va a reemplazarlo por el plan de estudios real del IPESMI.
`ON CONFLICT DO NOTHING` lo hace reejecutable sin duplicar.

```sql
-- Catálogo de materias del plan de estudios.
-- PROVISORIO: armado con las materias que aparecían en los mocks.
-- Reemplazar por el plan de estudios real del IPESMI.
INSERT INTO public.materias (nombre, anio) VALUES
  ('Matemática I',              '1ro'),
  ('Lengua y Literatura I',     '1ro'),
  ('Física II',                 '2do'),
  ('Química',                   '2do'),
  ('Álgebra',                   '3ro'),
  ('Programación I',            '4to'),
  ('Sistemas Digitales',        '4to'),
  ('Taller de Electromecánica', '4to'),
  ('Matemática Aplicada',       '4to'),
  ('Diseño y Desarrollo Web',   '5to'),
  ('Instalaciones Eléctricas',  '5to'),
  ('Inglés Técnico',            '5to'),
  ('Programación III',          '6to'),
  ('Bases de Datos',            '6to'),
  ('Redes y Comunicaciones',    '6to'),
  ('Sistemas Operativos',       '6to')
ON CONFLICT (nombre, anio) DO NOTHING;
```

- [ ] **Step 2: Registrar la migración en el journal**

En `drizzle/meta/_journal.json`, agregar al final del array `entries` (ajustando
`idx` al siguiente número libre):

```json
    {
      "idx": 5,
      "version": "7",
      "when": 1785849194085,
      "tag": "0005_seed_materias",
      "breakpoints": true
    }
```

Es el mismo procedimiento que se usó para `0001_supabase_auth.sql`: drizzle-kit
no genera seeds, así que la entrada se agrega a mano.

- [ ] **Step 3: Aplicar**

Run: `npx drizzle-kit migrate`
Expected: `migrations applied successfully!`

- [ ] **Step 4: Verificar**

```bash
PGPASSWORD="$(grep -oP '(?<=postgres:)[^@]+' .env.local | head -1)" \
psql -h db.usdcjtohempuoztierzj.supabase.co -p 5432 -U postgres -d postgres \
  -c "SELECT anio, count(*) FROM public.materias GROUP BY anio ORDER BY anio;"
```

Expected: 16 materias repartidas entre 1ro y 6to.

- [ ] **Step 5: Commit**

```bash
git add drizzle/
git commit -m "feat(db): seed materias catalogue"
```

---

### Task 4: La regla de permisos (TDD)

**Files:**
- Create: `lib/permisos.ts`
- Test: `lib/permisos.test.ts`

**Interfaces:**
- Consumes: el tipo `Role` de `@/lib/session`
- Produces:
  ```ts
  export interface CatedraScope { materiaId: string; anio: string; division: string }
  export interface AlumnoUbicado { id: string; anio: string | null; division: string | null }
  export interface Actor { id: string; role: Role }
  export function puedeVerNota(actor: Actor, alumno: AlumnoUbicado, materiaId: string, catedras: CatedraScope[]): boolean
  export function puedeEditarNota(actor: Actor, alumno: AlumnoUbicado, materiaId: string, catedras: CatedraScope[]): boolean
  ```

Este módulo es **puro a propósito**: no toca la base ni importa `server-only`.
Las cátedras llegan como argumento. Eso lo hace testeable sin infraestructura y
deja un único lugar donde leer la regla.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `lib/permisos.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  puedeVerNota,
  puedeEditarNota,
  type CatedraScope,
  type AlumnoUbicado,
} from "@/lib/permisos"

const SISTEMAS = "11111111-1111-1111-1111-111111111111"
const TALLER = "22222222-2222-2222-2222-222222222222"

const profesor = { id: "prof-1", role: "profesor" as const }
const admin = { id: "adm-1", role: "admin" as const }

const facundo: AlumnoUbicado = { id: "al-1", anio: "4to", division: "A" }
const lautaro: AlumnoUbicado = { id: "al-2", anio: "4to", division: "B" }

// El profesor dicta Sistemas Digitales solo en 4to A.
const catedrasDe4toA: CatedraScope[] = [
  { materiaId: SISTEMAS, anio: "4to", division: "A" },
]

describe("puedeVerNota", () => {
  it("el profesor ve al alumno de la división que dicta", () => {
    expect(puedeVerNota(profesor, facundo, SISTEMAS, catedrasDe4toA)).toBe(true)
  })

  it("el profesor NO ve al alumno de otra división en la misma materia", () => {
    expect(puedeVerNota(profesor, lautaro, SISTEMAS, catedrasDe4toA)).toBe(false)
  })

  it("el profesor NO ve otra materia del mismo alumno", () => {
    expect(puedeVerNota(profesor, facundo, TALLER, catedrasDe4toA)).toBe(false)
  })

  it("el profesor con dos cátedras del mismo alumno ve esas dos y ninguna más", () => {
    const dos: CatedraScope[] = [
      { materiaId: SISTEMAS, anio: "4to", division: "A" },
      { materiaId: TALLER, anio: "4to", division: "A" },
    ]
    const otra = "33333333-3333-3333-3333-333333333333"
    expect(puedeVerNota(profesor, facundo, SISTEMAS, dos)).toBe(true)
    expect(puedeVerNota(profesor, facundo, TALLER, dos)).toBe(true)
    expect(puedeVerNota(profesor, facundo, otra, dos)).toBe(false)
  })

  it("el profesor sin cátedras no ve nada", () => {
    expect(puedeVerNota(profesor, facundo, SISTEMAS, [])).toBe(false)
  })

  it("el alumno se ve a sí mismo", () => {
    const actor = { id: facundo.id, role: "alumno" as const }
    expect(puedeVerNota(actor, facundo, SISTEMAS, [])).toBe(true)
  })

  it("el alumno NO ve a un compañero aunque pida su id", () => {
    const actor = { id: facundo.id, role: "alumno" as const }
    expect(puedeVerNota(actor, lautaro, SISTEMAS, [])).toBe(false)
  })

  it("el admin ve todo", () => {
    expect(puedeVerNota(admin, lautaro, TALLER, [])).toBe(true)
  })

  it("no ve nada si el alumno no tiene curso asignado", () => {
    const sinCurso: AlumnoUbicado = { id: "al-3", anio: null, division: null }
    expect(puedeVerNota(profesor, sinCurso, SISTEMAS, catedrasDe4toA)).toBe(false)
  })
})

describe("puedeEditarNota", () => {
  it("el profesor edita en su cátedra", () => {
    expect(puedeEditarNota(profesor, facundo, SISTEMAS, catedrasDe4toA)).toBe(true)
  })

  it("el profesor NO edita en una cátedra ajena", () => {
    expect(puedeEditarNota(profesor, lautaro, SISTEMAS, catedrasDe4toA)).toBe(false)
    expect(puedeEditarNota(profesor, facundo, TALLER, catedrasDe4toA)).toBe(false)
  })

  it("el admin lee pero NO escribe", () => {
    expect(puedeVerNota(admin, facundo, SISTEMAS, [])).toBe(true)
    expect(puedeEditarNota(admin, facundo, SISTEMAS, [])).toBe(false)
  })

  it("el alumno NO edita su propia nota", () => {
    const actor = { id: facundo.id, role: "alumno" as const }
    expect(puedeEditarNota(actor, facundo, SISTEMAS, [])).toBe(false)
  })
})
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npm test`
Expected: FAIL — no resuelve `@/lib/permisos`.

- [ ] **Step 3: Escribir la implementación mínima**

Crear `lib/permisos.ts`:

```ts
import type { Role } from "@/lib/session"

/**
 * La regla de permisos sobre notas, en un solo lugar.
 *
 * Este módulo es PURO: no consulta la base y no importa "server-only". Las
 * cátedras del profesor llegan como argumento. Así se puede testear sin
 * infraestructura, y hay un único archivo que leer cuando alguien pregunta
 * "¿quién puede ver esta nota?".
 */

/** Una cátedra reducida a lo que hace falta para decidir. */
export interface CatedraScope {
  materiaId: string
  anio: string
  division: string
}

/** El alumno dueño de la nota, con su curso. */
export interface AlumnoUbicado {
  id: string
  anio: string | null
  division: string | null
}

/** Quien pide, con el rol ya resuelto del lado del servidor. */
export interface Actor {
  id: string
  role: Role
}

function dictaEsaMateriaEnEseCurso(
  alumno: AlumnoUbicado,
  materiaId: string,
  catedras: CatedraScope[],
): boolean {
  // Un alumno sin curso asignado no cae bajo ninguna cátedra.
  if (!alumno.anio || !alumno.division) return false

  return catedras.some(
    (c) =>
      c.materiaId === materiaId &&
      c.anio === alumno.anio &&
      c.division === alumno.division,
  )
}

export function puedeVerNota(
  actor: Actor,
  alumno: AlumnoUbicado,
  materiaId: string,
  catedras: CatedraScope[],
): boolean {
  if (actor.role === "admin") return true
  if (actor.role === "alumno") return actor.id === alumno.id
  if (actor.role === "profesor") {
    return dictaEsaMateriaEnEseCurso(alumno, materiaId, catedras)
  }
  return false
}

export function puedeEditarNota(
  actor: Actor,
  alumno: AlumnoUbicado,
  materiaId: string,
  catedras: CatedraScope[],
): boolean {
  // El admin audita, no carga notas. El alumno tampoco, obviamente.
  if (actor.role !== "profesor") return false
  return dictaEsaMateriaEnEseCurso(alumno, materiaId, catedras)
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npm test`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/permisos.ts lib/permisos.test.ts
git commit -m "feat(permisos): add grade visibility rule with tests"
```

---

### Task 5: Validación de notas

**Files:**
- Modify: `lib/grades.ts`
- Test: `lib/grades.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  ```ts
  export function validarNota(valor: unknown): { ok: true; valor: number | null } | { ok: false; error: string }
  export function resumenAlumno(filas: { t1: number | null; t2: number | null; t3: number | null }[]): { promedio: number; aprobadas: number; pendientes: number }
  ```
  Se elimina `notaParaAlumno()`. `notaReal()`, `esDesaprobada()`, `notaToNumber()`, `NOTA_APROBACION`, `ANIOS`, `DIVISIONES`, `TRIMESTRES` quedan como están.

`resumenAlumno` reemplaza a `promedioGeneral(NOTAS_ALUMNO)` de `lib/mock-data.ts`,
que hoy usa `dashboard-home.tsx`. Sin esto, la home seguiría mostrando promedios
inventados al lado de las notas reales de `/notas`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `lib/grades.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { validarNota } from "@/lib/grades"

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
```

Agregar `resumenAlumno` al import del archivo de test:

```ts
import { validarNota, resumenAlumno } from "@/lib/grades"
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npm test`
Expected: FAIL — `validarNota` no está exportada.

- [ ] **Step 3: Modificar `lib/grades.ts`**

**Eliminar** la función `notaParaAlumno` completa (y su comentario de bloque). El
alumno ve su nota real; ese enmascarado además nunca fue seguro, porque el número
viajaba igual al cliente.

**Agregar** al final del archivo:

```ts
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
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/grades.ts lib/grades.test.ts
git commit -m "feat(grades): add server-side nota validation, drop EP masking"
```

---

### Task 6: Módulo de cátedras

**Files:**
- Create: `lib/catedras.ts`

**Interfaces:**
- Consumes: `db`, `catedras`, `materias`, `perfiles` de `@/lib/db/schema`; `requireUser`, `requireRole` de `@/lib/session`; `CatedraScope` de `@/lib/permisos`
- Produces:
  ```ts
  export interface Catedra { id: string; materiaId: string; materiaNombre: string; anio: string; division: string; profesorId: string }
  export async function getMisCatedras(): Promise<Catedra[]>
  export async function getCatedrasScope(profesorId: string): Promise<CatedraScope[]>
  export async function listarCatedras(profesorId: string): Promise<Catedra[]>
  export async function listarMaterias(): Promise<{ id: string; nombre: string; anio: string }[]>
  export async function listarUsuarios(): Promise<{ userId: string; nombre: string; rol: string; anio: string | null; division: string | null }[]>
  export async function asignarCatedra(input: { profesorId: string; materiaId: string; division: string }): Promise<{ ok: boolean; error?: string }>
  export async function quitarCatedra(catedraId: string): Promise<{ ok: boolean; error?: string }>
  ```

- [ ] **Step 1: Crear `lib/catedras.ts`**

```ts
import "server-only"

import { eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { catedras, materias, perfiles } from "@/lib/db/schema"
import { requireUser, requireRole } from "@/lib/session"
import type { CatedraScope } from "@/lib/permisos"
import { DIVISIONES } from "@/lib/grades"

export interface Catedra {
  id: string
  materiaId: string
  materiaNombre: string
  anio: string
  division: string
  profesorId: string
}

/** Cátedras de un profesor, con el nombre y el año de la materia resueltos. */
export async function listarCatedras(profesorId: string): Promise<Catedra[]> {
  const filas = await db
    .select({
      id: catedras.id,
      materiaId: catedras.materiaId,
      materiaNombre: materias.nombre,
      anio: materias.anio,
      division: catedras.division,
      profesorId: catedras.profesorId,
    })
    .from(catedras)
    .innerJoin(materias, eq(materias.id, catedras.materiaId))
    .where(eq(catedras.profesorId, profesorId))
    .orderBy(asc(materias.anio), asc(materias.nombre), asc(catedras.division))

  return filas
}

/** Las cátedras del usuario logueado. Solo tiene sentido para un profesor. */
export async function getMisCatedras(): Promise<Catedra[]> {
  const user = await requireUser()
  if (user.role !== "profesor") return []
  return listarCatedras(user.id)
}

/** Versión reducida que consume `lib/permisos.ts`. */
export async function getCatedrasScope(
  profesorId: string,
): Promise<CatedraScope[]> {
  const filas = await listarCatedras(profesorId)
  return filas.map((c) => ({
    materiaId: c.materiaId,
    anio: c.anio,
    division: c.division,
  }))
}

export async function listarMaterias() {
  await requireUser()
  return db
    .select({ id: materias.id, nombre: materias.nombre, anio: materias.anio })
    .from(materias)
    .orderBy(asc(materias.anio), asc(materias.nombre))
}

export async function listarUsuarios() {
  await requireRole("admin")
  return db
    .select({
      userId: perfiles.userId,
      nombre: perfiles.nombre,
      rol: perfiles.rol,
      anio: perfiles.anio,
      division: perfiles.division,
    })
    .from(perfiles)
    .orderBy(asc(perfiles.rol), asc(perfiles.nombre))
}

export async function asignarCatedra(input: {
  profesorId: string
  materiaId: string
  division: string
}): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin")

  if (!DIVISIONES.includes(input.division as (typeof DIVISIONES)[number])) {
    return { ok: false, error: "División inválida" }
  }

  // El destinatario tiene que existir y ser profesor: asignarle una cátedra a
  // un alumno le abriría las notas de todo el curso.
  const [destino] = await db
    .select({ rol: perfiles.rol })
    .from(perfiles)
    .where(eq(perfiles.userId, input.profesorId))
    .limit(1)

  if (!destino) return { ok: false, error: "El usuario no existe" }
  if (destino.rol !== "profesor") {
    return { ok: false, error: "Solo se pueden asignar cátedras a un profesor" }
  }

  const [materia] = await db
    .select({ id: materias.id })
    .from(materias)
    .where(eq(materias.id, input.materiaId))
    .limit(1)

  if (!materia) return { ok: false, error: "La materia no existe" }

  await db
    .insert(catedras)
    .values({
      profesorId: input.profesorId,
      materiaId: input.materiaId,
      division: input.division,
    })
    .onConflictDoNothing()

  return { ok: true }
}

export async function quitarCatedra(
  catedraId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin")
  await db.delete(catedras).where(eq(catedras.id, catedraId))
  return { ok: true }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/catedras.ts
git commit -m "feat(catedras): add scoped catedra queries and admin assignment"
```

---

### Task 7: Módulo de notas y Server Action

**Files:**
- Create: `lib/notas.ts`

**Interfaces:**
- Consumes: `getCatedrasScope`, `Catedra`, `listarCatedras` de `@/lib/catedras`; `puedeEditarNota` de `@/lib/permisos`; `validarNota` de `@/lib/grades`; `requireUser` de `@/lib/session`
- Produces:
  ```ts
  export interface FilaNotaAlumno { materiaId: string; materia: string; anio: string; t1: number | null; t2: number | null; t3: number | null }
  export interface FilaPlanilla { alumnoId: string; alumnoNombre: string; t1: number | null; t2: number | null; t3: number | null }
  export interface Planilla { catedra: Catedra; filas: FilaPlanilla[] }
  export interface FilaAdmin { alumnoId: string; alumnoNombre: string; anio: string | null; division: string | null; materia: string; t1: number | null; t2: number | null; t3: number | null }
  export function cicloActual(): number
  export async function getNotasDeAlumno(): Promise<FilaNotaAlumno[]>
  export async function getPlanilla(catedraId: string): Promise<Planilla | null>
  export async function getNotasParaAdmin(filtros?: { anio?: string; division?: string; materiaId?: string }): Promise<FilaAdmin[]>
  export async function guardarNota(input: { alumnoId: string; materiaId: string; t1: unknown; t2: unknown; t3: unknown }): Promise<{ ok: true } | { ok: false; error: string }>
  ```

- [ ] **Step 1: Crear `lib/notas.ts`**

```ts
import "server-only"

import { and, eq, asc, type SQL } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { calificaciones, materias, perfiles } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { puedeEditarNota } from "@/lib/permisos"
import { validarNota } from "@/lib/grades"
import { getCatedrasScope, listarCatedras, type Catedra } from "@/lib/catedras"

export interface FilaNotaAlumno {
  materiaId: string
  materia: string
  anio: string
  t1: number | null
  t2: number | null
  t3: number | null
}

export interface FilaPlanilla {
  alumnoId: string
  alumnoNombre: string
  t1: number | null
  t2: number | null
  t3: number | null
}

export interface Planilla {
  catedra: Catedra
  filas: FilaPlanilla[]
}

export interface FilaAdmin {
  alumnoId: string
  alumnoNombre: string
  anio: string | null
  division: string | null
  materia: string
  t1: number | null
  t2: number | null
  t3: number | null
}

/** El ciclo lo decide el servidor. Si viniera del form, se podrían cargar
 *  notas en un ciclo ya cerrado. */
export function cicloActual(): number {
  return new Date().getFullYear()
}

/** Las notas del alumno logueado. No recibe id: siempre es él mismo. */
export async function getNotasDeAlumno(): Promise<FilaNotaAlumno[]> {
  const user = await requireUser()

  return db
    .select({
      materiaId: materias.id,
      materia: materias.nombre,
      anio: materias.anio,
      t1: calificaciones.trimestre1,
      t2: calificaciones.trimestre2,
      t3: calificaciones.trimestre3,
    })
    .from(calificaciones)
    .innerJoin(materias, eq(materias.id, calificaciones.materiaId))
    .where(
      and(
        eq(calificaciones.alumnoId, user.id),
        eq(calificaciones.cicloLectivo, cicloActual()),
      ),
    )
    .orderBy(asc(materias.nombre))
}

/**
 * La planilla de una cátedra: los alumnos de ese curso con sus notas en esa
 * materia. Devuelve null si la cátedra no existe o no es del que llama.
 */
export async function getPlanilla(catedraId: string): Promise<Planilla | null> {
  const user = await requireUser()
  if (user.role !== "profesor") return null

  const mias = await listarCatedras(user.id)
  const catedra = mias.find((c) => c.id === catedraId)
  if (!catedra) return null

  const alumnos = await db
    .select({ id: perfiles.userId, nombre: perfiles.nombre })
    .from(perfiles)
    .where(
      and(
        eq(perfiles.rol, "alumno"),
        eq(perfiles.anio, catedra.anio),
        eq(perfiles.division, catedra.division),
      ),
    )
    .orderBy(asc(perfiles.nombre))

  const notas = await db
    .select({
      alumnoId: calificaciones.alumnoId,
      t1: calificaciones.trimestre1,
      t2: calificaciones.trimestre2,
      t3: calificaciones.trimestre3,
    })
    .from(calificaciones)
    .where(
      and(
        eq(calificaciones.materiaId, catedra.materiaId),
        eq(calificaciones.cicloLectivo, cicloActual()),
      ),
    )

  const porAlumno = new Map(notas.map((n) => [n.alumnoId, n]))

  return {
    catedra,
    filas: alumnos.map((a) => {
      const n = porAlumno.get(a.id)
      return {
        alumnoId: a.id,
        alumnoNombre: a.nombre,
        t1: n?.t1 ?? null,
        t2: n?.t2 ?? null,
        t3: n?.t3 ?? null,
      }
    }),
  }
}

export async function getNotasParaAdmin(filtros?: {
  anio?: string
  division?: string
  materiaId?: string
}): Promise<FilaAdmin[]> {
  const user = await requireUser()
  if (user.role !== "admin") return []

  const condiciones: SQL[] = [eq(calificaciones.cicloLectivo, cicloActual())]
  if (filtros?.anio) condiciones.push(eq(perfiles.anio, filtros.anio))
  if (filtros?.division) condiciones.push(eq(perfiles.division, filtros.division))
  if (filtros?.materiaId) condiciones.push(eq(materias.id, filtros.materiaId))

  return db
    .select({
      alumnoId: perfiles.userId,
      alumnoNombre: perfiles.nombre,
      anio: perfiles.anio,
      division: perfiles.division,
      materia: materias.nombre,
      t1: calificaciones.trimestre1,
      t2: calificaciones.trimestre2,
      t3: calificaciones.trimestre3,
    })
    .from(calificaciones)
    .innerJoin(materias, eq(materias.id, calificaciones.materiaId))
    .innerJoin(perfiles, eq(perfiles.userId, calificaciones.alumnoId))
    .where(and(...condiciones))
    .orderBy(asc(perfiles.nombre), asc(materias.nombre))
}

/**
 * Guarda los tres trimestres de un alumno en una materia.
 *
 * NO confía en el formulario: el `alumnoId` y el `materiaId` que llegan se
 * usan para volver a consultar las cátedras del profesor y decidir de cero.
 * Sin esto, alcanza con editar el HTML para cargar notas en una materia ajena.
 */
export async function guardarNota(input: {
  alumnoId: string
  materiaId: string
  t1: unknown
  t2: unknown
  t3: unknown
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()

  const [alumno] = await db
    .select({
      id: perfiles.userId,
      anio: perfiles.anio,
      division: perfiles.division,
      rol: perfiles.rol,
    })
    .from(perfiles)
    .where(eq(perfiles.userId, input.alumnoId))
    .limit(1)

  if (!alumno || alumno.rol !== "alumno") {
    return { ok: false, error: "Alumno inexistente" }
  }

  const scope = await getCatedrasScope(user.id)

  if (!puedeEditarNota(user, alumno, input.materiaId, scope)) {
    // No es un error de usuario: o es un bug, o alguien tocó el formulario.
    console.error(
      `[permisos] ${user.id} (${user.role}) intentó escribir la nota de ` +
        `${input.alumnoId} en la materia ${input.materiaId} sin cátedra`,
    )
    return { ok: false, error: "No tenés permiso para editar esta nota" }
  }

  const validadas = [input.t1, input.t2, input.t3].map(validarNota)
  const invalida = validadas.find((v) => !v.ok)
  if (invalida && !invalida.ok) {
    return { ok: false, error: invalida.error }
  }

  const [t1, t2, t3] = validadas.map((v) => (v.ok ? v.valor : null))

  await db
    .insert(calificaciones)
    .values({
      alumnoId: input.alumnoId,
      materiaId: input.materiaId,
      cicloLectivo: cicloActual(),
      trimestre1: t1,
      trimestre2: t2,
      trimestre3: t3,
      actualizadoPor: user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        calificaciones.alumnoId,
        calificaciones.materiaId,
        calificaciones.cicloLectivo,
      ],
      set: {
        trimestre1: t1,
        trimestre2: t2,
        trimestre3: t3,
        actualizadoPor: user.id,
        updatedAt: new Date(),
      },
    })

  revalidatePath("/notas")
  return { ok: true }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Correr toda la suite**

Run: `npm test`
Expected: PASS, los tests de las tasks 4 y 5.

- [ ] **Step 4: Commit**

```bash
git add lib/notas.ts
git commit -m "feat(notas): add scoped grade queries and guarded save action"
```

---

### Task 8: Migrar las secciones a rutas

**Files:**
- Create: `app/(campus)/layout.tsx`, `app/(campus)/page.tsx`, `app/(campus)/error.tsx`
- Create: `app/(campus)/{notas,calendario,mesas,consultas,catedras,usuarios,config}/page.tsx`
- Modify: `components/dashboard/sidebar.tsx`, `components/dashboard/topbar.tsx`, `app/page.tsx`
- Delete: `app/dashboard-client.tsx`

**Interfaces:**
- Consumes: `getSessionUser` de `@/lib/session`, `DEV_AUTH_BYPASS` de `@/lib/dev-auth`
- Produces: rutas `/`, `/notas`, `/calendario`, `/mesas`, `/consultas`, `/catedras`, `/usuarios`, `/config`

Esta task no cambia comportamiento: mueve las mismas vistas a rutas para que las
siguientes puedan ser Server Components. Es el paso que más archivos toca.

- [ ] **Step 1: Crear el layout del campus**

`app/(campus)/layout.tsx`:

```tsx
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { DEV_AUTH_BYPASS } from "@/lib/dev-auth"
import { CampusShell } from "@/components/dashboard/campus-shell"

export default async function CampusLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  return (
    <>
      {DEV_AUTH_BYPASS && (
        <div className="sticky top-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          ⚠️ Login desactivado (DEV_BYPASS_AUTH). Usuario falso, rol {user.role}.
        </div>
      )}
      <CampusShell user={user}>{children}</CampusShell>
    </>
  )
}
```

- [ ] **Step 2: Crear el shell cliente**

El Sidebar y el Topbar necesitan estado (menú abierto en mobile), así que el
shell es cliente y recibe los hijos ya renderizados en el servidor.

`components/dashboard/campus-shell.tsx`:

```tsx
"use client"

import { useState } from "react"
import type { SessionUser } from "@/lib/session"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"

export function CampusShell({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        rol={user.role}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          rol={user.role}
          onOpenMenu={() => setMenuOpen(true)}
          nombre={user.name}
          detalle={user.email}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Convertir el Sidebar a links**

Reemplazar `components/dashboard/sidebar.tsx` por:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Rol } from "@/lib/mock-data"
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Landmark,
  MessageSquare,
  Settings,
  Users,
  X,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: Rol[]
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, roles: ["alumno", "profesor", "admin"] },
  { href: "/notas", label: "Notas", icon: ClipboardList, roles: ["alumno", "profesor", "admin"] },
  { href: "/calendario", label: "Calendario de exámenes", icon: CalendarDays, roles: ["alumno", "profesor", "admin"] },
  { href: "/mesas", label: "Mesas especiales", icon: Landmark, roles: ["alumno", "profesor", "admin"] },
  { href: "/consultas", label: "Consultas Docentes", icon: MessageSquare, roles: ["alumno", "profesor"] },
  { href: "/catedras", label: "Mis Cátedras", icon: Settings, roles: ["profesor"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { href: "/config", label: "Configuración", icon: Settings, roles: ["admin", "profesor"] },
]

export function Sidebar({
  rol,
  open,
  onClose,
}: {
  rol: Rol
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(rol))

  return (
    <>
      {/* Backdrop móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-wide text-white">IPESMI Técnico</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Campus Virtual</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navegación principal">
          {items.map((item) => {
            const Icon = item.icon
            // Coincidencia exacta: si no, "/" quedaría activo en toda ruta.
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-xs text-sidebar-foreground/55">Ciclo lectivo 2026</p>
          <p className="text-xs text-sidebar-foreground/40">v1.0 · Producción</p>
        </div>
      </aside>
    </>
  )
}
```

Desaparece el tipo `SectionId`. Buscar y limpiar sus importaciones:

```bash
grep -rn "SectionId" --include=*.tsx --include=*.ts . | grep -v node_modules
```

- [ ] **Step 4: Sacar el selector de rol del Topbar**

Mientras un alumno pueda hacer clic en "Profesor", nada del scoping sirve. El rol
ahora viene del servidor; el selector queda solo como indicador en desarrollo.

Reemplazar `components/dashboard/topbar.tsx` por:

```tsx
"use client"

import type { Rol } from "@/lib/mock-data"
import { Menu, Bell, Search } from "lucide-react"
import { LogoutButton } from "@/components/auth/logout-button"
import { DEV_AUTH_BYPASS } from "@/lib/dev-auth"

export function Topbar({
  rol,
  onOpenMenu,
  nombre,
  detalle,
}: {
  rol: Rol
  onOpenMenu: () => void
  nombre: string
  detalle: string
}) {
  const iniciales = nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6">
      <button
        onClick={onOpenMenu}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <div className="relative hidden flex-1 md:block md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar materia, examen o alumno..."
          className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {/* Solo en desarrollo, y como indicador: el rol real lo decide el servidor. */}
        {DEV_AUTH_BYPASS && (
          <span className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            rol: {rol} · DEV_BYPASS_ROLE
          </span>
        )}

        <button
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted"
          aria-label="Notificaciones"
        >
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
        </button>

        <div className="flex items-center gap-2.5 border-l border-border pl-2 md:pl-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {iniciales}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-foreground">{nombre}</p>
            <p className="text-xs text-muted-foreground">{detalle}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
```

Con esto `ROLES` y `PERFIL` de `lib/mock-data.ts` dejan de usarse acá.

- [ ] **Step 5: Crear las páginas**

`app/(campus)/page.tsx`:

```tsx
import { requireUser } from "@/lib/session"
import { getNotasDeAlumno } from "@/lib/notas"
import { resumenAlumno } from "@/lib/grades"
import { DashboardHome } from "@/components/dashboard/dashboard-home"

export default async function Page() {
  const user = await requireUser()

  // El resumen del alumno sale de sus notas reales, no de los mocks.
  const resumen =
    user.role === "alumno"
      ? resumenAlumno(await getNotasDeAlumno())
      : { promedio: 0, aprobadas: 0, pendientes: 0 }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-600 font-medium">
        👋 Hola {user.name} — Conectado como {user.role} en el sistema del IPESMI
      </div>
      <DashboardHome rol={user.role} resumen={resumen} />
    </div>
  )
}
```

Ajustar `components/dashboard/dashboard-home.tsx` en cuatro puntos:

1. Los imports: sacar `NOTAS_ALUMNO`, `promedioGeneral` y
   `import type { SectionId } from "./sidebar"`; agregar `Link` de `next/link`.

```tsx
import Link from "next/link"
import { EVENTOS, MESAS, PERFIL, type Rol } from "@/lib/mock-data"
```

2. Las props: sacar `onNavigate`, agregar `resumen`.

```tsx
export function DashboardHome({
  rol,
  resumen,
}: {
  rol: Rol
  resumen: { promedio: number; aprobadas: number; pendientes: number }
}) {
```

3. Las tres líneas que leen los mocks (hoy son las 72-74):

```tsx
  const { promedio, aprobadas, pendientes } = resumen
```

4. Los cuatro usos de `onNavigate`, que pasan a links. El botón "Ver calendario"
   del encabezado de próximas evaluaciones:

```tsx
            <Link
              href="/calendario"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver calendario <ArrowRight className="size-3.5" />
            </Link>
```

   Los tres accesos rápidos:

```tsx
            <QuickLink label="Ver mis notas" href="/notas" icon={TrendingUp} />
            <QuickLink label="Calendario de exámenes" href="/calendario" icon={CalendarClock} />
            <QuickLink label="Mesas especiales" href="/mesas" icon={Landmark} />
```

   Y `QuickLink` pasa de botón a link:

```tsx
function QuickLink({
  label,
  href,
  icon: Icon,
}: {
  label: string
  href: string
  icon: React.ElementType
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="flex-1">{label}</span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  )
}
```

Las cuatro páginas que solo envuelven una vista existente:

```tsx
// app/(campus)/calendario/page.tsx
import { requireUser } from "@/lib/session"
import { CalendarioView } from "@/components/dashboard/calendario-view"

export default async function Page() {
  const user = await requireUser()
  return <CalendarioView rol={user.role} />
}
```

```tsx
// app/(campus)/mesas/page.tsx
import { requireUser } from "@/lib/session"
import { MesasView } from "@/components/dashboard/mesas-view"

export default async function Page() {
  await requireUser()
  return <MesasView />
}
```

```tsx
// app/(campus)/consultas/page.tsx
import { requireUser } from "@/lib/session"
import { ConsultasView } from "@/components/dashboard/consultas-view"

export default async function Page() {
  const user = await requireUser()
  return <ConsultasView rol={user.role} />
}
```

```tsx
// app/(campus)/config/page.tsx
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
```

Las de `notas`, `catedras` y `usuarios` se crean con un placeholder equivalente y
se completan en las tasks 9 a 12.

- [ ] **Step 6: Reemplazar la home y borrar el cliente viejo**

`app/page.tsx` ya no existe como tal: la home del campus es
`app/(campus)/page.tsx`. Borrar:

```bash
git rm app/page.tsx app/dashboard-client.tsx
```

El componente `AuthScreen` pasa a `app/login/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthScreen } from "@/components/auth/auth-screen"

export default async function Page() {
  const user = await getSessionUser()
  if (user) redirect("/")
  return <AuthScreen />
}
```

En `lib/supabase/proxy.ts`, cambiar `RUTAS_PUBLICAS` a `["/auth", "/login"]`, y
en `esRutaPublica` sacar el caso especial de `/` (ahora `/` es privada y el
layout redirige a `/login`). El redirect del proxy pasa de `url.pathname = "/"`
a `url.pathname = "/login"`.

En `components/auth/auth-screen.tsx`, los dos `router.refresh()` del login
exitoso ya no alcanzan: ahora el formulario vive en `/login`, y refrescar esa
ruta deja al usuario ahí mismo. Reemplazar cada uno por:

```tsx
        router.push("/")
        router.refresh()
```

En `components/auth/logout-button.tsx`, cambiar `router.push("/")` por
`router.push("/login")`.

En `components/auth/forgot-password-form.tsx` y
`components/auth/update-password-form.tsx`, los `href="/"` y `router.push("/")`
de "volver al inicio" apuntan a una ruta ahora privada: cambiarlos a `/login`
(los tres del forgot y el `sign-up-success`) salvo el de
`update-password-form.tsx`, que sí debe ir a `/` porque en ese punto la sesión
ya existe.

- [ ] **Step 7: Crear el boundary de errores**

`app/(campus)/error.tsx`:

```tsx
"use client"

export default function CampusError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        No pudimos mostrar esta sección
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Puede que no tengas permiso, o que haya fallado la conexión. Si sigue
        pasando, avisá a Secretaría.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Reintentar
      </button>
    </div>
  )
}
```

El mensaje es a propósito genérico: no distingue "no tenés permiso" de "falló la
base", para no confirmarle a nadie que un recurso existe.

- [ ] **Step 8: Verificar**

Run: `npx tsc --noEmit && npm run build`
Expected: build OK, y en la lista de rutas aparecen `/`, `/login`, `/notas`,
`/calendario`, `/mesas`, `/consultas`, `/catedras`, `/usuarios`, `/config`.

Run: `npm run dev` y navegar a mano por todas las secciones. Verificar que el
botón atrás del browser funciona y que el sidebar marca la sección activa.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(campus): move dashboard sections from state to routes"
```

---

### Task 9: Vista de notas del alumno

**Files:**
- Create: `components/dashboard/notas/notas-alumno.tsx`
- Modify: `app/(campus)/notas/page.tsx`

**Interfaces:**
- Consumes: `getNotasDeAlumno`, `FilaNotaAlumno` de `@/lib/notas`; `notaReal`, `esDesaprobada` de `@/lib/grades`
- Produces: `<NotasAlumno filas={...} />`

- [ ] **Step 1: Crear el componente**

`components/dashboard/notas/notas-alumno.tsx`:

```tsx
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
```

- [ ] **Step 2: Conectar la página**

`app/(campus)/notas/page.tsx`:

```tsx
import { requireUser } from "@/lib/session"
import { getNotasDeAlumno } from "@/lib/notas"
import { NotasAlumno } from "@/components/dashboard/notas/notas-alumno"

export default async function Page() {
  const user = await requireUser()

  if (user.role === "alumno") {
    const filas = await getNotasDeAlumno()
    return <NotasAlumno filas={filas} />
  }

  return null // profesor y admin se completan en las tasks 10 y 11
}
```

- [ ] **Step 3: Verificar que no se filtran datos ajenos**

Run: `npm run dev`, entrar como alumno y abrir `/notas`. Después:

```bash
curl -s http://localhost:3000/notas | grep -c "Nuñez\|Enriquez"
```

Expected: `0`. Ninguna fila de otro alumno debe aparecer en el HTML.

- [ ] **Step 4: Commit**

```bash
git add app/\(campus\)/notas components/dashboard/notas
git commit -m "feat(notas): add server-rendered student grade view"
```

---

### Task 10: Planilla del profesor

**Files:**
- Create: `components/dashboard/notas/planilla-profesor.tsx`
- Modify: `app/(campus)/notas/page.tsx`

**Interfaces:**
- Consumes: `getPlanilla`, `guardarNota`, `Planilla` de `@/lib/notas`; `getMisCatedras`, `Catedra` de `@/lib/catedras`
- Produces: `<PlanillaProfesor catedras={...} planilla={...} onGuardar={...} />`

- [ ] **Step 1: Crear la Server Action**

`app/(campus)/notas/actions.ts`:

```ts
"use server"

import { guardarNota } from "@/lib/notas"

export async function guardarNotaAction(input: {
  alumnoId: string
  materiaId: string
  t1: unknown
  t2: unknown
  t3: unknown
}) {
  return guardarNota(input)
}
```

- [ ] **Step 2: Crear el componente**

`components/dashboard/notas/planilla-profesor.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Edit2, Check, X } from "lucide-react"
import type { Catedra } from "@/lib/catedras"
import type { Planilla } from "@/lib/notas"
import { notaReal, esDesaprobada } from "@/lib/grades"
import { guardarNotaAction } from "@/app/(campus)/notas/actions"

interface Props {
  catedras: Catedra[]
  catedraId: string | null
  planilla: Planilla | null
}

export function PlanillaProfesor({ catedras, catedraId, planilla }: Props) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState({ t1: "", t2: "", t3: "" })
  const [error, setError] = useState<string | null>(null)

  if (catedras.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          No tenés cátedras asignadas
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Pedile a Secretaría Académica que te asigne las materias y divisiones
          que dictás.
        </p>
      </div>
    )
  }

  const guardar = (alumnoId: string) => {
    if (!planilla) return
    setError(null)
    startTransition(async () => {
      const r = await guardarNotaAction({
        alumnoId,
        materiaId: planilla.catedra.materiaId,
        t1: form.t1,
        t2: form.t2,
        t3: form.t3,
      })
      if (!r.ok) {
        setError(r.error)
        return
      }
      setEditando(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Planilla de Calificaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Carga de notas de las materias que dictás.
          </p>
        </div>

        <select
          value={catedraId ?? ""}
          onChange={(e) => router.push(`/notas?catedra=${e.target.value}`)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Elegí una cátedra…</option>
          {catedras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.materiaNombre} — {c.anio} {c.division}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {!planilla ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
          Elegí una cátedra para ver sus alumnos.
        </div>
      ) : planilla.filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
          No hay alumnos cargados en {planilla.catedra.anio}{" "}
          {planilla.catedra.division}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Estudiante</th>
                  <th className="px-6 py-4 text-center">1° Trim.</th>
                  <th className="px-6 py-4 text-center">2° Trim.</th>
                  <th className="px-6 py-4 text-center">3° Trim.</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {planilla.filas.map((fila) => {
                  const editandoEsta = editando === fila.alumnoId
                  return (
                    <tr key={fila.alumnoId} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {fila.alumnoNombre}
                      </td>
                      {(["t1", "t2", "t3"] as const).map((k) => (
                        <td key={k} className="px-6 py-4 text-center">
                          {editandoEsta ? (
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={form[k]}
                              onChange={(e) =>
                                setForm({ ...form, [k]: e.target.value })
                              }
                              className="w-14 rounded border border-input bg-background p-1 text-center text-xs outline-none focus:border-emerald-500"
                            />
                          ) : (
                            <span
                              className={
                                esDesaprobada(fila[k])
                                  ? "font-bold text-destructive"
                                  : "font-semibold text-foreground"
                              }
                            >
                              {notaReal(fila[k])}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {editandoEsta ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={pendiente}
                              onClick={() => guardar(fila.alumnoId)}
                              className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                              title="Guardar notas"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setEditando(null)}
                              className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted"
                              title="Cancelar"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditando(fila.alumnoId)
                              setError(null)
                              setForm({
                                t1: fila.t1?.toString() ?? "",
                                t2: fila.t2?.toString() ?? "",
                                t3: fila.t3?.toString() ?? "",
                              })
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            <Edit2 className="size-3.5" /> Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Conectar la página**

Reemplazar `app/(campus)/notas/page.tsx`:

```tsx
import { requireUser } from "@/lib/session"
import { getNotasDeAlumno, getPlanilla } from "@/lib/notas"
import { getMisCatedras } from "@/lib/catedras"
import { NotasAlumno } from "@/components/dashboard/notas/notas-alumno"
import { PlanillaProfesor } from "@/components/dashboard/notas/planilla-profesor"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ catedra?: string }>
}) {
  const user = await requireUser()

  if (user.role === "alumno") {
    const filas = await getNotasDeAlumno()
    return <NotasAlumno filas={filas} />
  }

  if (user.role === "profesor") {
    const { catedra: catedraId } = await searchParams
    const catedras = await getMisCatedras()
    const planilla = catedraId ? await getPlanilla(catedraId) : null
    return (
      <PlanillaProfesor
        catedras={catedras}
        catedraId={catedraId ?? null}
        planilla={planilla}
      />
    )
  }

  return null // admin se completa en la task 11
}
```

- [ ] **Step 4: Verificar el scoping a mano**

Con un profesor que tenga una sola cátedra:

1. `/notas` muestra solo esa cátedra en el select.
2. Cargar una nota y confirmar que persiste tras recargar.
3. Pedir una cátedra ajena por URL: `/notas?catedra=<id-de-otro-profesor>`.
   Expected: la planilla no se muestra ("Elegí una cátedra"), **no** un error 500
   ni los datos del otro curso.

- [ ] **Step 5: Commit**

```bash
git add app/\(campus\)/notas components/dashboard/notas
git commit -m "feat(notas): add teacher grade sheet scoped to own catedras"
```

---

### Task 11: Vista de admin

**Files:**
- Create: `components/dashboard/notas/notas-admin.tsx`
- Modify: `app/(campus)/notas/page.tsx`

**Interfaces:**
- Consumes: `getNotasParaAdmin`, `FilaAdmin` de `@/lib/notas`; `listarMaterias` de `@/lib/catedras`; `ANIOS`, `DIVISIONES` de `@/lib/grades`
- Produces: `<NotasAdmin filas={...} materias={...} filtros={...} />`

- [ ] **Step 1: Crear el componente**

`components/dashboard/notas/notas-admin.tsx`:

```tsx
"use client"

import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import type { FilaAdmin } from "@/lib/notas"
import { notaReal, esDesaprobada, ANIOS, DIVISIONES } from "@/lib/grades"

interface Props {
  filas: FilaAdmin[]
  materias: { id: string; nombre: string; anio: string }[]
  filtros: { anio?: string; division?: string; materiaId?: string }
}

export function NotasAdmin({ filas, materias, filtros }: Props) {
  const router = useRouter()

  const aplicar = (clave: string, valor: string) => {
    const params = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v) as [string, string][],
    )
    if (valor) params.set(clave, valor)
    else params.delete(clave)
    router.push(`/notas?${params.toString()}`)
  }

  const selectClass =
    "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Supervisión de Calificaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Supervisión institucional de boletines trimestrales.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400">
          <ShieldAlert className="size-4 shrink-0" />
          <span>Modo Preceptor: visualización y auditoría sin permisos de edición</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={filtros.anio ?? ""} onChange={(e) => aplicar("anio", e.target.value)} className={selectClass}>
          <option value="">Todos los años</option>
          {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtros.division ?? ""} onChange={(e) => aplicar("division", e.target.value)} className={selectClass}>
          <option value="">Todas las divisiones</option>
          {DIVISIONES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filtros.materiaId ?? ""} onChange={(e) => aplicar("materiaId", e.target.value)} className={selectClass}>
          <option value="">Todas las materias</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre} ({m.anio})</option>
          ))}
        </select>
      </div>

      {filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">
          No hay calificaciones que coincidan con esos filtros.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Estudiante</th>
                  <th className="px-6 py-4">Curso</th>
                  <th className="px-6 py-4">Materia</th>
                  <th className="px-6 py-4 text-center">1°</th>
                  <th className="px-6 py-4 text-center">2°</th>
                  <th className="px-6 py-4 text-center">3°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filas.map((f, i) => (
                  <tr key={`${f.alumnoId}-${f.materia}-${i}`} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">{f.alumnoNombre}</td>
                    <td className="px-6 py-4 text-muted-foreground">{f.anio} {f.division}</td>
                    <td className="px-6 py-4 text-muted-foreground">{f.materia}</td>
                    {([f.t1, f.t2, f.t3] as const).map((n, j) => (
                      <td key={j} className="px-6 py-4 text-center">
                        <span className={esDesaprobada(n) ? "font-bold text-destructive" : "font-semibold text-foreground"}>
                          {notaReal(n)}
                        </span>
                      </td>
                    ))}
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
```

- [ ] **Step 2: Conectar la página**

En `app/(campus)/notas/page.tsx`, ampliar `searchParams` a
`Promise<{ catedra?: string; anio?: string; division?: string; materiaId?: string }>`
y reemplazar el `return null` final por:

```tsx
  const { anio, division, materiaId } = await searchParams
  const [filas, materias] = await Promise.all([
    getNotasParaAdmin({ anio, division, materiaId }),
    listarMaterias(),
  ])
  return (
    <NotasAdmin
      filas={filas}
      materias={materias}
      filtros={{ anio, division, materiaId }}
    />
  )
```

Agregar los imports de `getNotasParaAdmin`, `listarMaterias` y `NotasAdmin`.

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores.

Entrar como admin a `/notas`: se ven todas las notas, sin botones de edición, y
los filtros cambian la URL y el resultado.

- [ ] **Step 4: Commit**

```bash
git add app/\(campus\)/notas components/dashboard/notas
git commit -m "feat(notas): add read-only admin overview with filters"
```

---

### Task 12: Cátedras del profesor con datos reales

**Files:**
- Modify: `components/dashboard/catedras-view.tsx`, `app/(campus)/catedras/page.tsx`

**Interfaces:**
- Consumes: `getMisCatedras`, `Catedra` de `@/lib/catedras`
- Produces: `<CatedrasView catedras={...} />`

- [ ] **Step 1: Reescribir el componente**

`components/dashboard/catedras-view.tsx`:

```tsx
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
```

Se elimina el botón "Asociar Materia": el profesor no se autoasigna cátedras, o
volvería a ver todo.

- [ ] **Step 2: Conectar la página**

`app/(campus)/catedras/page.tsx`:

```tsx
import { requireRole } from "@/lib/session"
import { getMisCatedras } from "@/lib/catedras"
import { CatedrasView } from "@/components/dashboard/catedras-view"

export default async function Page() {
  await requireRole("profesor")
  const catedras = await getMisCatedras()
  return <CatedrasView catedras={catedras} />
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores. Como profesor, `/catedras` muestra las cátedras reales;
como alumno, la ruta tira y aparece el `error.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/catedras-view.tsx app/\(campus\)/catedras
git commit -m "feat(catedras): render real catedras, drop self-assignment"
```

---

### Task 13: ABM de cátedras en Usuarios

**Files:**
- Create: `components/dashboard/usuarios-view.tsx`, `app/(campus)/usuarios/actions.ts`
- Modify: `app/(campus)/usuarios/page.tsx`

**Interfaces:**
- Consumes: `listarUsuarios`, `listarMaterias`, `listarCatedras`, `asignarCatedra`, `quitarCatedra` de `@/lib/catedras`
- Produces: `<UsuariosView usuarios={...} materias={...} seleccionado={...} catedras={...} />`

- [ ] **Step 1: Crear las Server Actions**

`app/(campus)/usuarios/actions.ts`:

```ts
"use server"

import { revalidatePath } from "next/cache"
import { asignarCatedra, quitarCatedra } from "@/lib/catedras"

export async function asignarCatedraAction(input: {
  profesorId: string
  materiaId: string
  division: string
}) {
  const r = await asignarCatedra(input)
  if (r.ok) revalidatePath("/usuarios")
  return r
}

export async function quitarCatedraAction(catedraId: string) {
  const r = await quitarCatedra(catedraId)
  if (r.ok) revalidatePath("/usuarios")
  return r
}
```

- [ ] **Step 2: Crear la vista**

`components/dashboard/usuarios-view.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Plus } from "lucide-react"
import type { Catedra } from "@/lib/catedras"
import { DIVISIONES } from "@/lib/grades"
import {
  asignarCatedraAction,
  quitarCatedraAction,
} from "@/app/(campus)/usuarios/actions"

interface Usuario {
  userId: string
  nombre: string
  rol: string
  anio: string | null
  division: string | null
}

interface Props {
  usuarios: Usuario[]
  materias: { id: string; nombre: string; anio: string }[]
  seleccionado: Usuario | null
  catedras: Catedra[]
}

export function UsuariosView({ usuarios, materias, seleccionado, catedras }: Props) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [materiaId, setMateriaId] = useState("")
  const [division, setDivision] = useState("")
  const [error, setError] = useState<string | null>(null)

  const agregar = () => {
    if (!seleccionado || !materiaId || !division) return
    setError(null)
    startTransition(async () => {
      const r = await asignarCatedraAction({
        profesorId: seleccionado.userId,
        materiaId,
        division,
      })
      if (!r.ok) { setError(r.error ?? "No se pudo asignar"); return }
      setMateriaId("")
      setDivision("")
      router.refresh()
    })
  }

  const quitar = (id: string) => {
    setError(null)
    startTransition(async () => {
      const r = await quitarCatedraAction(id)
      if (!r.ok) { setError(r.error ?? "No se pudo quitar"); return }
      router.refresh()
    })
  }

  const selectClass =
    "rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Gestión de usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Asignación de materias y divisiones a cada docente.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {usuarios.map((u) => (
            <li key={u.userId}>
              <button
                onClick={() => router.push(`/usuarios?u=${u.userId}`)}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  seleccionado?.userId === u.userId ? "bg-muted" : ""
                }`}
              >
                <p className="text-sm font-medium text-foreground">
                  {u.nombre || "(sin nombre)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.rol}
                  {u.anio ? ` · ${u.anio} ${u.division ?? ""}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-border bg-card p-5">
          {!seleccionado ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Elegí un usuario de la lista.
            </p>
          ) : seleccionado.rol !== "profesor" ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Solo los profesores tienen cátedras. {seleccionado.nombre} es{" "}
              {seleccionado.rol}.
            </p>
          ) : (
            <div className="space-y-5">
              <h2 className="font-semibold text-foreground">
                Cátedras de {seleccionado.nombre}
              </h2>

              {catedras.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no tiene cátedras asignadas.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {catedras.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-foreground">
                        {c.materiaNombre} — {c.anio} {c.division}
                      </span>
                      <button
                        disabled={pendiente}
                        onClick={() => quitar(c.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Quitar cátedra"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className={selectClass}>
                  <option value="">Materia…</option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} ({m.anio})</option>
                  ))}
                </select>
                <select value={division} onChange={(e) => setDivision(e.target.value)} className={selectClass}>
                  <option value="">División…</option>
                  {DIVISIONES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <button
                  disabled={pendiente || !materiaId || !division}
                  onClick={agregar}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Plus className="size-4" /> Asignar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Conectar la página**

`app/(campus)/usuarios/page.tsx`:

```tsx
import { requireRole } from "@/lib/session"
import { listarUsuarios, listarMaterias, listarCatedras } from "@/lib/catedras"
import { UsuariosView } from "@/components/dashboard/usuarios-view"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>
}) {
  await requireRole("admin")
  const { u } = await searchParams

  const [usuarios, materias] = await Promise.all([
    listarUsuarios(),
    listarMaterias(),
  ])

  const seleccionado = usuarios.find((x) => x.userId === u) ?? null
  const catedras =
    seleccionado?.rol === "profesor" ? await listarCatedras(seleccionado.userId) : []

  return (
    <UsuariosView
      usuarios={usuarios}
      materias={materias}
      seleccionado={seleccionado}
      catedras={catedras}
    />
  )
}
```

- [ ] **Step 4: Verificar el circuito completo**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: todo pasa.

A mano, con `DEV_BYPASS_ROLE=admin`:
1. `/usuarios` lista los usuarios.
2. Elegir un profesor, asignarle "Sistemas Digitales" división A.
3. Cambiar a `DEV_BYPASS_ROLE=profesor` (reiniciar el server) y confirmar que
   `/catedras` la muestra y `/notas` la ofrece en el select.
4. Volver a admin, quitarla, y confirmar que el profesor deja de verla.

- [ ] **Step 5: Commit**

```bash
git add app/\(campus\)/usuarios components/dashboard/usuarios-view.tsx
git commit -m "feat(usuarios): add catedra assignment screen for admins"
```

---

### Task 14: QA final y limpieza

**Files:**
- Delete: `components/dashboard/notas-view.tsx`
- Modify: `lib/mock-data.ts`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: nada nuevo

- [ ] **Step 1: Borrar la vista vieja**

```bash
git rm components/dashboard/notas-view.tsx
```

Verificar que no queda ninguna referencia:

```bash
grep -rn "notas-view\|NotasView" --include=*.tsx --include=*.ts . | grep -v node_modules
```

Expected: sin resultados.

- [ ] **Step 2: Limpiar los mocks de notas**

En `lib/mock-data.ts`, eliminar `NOTAS_ALUMNO`, `ALUMNOS_CURSO`,
`CURSOS_PROFESOR`, `AlumnoCurso`, `NotaMateria`, `EstadoNota`, `promedioGeneral`
y `ROLES`: las notas ahora salen de la base, y `ROLES` solo lo usaba el selector
de rol que se eliminó en la Task 8.

Dejar `PERFIL` (lo sigue usando `dashboard-home.tsx`), `EVENTOS`, `MESAS`, `Rol`
y los tipos de calendario y mesas, que siguen siendo mocks: están fuera del
alcance de este plan.

Verificar que compila después de cada borrado:

Run: `npx tsc --noEmit`
Expected: sin errores. Si algo se rompe, la referencia sobrante indica una vista
que todavía usa mocks de notas.

- [ ] **Step 3: Correr la checklist de QA del spec**

- [ ] Admin asigna una cátedra a un profesor y este la ve en "Mis Cátedras"
- [ ] Admin quita la cátedra y el profesor deja de ver ese curso
- [ ] El profesor carga una nota y el alumno la ve con el número real
- [ ] Un alumno con dos profesores distintos: cada uno ve solo su materia
- [ ] `curl -s http://localhost:3000/notas` como alumno no contiene datos de otro alumno
- [ ] Con `DEV_BYPASS_AUTH=false`, el selector de rol no aparece
- [ ] `/notas?catedra=<id-ajeno>` no muestra la planilla de otro profesor
- [ ] `/usuarios` como profesor cae en el `error.tsx`, no lista usuarios

- [ ] **Step 4: Verificación final**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: todo verde.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove grade mocks and legacy notas view"
```

---

## Notas para quien ejecute

**El seed de materias es provisorio.** Está armado con las materias que
aparecían en los mocks, con años inventados. Antes de usar esto de verdad hay
que reemplazar `drizzle/0005_seed_materias.sql` por el plan de estudios real del
IPESMI.

**Falta poblar alumnos.** La planilla del profesor lista los `perfiles` con
`rol = 'alumno'` y el `anio`/`division` de la cátedra. Si no hay alumnos con esos
valores cargados, la planilla sale vacía — que es correcto, pero puede
confundirse con un bug. Para probar, crear algunos alumnos y setearles
`anio`/`division` a mano:

```sql
UPDATE public.perfiles SET anio = '4to', division = 'A'
WHERE user_id = '...';
```

**Lo que este plan NO hace**, y está en "Fuera de alcance" del spec: ABM de
materias desde la app, RLS en Postgres, congelar año y división por fila de
calificación, notas de mesas y previas, y observaciones por alumno.
