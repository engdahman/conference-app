// lib/email.js
import nodemailer from 'nodemailer'

export function mailer() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    // مسموح تشغيل بدون بريد – نرجّع ناقل وهمي يطبع فقط
    return {
      async sendMail(opts) {
        console.log('DEV MAIL (no SMTP configured):', opts)
        return { accepted: [opts.to] }
      }
    }
  }

  const transporter = nodemailer.createTransport({
    host, port,
    secure: port === 465, // Office365: 587 => false (STARTTLS)
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  })
  return transporter
}

export async function sendRegistrationEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || 'Conference <no-reply@example.com>'
  const t = mailer()
  return t.sendMail({ from, to, subject, html })
}
