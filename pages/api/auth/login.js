import { dbConnect } from '@/lib/db'
import { setAuthCookie, signJwt } from '@/lib/auth'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  }

  const body = req.body || {}
  const usernameRaw = (body.username || '').trim()
  const password = String(body.password || '')
  const username = usernameRaw.toLowerCase()

  // 1) Admin من متغيرات البيئة (دخول فوري بدون DB)
  const U = (process.env.ADMIN_DEFAULT_USER ?? 'admin').toLowerCase()
  const P = process.env.ADMIN_DEFAULT_PASS ?? 'admin123'
  if (username === U && password === P) {
    const roles = ['admin', 'staff'] // الأدمن لديه صلاحيات المسح أيضًا
    const token = signJwt({ sub: 'admin-env', username: U, roles })
    setAuthCookie(res, token)
    return res.status(200).json({ ok: true, user: { username: U, roles } })
  }

  // 2) محاولة تسجيل دخول مستخدم من قاعدة البيانات (staff/admin)
  try {
    await dbConnect()

    // تحميل ديناميكي لـ bcryptjs (اختياري)
    let bcrypt
    try {
      const mod = await import('bcryptjs')
      bcrypt = mod.default || mod
    } catch {
      bcrypt = null
    }

    // تحميل الموديل ديناميكيًا
    let User = null
    try {
      const m = await import('@/models/User')
      User = m.default || m
    } catch {
      User = null
    }

    if (User) {
      const doc = await User.findOne({
        $or: [{ email: username }, { username }]
      }).lean()

      if (doc) {
        const hasHash = !!doc.passwordHash
        const hasPlain = !!doc.password

        let passOk = false
        if (hasHash && bcrypt) {
          passOk = await bcrypt.compare(password, doc.passwordHash)
        } else if (hasPlain) {
          passOk = password && password === doc.password
        }

        if (passOk) {
          let roles = Array.isArray(doc.roles) && doc.roles.length
            ? doc.roles.slice()
            : [doc.role || 'staff']
          if (roles.includes('admin') && !roles.includes('staff')) roles.push('staff')

          const uname = doc.email || doc.username || username
          const token = signJwt({ sub: String(doc._id), username: uname, roles })
          setAuthCookie(res, token)
          return res.status(200).json({ ok: true, user: { username: uname, roles } })
        }
      }
    }

    return res.status(401).json({ ok: false, error: 'bad_credentials' })
  } catch {
    // فشل اتصال DB أو خطأ داخلي
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
}
