// pages/api/attendees.js
import { dbConnect } from '@/lib/db'
import Attendee from '@/models/Attendee'
import { requireRole } from '@/lib/auth'

// ملاحظة: نسمح بالدخول لمن لديه دور admin أو staff
async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  await dbConnect()

  // عرض القائمة: مسموح admin + staff
  if (req.method === 'GET') {
    try {
      const attendees = await Attendee.find({}).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, attendees })
    } catch (e) {
      console.error('GET /api/attendees error:', e)
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  // حذف (مفرد/جماعي): للأدمن فقط
  if (req.method === 'DELETE') {
    try {
      // تأكيد أن المستخدم أدمن (الوسيط يضيف req.user)
      const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
      const isAdmin = roles.includes('admin')
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'forbidden' })
      }

      const idsFromBody = Array.isArray(req.body?.ids) ? req.body.ids : null
      const idFromQuery = req.query?.id ? String(req.query.id) : null
      const ids = idsFromBody ?? (idFromQuery ? [idFromQuery] : [])

      if (!ids.length) {
        return res.status(400).json({ success: false, error: 'missing_ids' })
      }

      const r = await Attendee.deleteMany({ _id: { $in: ids } })
      return res.status(200).json({ success: true, deleted: r.deletedCount || 0 })
    } catch (e) {
      console.error('DELETE /api/attendees error:', e)
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  // تحديث حقول معيّنة (اختياري): للأدمن فقط
  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const roles = Array.isArray(req.user?.roles) ? req.user.roles : []
      const isAdmin = roles.includes('admin')
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'forbidden' })
      }

      const { id, patch } = req.body || {}
      if (!id || !patch) {
        return res.status(400).json({ success: false, error: 'missing' })
      }

      // (يمكن تقييد الحقول هنا إن رغبت)
      await Attendee.updateOne({ _id: id }, { $set: patch })
      return res.status(200).json({ success: true })
    } catch (e) {
      console.error('PATCH/PUT /api/attendees error:', e)
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  res.setHeader('Allow', 'GET,DELETE,PUT,PATCH')
  return res.status(405).json({ success: false, error: 'method_not_allowed' })
}

// نلتف بالوسيط ليستخرج المستخدم ويتحقق من (admin أو staff)
export default requireRole(handler, ['admin', 'staff'])
