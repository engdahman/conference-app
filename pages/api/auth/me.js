// pages/api/auth/me.js
import { getUserFromReq } from '@/lib/auth'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ ok: false })
  return res.status(200).json({ ok: true, user })
}
