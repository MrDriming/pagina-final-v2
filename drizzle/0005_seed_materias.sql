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
