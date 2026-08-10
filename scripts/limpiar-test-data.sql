-- Borra todos los usuarios @test.local y sus datos asociados.
-- Las cascadas de perfiles.user_id -> auth.users.id se encargan de eliminar:
--   - perfiles (fila por fila)
--   - catedras (el profesor_id es fk -> perfiles.user_id)
--   - calificaciones (alumno_id es fk -> perfiles.user_id)

DELETE FROM auth.users
WHERE email LIKE '%@test.local';
