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
function normalizePhoneRaw(raw='') {
  let s = normalizeArabicDigits(String(raw)).replace(/[^\d+]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  return s
}
function isLikelyPhone(raw='') {
  const s = normalizePhoneRaw(raw)
  return /^[+]?\d{8,15}$/.test(s)
}
function phoneVariants(raw='') {
  const s = normalizePhoneRaw(raw)
  const v = new Set()
  if (!s) return []
  v.add(s)
  if (s.startsWith('+')) v.add(s.slice(1))
  if (/^0\d{8,14}$/.test(s)) {
    const no0 = s.slice(1)
    v.add('966' + no0)
    v.add('+966' + no0)
  }
  if (/^(?:\+?966)(\d{9,})$/.test(s)) {
    const m = s.replace(/^\+?966/, '')
    if (m.startsWith('5')) v.add('0' + m)
  }
  for (const x of Array.from(v)) v.add(x.replace(/^\+/, ''))
  return Array.from(v)
}

// يلتقط الكود من body (JSON أو نص) أو من query
function pickRawCode(req) {
  let raw = ''
  const b = req.body
  if (b) {
    if (typeof b === 'string') {
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

// إرسال أخطاء مقروءة مع تفاصيل في التطوير فقط
function sendError(res, httpStatus, code, err) {
  const payload = { success: false, error: code }
  if (process.env.NODE_ENV !== 'production' && err) {
    payload.detail = err.message || String(err)
  }
  return res.status(httpStatus).json(payload)
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    if (req.method === 'GET') {
      req.body = {}
    } else {
      return res.status(405).json({ success:false, error:'method_not_allowed' })
    }
  }

  const raw = pickRawCode(req)
  if (!raw) return res.status(400).json({ success:false, error:'missing_code' })

  const asEmail = /@/.test(raw)
  const asPhone = !asEmail && isLikelyPhone(raw)
  const code  = asEmail || asPhone ? '' : normalizeCode(raw)
  const email = asEmail ? String(raw).trim() : ''
  const phone = asPhone ? normalizePhoneRaw(raw) : ''

  const or = []
  if (code) {
    const bare = code.replace(/^TKT[-_]?/, '')
    const codeVars = new Set([bare, `TKT-${bare}`, `TKT_${bare}`])
    or.push({ ticketCode: { $in: Array.from(codeVars) } })
  }
  if (email) {
    or.push({ email: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') })
  }
  if (phone) {
    or.push({ phone: { $in: phoneVariants(phone) } })
  }
  if (!or.length) return res.status(400).json({ success:false, error:'bad_input' })

  // الاتصال بقاعدة البيانات
  let db, col
  try {
    db  = await getDb()
    col = db.collection('attendees')
  } catch (e) {
    console.error('checkin db error:', e)
    return sendError(res, 500, 'db_unavailable', e)
  }

  let attendee
  try {
    attendee = await col.findOne({ $or: or })
  } catch (e) {
    console.error('checkin query error:', e)
    return sendError(res, 500, 'query_failed', e)
  }
  if (!attendee) return res.status(404).json({ success:false, error:'not_found' })

  if (attendee.checkedIn) {
    return res.json({ success:true, already:true, attendee })
  }

  const now = new Date()
  try {
    await col.updateOne({ _id: attendee._id }, { $set: { checkedIn:true, checkinAt: now } })
  } catch (e) {
    console.error('checkin update error:', e)
    return sendError(res, 500, 'update_failed', e)
  }

  return res.json({ success:true, attendee: { ...attendee, checkedIn:true, checkinAt: now } })
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }
export default requireRole(handler, ['admin','staff'])
