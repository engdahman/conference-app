// pages/api/checkin.js
import { requireRole } from '@/lib/auth'
import { getDb } from '@/lib/db'

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
function normalizeArabicDigits(s='') {
  return String(s).replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)))
}
function extractFromUrlIfAny(raw='') {
  const s = String(raw).trim()
  if (!/^https?:\/\//i.test(s)) return s
  try {
    const u = new URL(s)
    return u.searchParams.get('code') || u.searchParams.get('ticket') || u.searchParams.get('t') || s
  } catch { return s }
}
function normalizeCode(raw='') {
  let s = decodeURIComponent(String(raw))
  s = extractFromUrlIfAny(s)
  s = normalizeArabicDigits(s)
  s = s.replace(/\s+/g, '')
  s = s.replace(/^CODE[:=]/i, '')
  s = s.replace(/^TKT[-_]/i, '')
  return s.toUpperCase()
}
function normalizePhone(raw='') {
  let s = normalizeArabicDigits(String(raw))
  s = s.replace(/[^\d+]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  return s
}

// يلتقط الكود من body (JSON أو نص) أو من query
function pickRawCode(req) {
  let raw = ''
  const b = req.body
  if (b) {
    if (typeof b === 'string') {
      // قد يكون أرسل نصًا مباشرًا
      try { const j = JSON.parse(b); raw = j.code ?? j.q ?? j.ticket ?? j.t ?? '' } catch {}
      if (!raw) raw = b
    } else if (typeof b === 'object') {
      raw = b.code ?? b.q ?? b.ticket ?? b.t ?? b.text ?? ''
    }
  }
  if (!raw) {
    const q = req.query || {}
    raw = q.code ?? q.q ?? q.ticket ?? q.t ?? ''
  }
  return String(raw || '').trim()
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    // دعم GET أيضًا لسهولة الاختبار: /api/checkin?code=TKT-123
    if (req.method === 'GET') {
      req.body = {}
    } else {
      return res.status(405).json({ success:false, error:'method_not_allowed' })
    }
  }

  const raw = pickRawCode(req)
  if (!raw) return res.status(400).json({ success:false, error:'missing_code' })

  const isEmail = /@/.test(raw)
  const looksLikePhone = /\d/.test(raw) && !isEmail

  const code  = isEmail || looksLikePhone ? '' : normalizeCode(raw)
  const email = isEmail ? String(raw).trim() : ''
  const phone = looksLikePhone ? normalizePhone(raw) : ''

  const db  = await getDb()
  const col = db.collection('attendees')

  const candidates = []
  if (code) {
    candidates.push(code)
    candidates.push(code.replace(/^TKT[-_]?/,''))
  }

  const or = []
  if (candidates.length) or.push({ ticketCode: { $in: candidates } })
  if (email) or.push({ email: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') })
  if (phone) or.push({ phone })

  if (!or.length) return res.status(400).json({ success:false, error:'bad_input' })

  const attendee = await col.findOne({ $or: or })
  if (!attendee) return res.status(404).json({ success:false, error:'not_found' })

  if (attendee.checkedIn) {
    return res.json({ success:true, already:true, attendee })
  }

  const now = new Date()
  await col.updateOne({ _id: attendee._id }, { $set: { checkedIn:true, checkinAt: now } })
  return res.json({ success:true, attendee: { ...attendee, checkedIn:true, checkinAt: now } })
}

// تأكد أن البودي بارسر مفعّل (الوضع الافتراضي كذلك)
export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }

export default requireRole(handler, ['admin','staff'])
