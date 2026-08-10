# Scoping de notas por cátedra

**Fecha:** 2026-08-04
**Estado:** aprobado, pendiente de plan de implementación

## Problema

Un profesor ve las notas de cualquier alumno en cualquier materia. Debe ver
únicamente las de las materias que él dicta. Si dicta varias materias del mismo
alumno, ve esas y ninguna más.

Además, el profesor no tiene forma de cargar la nota de un alumno.

### Por qué no alcanza con filtrar

El scoping no es el problema de fondo: es el síntoma de que no hay capa de
autorización.

1. `components/dashboard/notas-view.tsx` es un componente `"use client"` con las
   calificaciones **hardcodeadas en un `useState`**. Ninguna vista consulta la
   base todavía.
2. La privacidad del alumno es esta línea, que corre en el browser después de
   que las notas de todos ya viajaron en el bundle:
   ```ts
   if (rol === "alumno" && row.alumno !== "Blanco, Facundo") return null
   ```
3. El rol es un `useState` en `app/dashboard-client.tsx`, y el Topbar tiene un
   selector de rol. Un alumno hace clic en "Profesor" y obtiene los botones de
   edición.
4. `notaParaAlumno()` enmascara las notas bajas como "EP" **al renderizar**: el
   número real ya está en las props del cliente.
5. `perfiles.catedras` (`text[]`) existe en el schema pero nadie lo escribe ni
   lo lee. `CatedrasView` es otro mock.

Filtrar el array no arregla nada mientras el array viaje entero al browser y el
rol se elija con un botón.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Qué define una cátedra | materia + año + división |
| Quién asigna cátedras | El admin, desde la sección Usuarios |
| Catálogo de materias | Fijo, cada materia atada a un año |
| Carga de notas | Planilla del curso con edición por fila |
| Enforcement | Server Components + Server Actions |
| "EP" para el alumno | **Se elimina.** El alumno ve su nota real |

### Enforcement: por qué Server Components y no RLS

Se evaluó poner las políticas en Postgres (RLS). Es la defensa más fuerte —
imposible de saltear aunque la app tenga bugs — pero obliga a abandonar la
conexión directa como `postgres` para estas tablas, a escribir varias políticas
SQL no triviales, y a debuggear errores que se manifiestan como "no hay filas".

Se elige la capa de aplicación: la regla queda en un módulo legible y testeable,
y el modelo de datos queda preparado para agregar RLS encima más adelante sin
rehacer nada. El paso a RLS es agregar políticas, no reescribir la app.

## Modelo de datos

### `materias` (nueva)

```
id      uuid  pk
nombre  text
anio    text        -- '1ro'..'6to'
UNIQUE (nombre, anio)
```

Catálogo fijo. Se seedea con el plan de estudios.

### `catedras` (nueva)

```
id           uuid  pk
profesor_id  uuid  → perfiles.user_id  ON DELETE CASCADE
materia_id   uuid  → materias.id       ON DELETE CASCADE
division     text                      -- 'A'..'D'
UNIQUE (profesor_id, materia_id, division)
```

Decide todos los permisos. El año no se repite acá: sale de `materias.anio`, así
no puede existir una cátedra de una materia de 4to declarada como de 5to.

### `calificaciones` (reescrita)

```
id               uuid  pk
alumno_id        uuid  → perfiles.user_id  ON DELETE CASCADE
materia_id       uuid  → materias.id
ciclo_lectivo    int                        -- 2026
trimestre_1      int
trimestre_2      int
trimestre_3      int
actualizado_por  uuid  → perfiles.user_id
updated_at       timestamptz
UNIQUE (alumno_id, materia_id, ciclo_lectivo)
```

Cambia respecto de la actual: `materia` pasa de texto libre a `materia_id`, y se
agregan `ciclo_lectivo`, `actualizado_por` y `updated_at`.

- **`ciclo_lectivo`**: sin esto, las notas del año siguiente pisan las de este.
- **`actualizado_por` / `updated_at`**: son notas de menores. Ante un reclamo hay
  que poder decir quién la cargó y cuándo.

### `perfiles`

Se elimina la columna `catedras` (`text[]`), reemplazada por la tabla `catedras`.
El año y la división del alumno siguen saliendo de `perfiles.anio` /
`perfiles.division`.

### La regla, en una frase

Un profesor ve la fila de calificación de un alumno si existe una cátedra suya
cuya `materia_id` coincide con la de la fila, y cuya `division` y
`materias.anio` coinciden con el `anio` y `division` del alumno en `perfiles`.

### Limitación aceptada

Si un alumno se cambia de división a mitad de año, sus notas anteriores pasan a
verlas el profesor de la división nueva, y las deja de ver el de la vieja.
Congelar año y división en cada fila de calificación lo resolvería, pero se
considera sobreingeniería: el docente nuevo es su docente. Revisar si los pases
de división resultan frecuentes.

## Capa de acceso

Tres módulos, todos con `import "server-only"`. Si alguien los importa desde un
componente cliente, **falla el build** en lugar de filtrar datos.

### `lib/permisos.ts`

El único lugar donde vive la regla. Todo lo demás lo llama.

```ts
puedeVerNota(user, alumno, materiaId): boolean
assertPuedeEditarNota(user, alumnoId, materiaId): Promise<void>
```

### `lib/notas.ts`

```ts
getNotasDeAlumno(alumnoId?)   // si el que llama es alumno, se ignora el arg
getPlanilla(catedraId)        // verifica que la cátedra sea del que llama
getNotasParaAdmin(filtros)    // solo lectura
guardarNota({ alumnoId, materiaId, t1, t2, t3 })   // Server Action
```

