// pages/api/auth/login.js
import { setAuthCookie, signJwt } from '@/lib/auth'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  }

  const { username, password } = req.body || {}

  const U = process.env.ADMIN_DEFAULT_USER ?? 'admin'
  const P = process.env.ADMIN_DEFAULT_PASS ?? 'admin123'

  if (username === U && password === P) {
    // أضفنا staff مع admin
    const roles = ['admin', 'staff']
    const token = signJwt({ sub: 'admin', username, roles })
    setAuthCookie(res, token)
    return res.status(200).json({ ok: true, user: { username, roles } })
  }

  return res.status(401).json({ ok: false, error: 'bad_credentials' })
}
