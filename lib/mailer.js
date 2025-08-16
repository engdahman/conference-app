// lib/mailer.js
import nodemailer from 'nodemailer'

const HOST = process.env.SMTP_HOST || ''
const PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const USER = process.env.SMTP_USER || ''
const PASS = process.env.SMTP_PASS || ''
const EMAIL_DISABLED = String(process.env.EMAIL_DISABLED || '').toLowerCase() === 'true'

function normalizeFrom(fromRaw, user) {
  const raw = (fromRaw || '').trim()
  if (!raw && user) return user
  // إذا بصيغة "Name <a@b>"
  if (raw.includes('<') && raw.includes('>')) return raw
  // إذا بريد فقط
  if (/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(raw)) return raw
  // اسم فقط + user
  if (raw && user) return `${raw.replace(/["<>]/g, '')} <${user}>`
  return user || 'no-reply@example.com'
}

const FROM = normalizeFrom(process.env.EMAIL_FROM, USER)

let transporter = null
export function getTransporter() {
  if (EMAIL_DISABLED) return null
  if (!HOST || !PORT || !USER || !PASS) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // Office365 587 => false + STARTTLS
      auth: { user: USER, pass: PASS },
      tls: {
        // لتجنب مشاكل شهادات في التطوير على ويندوز
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    })
  }
  return transporter
}

export async function sendMail({ to, subject, text, html }) {
  if (EMAIL_DISABLED) return { ok: false, disabled: true }
  const tx = getTransporter()
  if (!tx) return { ok: false, skipped: true }
  const info = await tx.sendMail({ from: FROM, to, subject, text, html })
  return { ok: true, messageId: info.messageId }
}
