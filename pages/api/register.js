// pages/api/register.js
import { dbConnect } from '@/lib/db'
import Attendee from '@/models/Attendee'
import Settings from '@/models/Settings'
import QRCode from 'qrcode'
import nodemailer from 'nodemailer'

function getTransporter() {
  const host = process.env.SMTP_HOST || ''
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const emailDisabled = String(process.env.EMAIL_DISABLED || '').toLowerCase() === 'true'

  if (emailDisabled) return null
  if (!host || !user || !pass) return null

  // 587 => STARTTLS (secure=false) ، 465 => SMTPS (secure=true)
  const secure = port === 465 || String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'

  return nodemailer.createTransport({
    host,
    port,
    secure,                 // false مع 587 (STARTTLS)
    auth: { user, pass },
    requireTLS: !secure,    // يضمن StartTLS على 587
    tls: {
      // في التطوير على ويندوز قد تفيد لتجنب أخطاء الشهادات
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  })
}

function normalizeFrom(fromRaw, fallbackUser) {
  const raw = (fromRaw || '').trim()
  if (raw.includes('<') && raw.includes('>')) return raw
  if (/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(raw)) return raw
  if (raw && fallbackUser) return `${raw.replace(/["<>]/g, '')} <${fallbackUser}>`
  return fallbackUser || 'no-reply@example.com'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' })
  }

  try {
    await dbConnect()

    const s = await Settings.findOne({}).lean()

    // كود التذكرة
    const ticketCode = 'Y' + Math.random().toString(36).slice(2, 8).toUpperCase()

    // حفظ المشارك
    const doc = await Attendee.create({
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      employmentStatus: req.body.employmentStatus,
      jobTitle: req.body.jobTitle,
      employer: req.body.employer,
      sector: req.body.sector,
      gender: req.body.gender,
      birthDate: req.body.birthDate || null,
      gradYear: req.body.gradYear || null,
      ticketCode,
      checkedIn: false,
    })

    // QR كـ Data URL
    const qrText = `TICKET:${ticketCode}`
    const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 300 })

    // إرسال بريد (اختياري) — أي خطأ لن يُفشل التسجيل
    try {
      const tx = getTransporter()
      if (tx) {
        const siteName  = s?.siteName || process.env.NEXT_PUBLIC_SITE_NAME || 'Conference'
        const websiteUrl = s?.websiteUrl || process.env.NEXT_PUBLIC_WEBSITE_URL || ''
        const from = normalizeFrom(process.env.EMAIL_FROM, process.env.SMTP_USER)

        await tx.sendMail({
          from,
          to: doc.email,
          subject: `تأكيد التسجيل - ${siteName}`,
          html: `
            <div style="direction:rtl;font-family:tahoma,arial,sans-serif">
              <h3>تم تأكيد تسجيلك في ${siteName}</h3>
              <p>يرجى إبراز هذا الكود عند الوصول:</p>
              <p style="font-family:monospace;font-size:18px"><strong>${ticketCode}</strong></p>
              <img src="${qrDataUrl}" alt="QR" style="width:220px;height:220px;object-fit:contain" />
              ${websiteUrl ? `<p><a href="${websiteUrl}">${websiteUrl}</a></p>` : ''}
            </div>
          `,
          text: `تم تأكيد تسجيلك. كود الدخول: ${ticketCode}`
        })
      }
    } catch (mailErr) {
      console.error('MAIL_ERROR:', mailErr && mailErr.message ? mailErr.message : mailErr)
      // نكمل بدون فشل
    }

    return res.status(200).json({ success: true, ticketCode, qrDataUrl, id: doc._id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message || 'Server error' })
  }
}
