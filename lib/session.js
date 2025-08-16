// lib/session.js
import { serialize } from 'cookie'
import crypto from 'crypto'

const COOKIE_NAME = 'session'
const MAX_AGE = 60 * 60 * 8 // 8 ساعات

// استخدم JWT_SECRET إن وُجد (مطابق لبيئتك)
function secret() {
  return process.env.AUTH_SECRET || process.env.JWT_SECRET || 'devsecret'
}
function hmac(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url')
}
function sign(payloadObj) {
  const data = Buffer.from(JSON.stringify(payloadObj)).toString('base64url')
  const sig = hmac(data)
  return `${data}.${sig}`
}
function unsign(signed) {
  if (!signed || !signed.includes('.')) return null
  const [data, sig] = signed.split('.')
  const expected = hmac(data)
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  return JSON.parse(Buffer.from(data, 'base64url').toString())
}

export function getSession(req) {
  const raw = req.headers.cookie?.split(';').find(c => c.trim().startsWith(COOKIE_NAME + '='))?.split('=')[1]
  if (!raw) return null
  try { return unsign(raw) } catch { return null }
}
export function setSession(res, payload) {
  const value = sign({ ...payload, iat: Date.now() })
  res.setHeader('Set-Cookie', serialize(COOKIE_NAME, value, {
    path: '/', httpOnly: true, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
  }))
}
export function clearSession(res) {
  res.setHeader('Set-Cookie', serialize(COOKIE_NAME, '', {
    path: '/', httpOnly: true, maxAge: 0,
  }))
}
