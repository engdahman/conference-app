// pages/api/admin/attendees.js
import { dbConnect } from '@/lib/db'
import Attendee from '@/models/Attendee'
import { requireRole } from '@/lib/auth'

// ملاحظة: الحذف/التعديل للأدمن فقط (الوسيط يتحقق من الدور)
async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    await dbConnect()
  } catch (e) {
    console.error('DB connect failed:', e)
    return res.status(500).json({ success: false, error: 'db_connect_failed' })
  }

  if (req.method === 'GET') {
    try {
      const items = await Attendee.find({}).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, attendees: items })
    } catch (e) {
      console.error('GET /api/admin/attendees:', e)
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // يدعم body.ids أو ?id=one
      const idsFromBody = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : []
      const idFromQuery = req.query?.id ? [String(req.query.id)] : []
      const ids = idsFromBody.length ? idsFromBody : idFromQuery

      if (!ids.length) {
        return res.status(400).json({ success: false, error: 'missing_ids' })
      }

      const r = await Attendee.deleteMany({ _id: { $in: ids } })
      return res.status(200).json({ success: true, deleted: r.deletedCount || 0 })
    } catch (e) {
      console.error('DELETE /api/admin/attendees:', e)
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { id, patch } = req.body || {}
      if (!id || !patch) {
        return res.status(400).json({ success: false, error: 'missing' })
      }
      await Attendee.updateOne({ _id: id }, { $set: patch })
      return res.status(200).json({ success: true })
    } catch (e) {
      console.error('PUT/PATCH /api/admin/attendees:', e)
      return res.status(500).json({ success: false, error: 'server_error' })
    }
  }

  res.setHeader('Allow', 'GET,DELETE,PUT,PATCH')
  return res.status(405).json({ success: false, error: 'method_not_allowed' })
}

export default requireRole(handler, ['admin'])

// (اختياري) لو أردت تكبير حجم البودي في DELETE/PUT:
// export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }


