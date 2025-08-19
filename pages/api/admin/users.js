import { dbConnect } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import mongoose from 'mongoose'

// تحميل موديل User ديناميكيًا لتفادي OverwriteModelError أو مشاكل أثناء التطوير
let _User = null
async function getUserModel() {
  if (_User) return _User
  const mod = await import('@/models/User')
  _User = mod.default || mod
  return _User
}

function isValidEmail(s = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).toLowerCase())
}

async function handler(req, res) {
  // منع التخزين المؤقت
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  // اتصال قاعدة البيانات
  try {
    await dbConnect()
  } catch {
    return res.status(500).json({ success: false, error: 'db_connect_failed' })
  }

  // ===== GET: جلب المستخدمين =====
  if (req.method === 'GET') {
    try {
      const User = await getUserModel()
      const users = await User.find({}, 'email role roles createdAt').sort({ createdAt: -1 }).lean()
      return res.json({ success: true, users })
    } catch {
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  // ===== POST: إضافة/تحديث مستخدم =====
  if (req.method === 'POST') {
    try {
      const User = await getUserModel()
      const { email, password, role } = req.body || {}

      const emailN = String(email || '').trim().toLowerCase()
      const roleN = (role || 'staff').trim() || 'staff'
      const pass = String(password || '')

      if (!isValidEmail(emailN)) {
        return res.status(400).json({ success: false, error: 'missing_email' })
      }
      // كلمة المرور اختيارية للتحديث، لكن عند الإنشاء نفضّل وجودها
      const exists = await User.exists({ email: emailN })
      const isCreate = !exists
      if (isCreate && pass.length < 4) {
        return res.status(400).json({ success: false, error: 'bad_input' })
      }

      // bcrypt اختياري (لو غير متوفر في البكج)
      let bcrypt = null
      try {
        const m = await import('bcryptjs')
        bcrypt = m.default || m
      } catch {}

      const existing = exists ? await User.findOne({ email: emailN }) : null

      // تحديث موجود
      if (existing) {
        const update = {
          role: roleN,
          roles: Array.isArray(existing.roles) && existing.roles.length
            ? Array.from(new Set([...existing.roles, roleN]))
            : [roleN],
        }
        if (pass) {
          update.passwordHash = bcrypt ? await bcrypt.hash(pass, 10) : undefined
          update.password = bcrypt ? undefined : pass
          update.passwordHashUpdatedAt = new Date()
        }
        await User.updateOne({ _id: existing._id }, { $set: update })
        return res.json({ success: true, updated: true, id: String(existing._id) })
      }

      // إنشاء جديد
      const doc = new (await getUserModel())({
        email: emailN,
        role: roleN,
        roles: [roleN],
        ...(pass
          ? (bcrypt ? { passwordHash: await bcrypt.hash(pass, 10) } : { password: pass })
          : {}),
      })

      try {
        await doc.save()
        return res.status(201).json({ success: true, created: true, id: String(doc._id) })
      } catch (e) {
        if (e && e.code === 11000) {
          return res.status(409).json({ success: false, error: 'email_exists' })
        }
        throw e
      }
    } catch {
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  // ===== DELETE: حذف مستخدم =====
  if (req.method === 'DELETE') {
    try {
      const User = await getUserModel()
      const idRaw = req.query.id ?? req.body?.id
      const emailRaw = req.query.email ?? req.body?.email

      if (!idRaw && !emailRaw) {
        return res.status(400).json({ success: false, error: 'missing_id' })
      }

      let query = {}
      if (idRaw) {
        const id = String(idRaw)
        if (!mongoose.isValidObjectId(id)) {
          return res.status(400).json({ success: false, error: 'invalid_id' })
        }
        query = { _id: id }
      } else {
        query = { email: String(emailRaw).trim().toLowerCase() }
      }

      const r = await User.deleteOne(query)
      return res.json({ success: true, deleted: r?.deletedCount || 0 })
    } catch {
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  res.setHeader('Allow', 'GET,POST,DELETE')
  return res.status(405).json({ success: false, error: 'method_not_allowed' })
}

// فقط الأدمن
export default requireRole(handler, ['admin'])
