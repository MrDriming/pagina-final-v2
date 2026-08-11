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

- **Dar de alta** a un alumno o a un profesor con su rol y su curso ya
  puestos, sin que la persona tenga que registrarse. La cuenta queda
  confirmada al instante (no se manda ningún mail) y el admin le entrega la
  contraseña inicial. Requiere `SUPABASE_SERVICE_ROLE_KEY` (ver más abajo).
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

## Auditoría

Toda modificación que hace un profesor o un admin queda registrada en la
tabla `auditoria`, y el admin la lee en **`/auditoria`**: quién, qué, cuándo
y —en el caso de las notas— de qué valor a qué valor pasó cada trimestre.

Dos decisiones de diseño que conviene no revertir sin pensarlas:

- `lib/auditoria.ts` **no atrapa errores**, y el `registrar` va dentro de la
  misma transacción que la operación que audita. O quedan las dos cosas, o no
  queda ninguna. Una auditoría que se pierde en silencio no sirve de prueba.
- `auditoria.actor_id` no tiene foreign key contra `perfiles`, y el nombre y
  el rol del actor van copiados en la fila. El registro tiene que sobrevivir
  a que se borre el usuario, y tiene que decir qué era esa persona **en ese
  momento**, no lo que es hoy.

La aplicación nunca actualiza ni borra filas de `auditoria`.

## Notificaciones

La campana de la barra superior lee la tabla `notificaciones` (una fila por
destinatario). Se generan solas al cargar o modificar una nota, al cambiar un
rol, al asignar un curso y al asignar o quitar una cátedra. Las lee el layout
de `(campus)`, así que un `router.refresh()` después de una acción alcanza
para que se actualicen.

## Desarrollo local

Node ≥ 20. Variables de entorno en `.env.local` (ver `.env.example`).
`DEV_BYPASS_AUTH=true` permite entrar sin Supabase real; `DEV_BYPASS_ROLE` y
`DEV_BYPASS_USER_ID` controlan con qué usuario.

`SUPABASE_SERVICE_ROLE_KEY` es la única variable nueva que hace falta agregar
también en Vercel. Saltea RLS y puede crear y borrar cualquier usuario: va
**sin** el prefijo `NEXT_PUBLIC_` y solo se usa desde `lib/supabase/admin.ts`,
que es `server-only`.

```sh
npm install
npm run dev
npm test
npx tsc --noEmit
npm run build
```

### Migraciones

```sh
npm run db:migrate
```

Nunca `drizzle-kit push`: los triggers, las FK contra `auth.users` y el RLS
viven en SQL escrito a mano y el push no los ve, así que los borra. Si
escribís una migración a mano, el `when` que le pongas en
`drizzle/meta/_journal.json` tiene que ser **mayor** que el de la última
aplicada, o el migrador dice "applied successfully" sin aplicar nada.
