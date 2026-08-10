-- Datos de prueba para verificar scoping de notas.
-- Reejecutable: usa ON CONFLICT DO NOTHING.
-- Los usuarios @test.local se limpian con limpiar-test-data.sql.

-- El catálogo lo seedea la migración 0005. Este script NO lo crea: si falta
-- una materia, es un problema de las migraciones y hay que verlo, no
-- taparlo insertando filas que después nadie limpia.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.materias WHERE nombre = 'Sistemas Digitales' AND anio = '4to')
     OR NOT EXISTS (SELECT 1 FROM public.materias WHERE nombre = 'Taller de Electromecánica' AND anio = '4to')
  THEN
    RAISE EXCEPTION 'Faltan materias del catálogo. Corré las migraciones antes de este seed.';
  END IF;
END $$;

-- Profesor: Aguirre, Martín
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'aguirre@test.local',
  jsonb_build_object(
    'name', 'Aguirre, Martín',
    'role', 'profesor'
  ),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Alumnos en 4to A
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'blanco@test.local',
    jsonb_build_object('name', 'Blanco, Facundo', 'role', 'alumno', 'anio', '4to', 'division', 'A'), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nunez@test.local',
    jsonb_build_object('name', 'Nuñez, Lautaro', 'role', 'alumno', 'anio', '4to', 'division', 'A'), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'enriquez@test.local',
    jsonb_build_object('name', 'Enriquez, Tomás', 'role', 'alumno', 'anio', '4to', 'division', 'A'), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Profesora sin cátedras, para probar el estado vacío
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('77777777-7777-7777-7777-777777777777','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
        'vega@test.local', jsonb_build_object('name','Vega, Carolina','role','profesor'), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Alumnos en 4to B
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'moreno@test.local',
    jsonb_build_object('name', 'Moreno, Julieta', 'role', 'alumno', 'anio', '4to', 'division', 'B'), now(), now()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'castro@test.local',
    jsonb_build_object('name', 'Castro, Bruno', 'role', 'alumno', 'anio', '4to', 'division', 'B'), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Verifica que el trigger asignó rol profesor a Aguirre.
DO $$
DECLARE rol_aguirre text;
BEGIN
  SELECT rol INTO rol_aguirre FROM public.perfiles
  WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF rol_aguirre IS DISTINCT FROM 'profesor' THEN
    RAISE EXCEPTION 'El trigger no asignó rol profesor a Aguirre (quedó: %)', rol_aguirre;
  END IF;
END $$;

-- Cátedra: Aguirre dicta Sistemas Digitales en división A solamente
INSERT INTO public.catedras (profesor_id, materia_id, division)
SELECT
  '11111111-1111-1111-1111-111111111111',
  id,
  'A'
FROM public.materias
WHERE nombre = 'Sistemas Digitales' AND anio = '4to'
ON CONFLICT (profesor_id, materia_id, division) DO NOTHING;

-- Calificaciones en el ciclo lectivo actual.
-- Alumnos de 4to A en Sistemas Digitales (Aguirre debe verlas)
INSERT INTO public.calificaciones (alumno_id, materia_id, ciclo_lectivo, trimestre_1, trimestre_2, trimestre_3)
SELECT
  '22222222-2222-2222-2222-222222222222',
  id,
  EXTRACT(YEAR FROM now())::int,
  7,
  8,
  9
FROM public.materias
WHERE nombre = 'Sistemas Digitales' AND anio = '4to'
ON CONFLICT (alumno_id, materia_id, ciclo_lectivo) DO NOTHING;

INSERT INTO public.calificaciones (alumno_id, materia_id, ciclo_lectivo, trimestre_1, trimestre_2, trimestre_3)
SELECT
  '33333333-3333-3333-3333-333333333333',
  id,
  EXTRACT(YEAR FROM now())::int,
  6,
  5,
  6
FROM public.materias
WHERE nombre = 'Sistemas Digitales' AND anio = '4to'
ON CONFLICT (alumno_id, materia_id, ciclo_lectivo) DO NOTHING;

INSERT INTO public.calificaciones (alumno_id, materia_id, ciclo_lectivo, trimestre_1, trimestre_2, trimestre_3)
SELECT
  '44444444-4444-4444-4444-444444444444',
  id,
  EXTRACT(YEAR FROM now())::int,
  8,
  7,
  8
FROM public.materias
WHERE nombre = 'Sistemas Digitales' AND anio = '4to'
ON CONFLICT (alumno_id, materia_id, ciclo_lectivo) DO NOTHING;

-- Alumnos de 4to B en Sistemas Digitales (Aguirre NO debe verlas: división B)
INSERT INTO public.calificaciones (alumno_id, materia_id, ciclo_lectivo, trimestre_1, trimestre_2, trimestre_3)
SELECT
  '55555555-5555-5555-5555-555555555555',
  id,
  EXTRACT(YEAR FROM now())::int,
  9,
  9,
  10
FROM public.materias
WHERE nombre = 'Sistemas Digitales' AND anio = '4to'
ON CONFLICT (alumno_id, materia_id, ciclo_lectivo) DO NOTHING;

INSERT INTO public.calificaciones (alumno_id, materia_id, ciclo_lectivo, trimestre_1, trimestre_2, trimestre_3)
SELECT
  '66666666-6666-6666-6666-666666666666',
  id,
  EXTRACT(YEAR FROM now())::int,
  7,
  8,
  7
FROM public.materias
WHERE nombre = 'Sistemas Digitales' AND anio = '4to'
ON CONFLICT (alumno_id, materia_id, ciclo_lectivo) DO NOTHING;

-- Blanco en Taller de Electromecánica (Aguirre NO dicta esta materia)
INSERT INTO public.calificaciones (alumno_id, materia_id, ciclo_lectivo, trimestre_1, trimestre_2, trimestre_3)
SELECT
  '22222222-2222-2222-2222-222222222222',
  id,
  EXTRACT(YEAR FROM now())::int,
  6,
  7,
  7
FROM public.materias
WHERE nombre = 'Taller de Electromecánica' AND anio = '4to'
ON CONFLICT (alumno_id, materia_id, ciclo_lectivo) DO NOTHING;
