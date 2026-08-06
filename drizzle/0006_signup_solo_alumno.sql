-- Endurece el trigger de alta de usuarios: el signup público solo crea
-- alumnos. Antes, `raw_user_meta_data ->> 'role'` (controlado por el
-- cliente en el signup) podía valer 'profesor' y el trigger lo aceptaba.
-- El formulario (components/auth/auth-screen.tsx) ya no manda `role`, pero
-- la defensa real tiene que estar acá: nada de lo que venga en
-- `raw_user_meta_data` puede decidir el rol.
--
-- Los profesores se promueven a mano:
--   UPDATE public.perfiles SET rol = 'profesor' WHERE user_id = '...';
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
    'alumno',
    NULLIF(NEW.raw_user_meta_data ->> 'anio', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'division', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
