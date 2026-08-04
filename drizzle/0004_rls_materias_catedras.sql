-- RLS prendido y SIN políticas, igual que las demás tablas de dominio.
-- La app lee `materias` y `catedras` por `lib/db` (conexión directa como
-- `postgres`, que saltea RLS). Prenderlo cierra el acceso vía PostgREST
-- con la anon key. `catedras` decide permisos sobre notas: no puede quedar
-- expuesta.
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.catedras ENABLE ROW LEVEL SECURITY;
