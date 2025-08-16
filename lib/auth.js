// lib/auth.js
import jwt from 'jsonwebtoken'
import { serialize, parse } from 'cookie'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'

export function signJwt(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d', ...opts })
}

export function verifyJwt(token) {
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production'
  res.setHeader('Set-Cookie', serialize('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,        // على http://127.0.0.1 يجب أن تكون false
    path: '/',             // أهم سطر: خلي الكوكي صالحة لكل الموقع
    maxAge: 60 * 60 * 24 * 7
  }))
}

export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production'
  res.setHeader('Set-Cookie', serialize('admin_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 0
  }))
}

export function getTokenFromReq(req) {
  const cookies = parse(req.headers.cookie || '')
  return cookies.admin_token || cookies.token || ''
}

export function getUserFromReq(req) {
  const token = getTokenFromReq(req)
  const payload = verifyJwt(token)
  if (!payload) return null
  return { id: payload.sub, username: payload.username, roles: payload.roles || ['admin'] }
}

// وسيط حماية REST
export function requireRole(handler, roles = ['admin']) {
  return (req, res) => {
    const user = getUserFromReq(req)
    if (!user || !user.roles?.some(r => roles.includes(r))) {
      return res.status(401).json({ ok: false, error: 'unauthorized' })
    }
    req.user = user
    return handler(req, res)
  }
}