`guardarNota` hace *upsert* sobre `UNIQUE (alumno_id, materia_id,
ciclo_lectivo)`: la primera carga inserta, las siguientes actualizan. El
`ciclo_lectivo` lo determina el servidor con el año en curso, nunca el
formulario.

`getNotasParaAdmin(filtros)` recibe `{ anio?, division?, materiaId? }`, todos
opcionales.

### `lib/catedras.ts`

```ts
getMisCatedras()
listarCatedras(profesorId?)                        // admin
asignarCatedra({ profesorId, materiaId, division }) // admin
quitarCatedra(catedraId)                            // admin
```

### Dos invariantes

1. **Ninguna función recibe el rol por parámetro.** Lo obtienen de
   `getSessionUser()` internamente. Un rol que viaja como argumento termina
   llegando como `"admin"` desde el cliente.
2. **`guardarNota` reverifica todo.** El formulario manda `alumnoId` y
   `materiaId`; la acción no confía en ninguno y consulta la cátedra de nuevo
   antes del `UPDATE`. Si no, alcanza con editar el HTML para cargar notas en
   una materia ajena.

### Enmascarado "EP"

Se elimina. `notaParaAlumno()` se borra de `lib/grades.ts`; queda `notaReal()`.
El alumno ve su nota real.

Nota: el comentario actual de `grades.ts` afirma que la escuela impone mostrar
"EP". La decisión de mostrar la nota real es explícita del dueño del proyecto. Si
el "EP" proviene del reglamento institucional, revertirlo es reponer una función.

## UI

### Las secciones pasan de estado a rutas

`dashboard-client.tsx` elige la vista con `useState<SectionId>`. Un componente
cliente no puede renderizar uno de servidor por estado, así que mientras las
secciones sean estado no hay scoping server-side posible.

```
app/(campus)/layout.tsx          Sidebar + Topbar
app/(campus)/page.tsx            Inicio
app/(campus)/notas/page.tsx      Server Component
app/(campus)/calendario/page.tsx
app/(campus)/mesas/page.tsx
app/(campus)/consultas/page.tsx
app/(campus)/catedras/page.tsx
app/(campus)/usuarios/page.tsx
app/(campus)/config/page.tsx
app/(campus)/error.tsx
```

El Sidebar pasa de `onSelect` a `<Link>`, con el activo desde `usePathname()`.
Efectos secundarios buenos: funciona el botón atrás, las secciones son
enlazables, y el proxy puede proteger `/usuarios` por ruta.

### Vistas

`notas-view.tsx` (300 líneas, un solo componente cliente que hace tres cosas) se
parte en un Server Component que decide según el rol, más tres hijos:

- **`NotasAlumno`** — sus materias con sus notas reales. Sin columna Estudiante,
  sin edición. Las filas de otros no se envían.
- **`PlanillaProfesor`** — selector de cátedra arriba, alumnos del curso abajo,
  edición por fila. Sin cátedras asignadas, estado vacío indicando que consulte
  con Secretaría.
- **`NotasAdmin`** — solo lectura, con filtros por año, división y materia. Se
  mantiene el cartel "Modo Preceptor".

Otras:

- **`CatedrasView`** — datos reales de `getMisCatedras()`. Se le quita el botón
  "Asociar Materia": el profesor no se autoasigna.
- **`UsuariosView`** (nueva, hoy es un `Placeholder`) — lista de usuarios; al
  abrir un profesor, sus cátedras con opción de agregar (materia + división) y
  quitar.
- **Topbar** — el selector de rol aparece solo con `DEV_AUTH_BYPASS` activo.

## Errores

| Clase | Tratamiento |
|---|---|
| No autorizado | Es manipulación o bug, no error de usuario. Se loguea con el `user.id` y se responde genérico. `error.tsx` en el layout del campus. |
| Dato inválido | La Server Action devuelve `{ ok: false, error }`, se muestra junto a la fila. Se valida en el servidor: entero, 1 a 10, o nulo. Los `min`/`max` del input no son validación. |
| Fallo de base | Mensaje neutro en pantalla, log completo del lado del servidor. Nunca el error de Postgres crudo. |

## Testing

El repo no tiene infra de tests. Se agrega Vitest, con cobertura concentrada en
la lógica de permisos — la que, si falla, expone el boletín de un menor.

Casos obligatorios sobre `lib/permisos.ts`:

- Profesor con cátedra en 4to A no ve al alumno de 4to B en la misma materia
- Profesor no ve otra materia del mismo alumno
- Profesor con dos cátedras del mismo alumno ve esas dos y ninguna más
- Alumno solo se ve a sí mismo
- Alumno no ve a un compañero aunque pida su `alumnoId` explícitamente
- `guardarNota` rechaza un `materiaId` de una cátedra ajena
- Admin lee, no escribe

### QA manual

- [ ] Admin asigna una cátedra a un profesor y este la ve en "Mis Cátedras"
- [ ] Admin quita la cátedra y el profesor deja de ver ese curso
- [ ] El profesor carga una nota y el alumno la ve con el número real
- [ ] Un alumno con dos profesores distintos: cada uno ve solo su materia
- [ ] Ver el HTML de la página de notas de un alumno: no aparece ningún dato de
      otro alumno
- [ ] Con `DEV_BYPASS_AUTH=false`, el selector de rol no aparece

## Fuera de alcance

- ABM de materias desde la app (el catálogo se seedea)
- RLS en Postgres (el modelo queda preparado)
- Congelar año y división por fila de calificación
- Notas de mesas de examen, previas y equivalencias
- Observaciones por alumno

## Dependencias

- Plan de estudios real (materia → año) para el seed. Se arranca con las
  materias de los mocks actuales y se corrige.
