-- Puente entre Supabase Auth (`auth.users`) y el perfil de la app.
-- Escrito a mano: Drizzle no modela el schema `auth`, ni triggers, ni RLS.
-- Por eso: usar `drizzle-kit generate` + `migrate`, NUNCA `drizzle-kit push`.

-- 1) `perfiles.user_id` es la misma fila que `auth.users.id`.
--    Al borrar el usuario en Supabase, se borra su perfil.
ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
--> statement-breakpoint

-- 2) Solo estos tres roles.
ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('alumno', 'profesor', 'admin'));
--> statement-breakpoint

-- 3) Crear el perfil solo cuando se crea el usuario.
--
--    SEGURIDAD: el rol viene de `raw_user_meta_data`, que el cliente
--    controla en el signup. Por eso acá se aceptan únicamente 'alumno' y
--    'profesor'; cualquier otra cosa (incluido 'admin') cae a 'alumno'.
--    Los admins se marcan a mano:
--      UPDATE public.perfiles SET rol = 'admin' WHERE user_id = '...';
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (user_id, nombre, rol, anio, division)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('alumno', 'profesor')
        THEN NEW.raw_user_meta_data ->> 'role'
      ELSE 'alumno'
    END,
    NULLIF(NEW.raw_user_meta_data ->> 'anio', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'division', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint

-- 4) RLS prendido y SIN políticas, a propósito.
--    La app nunca lee estas tablas desde el browser: todo pasa por
--    `lib/db` (conexión directa como `postgres`, que saltea RLS).
--    Así, aunque alguien tenga la anon key, PostgREST no le devuelve nada.
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- 5) Backfill: perfiles para usuarios que ya existían antes del trigger.
INSERT INTO public.perfiles (user_id, nombre, rol)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'name', ''),
  CASE
    WHEN u.raw_user_meta_data ->> 'role' IN ('alumno', 'profesor')
      THEN u.raw_user_meta_data ->> 'role'
    ELSE 'alumno'
  END
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;
