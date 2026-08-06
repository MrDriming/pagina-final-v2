import { db } from "./db";
import { perfiles } from "./db/schema";
import { auth } from "./auth";

async function createAdmin() {
  const adminEmail = "admin@escuela.com";
  const adminPassword = "AdminPassword123!";
  const adminName = "Administrador Principal";

  console.log("Creando cuenta de administrador...");

  try {
    // 1. Crear usuario en la autenticación
    const res = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
    });

    if (res?.user) {
      // 2. Insertar el perfil con rol 'admin' en la tabla 'perfiles'
      await db.insert(perfiles).values({
        userId: res.user.id,
        rol: "admin",
      });

      console.log("-----------------------------------------");
      console.log("¡Usuario Administrador creado con éxito!");
      console.log(`Email: ${adminEmail}`);
      console.log(`Contraseña: ${adminPassword}`);
      console.log("-----------------------------------------");
    }
  } catch (error) {
    console.error("Error al crear el admin:", error);
  }

  process.exit(0);
}

createAdmin();