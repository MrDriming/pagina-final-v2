import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * En serverless (Vercel) cada instancia de función levanta su propio Pool, y
 * hay muchas instancias a la vez. Con el default (max: 10) se agotan las
 * conexiones del pooler enseguida: una por instancia alcanza.
 *
 * `DATABASE_URL` tiene que apuntar al pooler de Supabase
 * (`aws-0-<region>.pooler.supabase.com:6543`), no a `db.<ref>.supabase.co`:
 * la conexión directa resuelve solo por IPv6 y las funciones de Vercel salen
 * por IPv4. Ver `.env.example`.
 */

/**
 * Supabase firma el certificado de Postgres con su propia CA ("Supabase Root
 * 2021 CA"), que no está en el trust store del sistema. Tanto la conexión
 * directa como el pooler dan "self-signed certificate in certificate chain"
 * si se verifica contra las CAs públicas.
 *
 * Con `DATABASE_CA_CERT` seteada (el .crt que se baja de Settings > Database >
 * SSL Configuration, pegado tal cual) verificamos contra esa CA, que es lo
 * correcto. Sin ella caemos a no verificar: la conexión sigue cifrada, pero
 * queda expuesta a un man-in-the-middle. Es un fallback para desarrollo, no
 * algo para dejar así en producción.
 */
function sslConfig() {
  const ca = process.env.DATABASE_CA_CERT
  if (ca) return { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[db] DATABASE_CA_CERT no está seteada: la conexión a Postgres va cifrada " +
        "pero sin verificar el certificado del servidor.",
    )
  }
  return { rejectUnauthorized: false }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.VERCEL ? 1 : 10,
  ssl: sslConfig(),
});

export const db = drizzle(pool, { schema });