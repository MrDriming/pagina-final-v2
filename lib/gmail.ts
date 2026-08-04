import nodemailer from "nodemailer"

// 1️⃣ Configuración del transportador usando las credenciales de tu archivo .env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,          // Tu cuenta de correo de la institución
    pass: process.env.GMAIL_APP_PASSWORD,  // Contraseña de aplicación generada en tu cuenta Google
  },
})

/**
 * 2️⃣ AGREGÁ ESTA FUNCIÓN NUEVA:
 * Envía una notificación por correo al alumno cuando se agenda o reprograma una evaluación.
 */
export async function enviarNotificacionExamen({
  to,
  materia,
  nuevaFecha,
  nuevaHora,
  tipoEvaluación,
}: {
  to: string
  materia: string
  nuevaFecha: string
  nuevaHora: string
  tipoEvaluación: string
}) {
  const mailOptions = {
    from: `"Campus IPESMI Técnico" <${process.env.GMAIL_USER}>`,
    to: to,
    subject: `⚠️ Cambio de fecha: Evaluación de ${materia}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded-xl: 12px;">
        <div style="background-color: #059669; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 20px;">IPESMI Técnico — Novedades Académicas</h2>
        </div>
        <div style="padding: 20px; color: #1e293b; line-height: 1.6;">
          <p>Hola,</p>
          <p>Te informamos que se ha registrado una actualización en el cronograma de evaluaciones regulares para tu curso:</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 4px 0;"><strong>Espacio Curricular:</strong> ${materia}</p>
            <p style="margin: 4px 0;"><strong>Instancia:</strong> ${tipoEvaluación}</p>
            <p style="margin: 4px 0;"><strong>Nueva Fecha:</strong> ${nuevaFecha}</p>
            <p style="margin: 4px 0;"><strong>Horario:</strong> ${nuevaHora} hs</p>
          </div>

          <p style="font-size: 13px; color: #64748b;">Por favor, ingresá al Campus Virtual para verificar posibles modificaciones en tus horarios de taller o aulas asignadas.</p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
          Este es un correo automático generado por el sistema de alertas del IPESMI. No lo respondas.
        </div>
      </div>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error al despachar el correo institucional vía Gmail:", error)
    return { success: false, error }
  }
}