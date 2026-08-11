-- Auditoría y notificaciones.
--
-- Escrito a mano, como 0001 y 0004: hace falta prender RLS, y `drizzle-kit
-- generate` no lo modela. Igual que en el resto del schema, RLS queda
-- prendido y SIN políticas a propósito: la app nunca lee estas tablas desde
-- el browser, todo pasa por `lib/db` (conexión como `postgres`, que saltea
-- RLS). Así, aunque alguien tenga la anon key, PostgREST no le devuelve nada.

CREATE TABLE IF NOT EXISTS public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Sin FK contra `perfiles`, a propósito: el rastro de lo que alguien hizo
  -- tiene que sobrevivir a que se borre su usuario. Por eso también van
  -- copiados el nombre y el rol.
  actor_id uuid,
  actor_nombre text NOT NULL DEFAULT '',
  actor_rol text NOT NULL DEFAULT '',
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id text,
  detalle jsonb,
  created_at timestamptz DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS auditoria_created_at_idx
  ON public.auditoria (created_at);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS auditoria_actor_idx
  ON public.auditoria (actor_id);
--> statement-breakpoint

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.perfiles (user_id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  cuerpo text NOT NULL DEFAULT '',
  link text,
  leida_at timestamptz,
  created_at timestamptz DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS notificaciones_user_idx
  ON public.notificaciones (user_id, created_at);
--> statement-breakpoint

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
