/**
 * Sanitiza el `next` que llega por query string en los flujos de auth
 * (`/auth/confirm`, `/auth/callback`) antes de usarlo en un redirect.
 *
 * Sin esto, `next=@evil.com` (u otras rutas "raras") termina siendo un
 * open redirect: por ejemplo `redirect(`${origin}${next}`)` con
 * `next="@evil.com"` arma una URL donde `@` convierte todo lo anterior en
 * userinfo y el host real pasa a ser `evil.com`.
 *
 * Solo se acepta un path relativo que empiece con un único `/`: nada de
 * `//host` (protocol-relative) ni `/\host` (algunos navegadores lo tratan
 * como `//`). Cualquier otra cosa cae a `/`.
 */
export function safeRedirectPath(next: string | null): string {
  if (!next) return "/"
  if (!next.startsWith("/")) return "/"
  if (next.startsWith("//") || next.startsWith("/\\")) return "/"
  return next
}
