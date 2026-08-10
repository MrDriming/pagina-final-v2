# Campus IPESMI

Campus virtual de una escuela secundaria técnica. Next.js 16 (App Router) +
Drizzle sobre Postgres (Supabase).

## Roles y bootstrap del primer admin

El signup público (`/auth/sign-up`) solo puede crear cuentas con rol
**alumno**. No hay un toggle "soy docente" ni "soy admin" en el formulario:
si lo hubiera, cualquiera podría autoadjudicarse permisos de profesor o
administrador con solo completar un campo del lado del cliente, sin que
nadie del lado del servidor lo revise. Otorgar rol de profesor o admin es,
a partir de ahora, una acción exclusivamente administrativa.

Un vez que existe al menos un admin, el resto se resuelve desde la app: la
pantalla **`/usuarios`** permite:

- Cambiar el rol de cualquier usuario (alumno / profesor / admin). Al bajar
  a un profesor de categoría, sus cátedras se borran automáticamente (si no,
  quedarían filas de `catedras` apuntando a alguien que ya no dicta, y eso
  le seguiría abriendo notas de alumnos).
- Asignar (o limpiar) el año y la división de un alumno, para que un
  profesor con cátedra en ese año/división pueda cargarle notas.

El problema es el arranque: para entrar a `/usuarios` hace falta ser admin,
y para ser admin hace falta que alguien ya admin te lo asigne. La primera
vez no hay nadie. Por eso el primer admin se crea a mano, una sola vez, con
SQL directo contra la base:

```sql
UPDATE public.perfiles SET rol = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tu@mail.com');
```

Corré ese `UPDATE` después de que la persona se haya registrado normalmente
(como alumno) desde `/auth/sign-up`. De ahí en más, todo el resto de
usuarios (profesores, otros admins) se gestiona desde `/usuarios` sin volver
a tocar SQL.

Por seguridad, un admin no puede cambiarse el rol a sí mismo desde
`/usuarios`: si el único admin se degradara, nadie podría volver a entrar a
esa pantalla y el sistema quedaría sin administración, sin forma de
arreglarlo desde la app. Si hace falta bajar al único admin, se hace con el
mismo tipo de `UPDATE` de arriba.

## Desarrollo local

Node ≥ 20. Variables de entorno en `.env.local` (ver `DATABASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, etc.). `DEV_BYPASS_AUTH=true` permite entrar sin
Supabase real; `DEV_BYPASS_ROLE` y `DEV_BYPASS_USER_ID` controlan con qué
usuario.

```sh
npm install
npm run dev
npm test
npx tsc --noEmit
npm run build
```
