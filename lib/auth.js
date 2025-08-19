// lib/auth.js
import jwt from 'jsonwebtoken'
import { serialize, parse } from 'cookie'

export const COOKIE_NAME = 'admin_token'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'

// يحدد إن كان ينبغي وضع الكوكي كـ secure (HTTPS) حتى عند العمل خلف بروكسي مثل Vercel
function isSecure(req) {
  if (process.env.NODE_ENV === 'production') return true
  const xf = req?.headers?.['x-forwarded-proto']
  return xf ? String(xf).split(',')[0].trim() === 'https' : false
}

export function signJwt(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
    ...opts,
  })
}

export function verifyJwt(token) {
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}

export function setAuthCookie(res, token, req) {
  res.setHeader('Set-Cookie', serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(req), // على 127.0.0.1 ستكون false، وعلى Vercel ستكون true
    path: '/',             // صالح لكل الموقع
    maxAge: 60 * 60 * 24 * 7,
  }))
}

export function clearAuthCookie(res, req) {
  res.setHeader('Set-Cookie', serialize(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(req),
    path: '/',
    maxAge: 0,
  }))
}

export function getTokenFromReq(req) {
  // أولوية لـ Authorization: Bearer <token>
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim()

  const cookies = parse(req.headers.cookie || '')
  return cookies[COOKIE_NAME] || cookies.token || ''
}

export function getUserFromReq(req) {
  const payload = verifyJwt(getTokenFromReq(req))
  if (!payload) return null
  const roles = Array.isArray(payload.roles) && payload.roles.length
    ? payload.roles
    : (payload.role ? [payload.role] : ['admin'])
  return {
    id: payload.sub,
    email: payload.email || payload.username,
    username: payload.username || payload.email,
    roles,
  }
}

// إصدار توكن + ضبط الكوكي عند تسجيل الدخول
export function issueLogin(res, user, req) {
  const token = signJwt({
    sub: user.id || user._id || user.email,
    email: user.email,
    username: user.username || user.email,
    roles: user.roles || (user.role ? [user.role] : ['admin']),
  })
  setAuthCookie(res, token, req)
  return token
}

// وسيطان للاستخدام في REST
export function requireAuth(handler) {
  return (req, res) => {
    const user = getUserFromReq(req)
    if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' })
    req.user = user
    return handler(req, res)
  }
}

export function requireRole(handler, roles = ['admin']) {
  return (req, res) => {
    const user = getUserFromReq(req)
    if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' })
    const allowed = roles.some(r => user.roles?.includes(r))
    if (!allowed) return res.status(403).json({ ok: false, error: 'forbidden' })
    req.user = user
    return handler(req, res)
  }
}
