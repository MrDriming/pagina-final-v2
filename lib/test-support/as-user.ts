import { vi } from "vitest"

/**
 * Helper compartido por los tests de integración de lib/notas.ts y
 * lib/catedras.ts.
 *
 * Esos módulos resuelven "quién soy" con el bypass de desarrollo
 * (lib/dev-auth.ts): si DEV_BYPASS_USER_ID está seteado, getSessionUser()
 * busca ESE perfil real en la base. El problema es que dev-auth.ts lo
 * captura en una `const` de módulo al importarse, así que tocar
 * process.env a mitad de un test no tiene ningún efecto sobre un módulo ya
 * cargado.
 *
 * `comoUsuario` resetea el registro de módulos de Vitest y recién después
 * cambia el env, así el próximo `import()` dinámico (el que hace el
 * callback `cargarModulo`) lee el valor nuevo en frío — junto con toda la
 * cadena de módulos de la que depende (session, catedras, notas, permisos).
 *
 * Uso:
 *   const { getPlanilla } = await comoUsuario(AGUIRRE, () => import("@/lib/notas"))
 *
 * Pasar `null` como userId simula al usuario de desarrollo "de fantasía"
 * (sin DEV_BYPASS_USER_ID), que toma el rol de DEV_BYPASS_ROLE — útil para
 * probar casos de admin cuando no hace falta un perfil real en la base.
 */
export async function comoUsuario<T>(
  userId: string | null,
  cargarModulo: () => Promise<T>,
): Promise<T> {
  vi.resetModules()

  if (userId) {
    process.env.DEV_BYPASS_USER_ID = userId
  } else {
    delete process.env.DEV_BYPASS_USER_ID
  }
  process.env.DEV_BYPASS_AUTH = "true"

  return cargarModulo()
}
