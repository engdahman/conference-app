import mongoose from 'mongoose'
import { dbConnect } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import AgendaItem from '@/models/AgendaItem'

const isStr = v => typeof v === 'string' && v.trim() !== ''

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try { await dbConnect() }
  catch (e) {
    console.error('db_connect_failed:', e)
    return res.status(500).json({ success:false, error:'db_connect_failed', detail: e?.message })
  }

  // GET: جلب العناصر (للشبّاك الإداري)
  if (req.method === 'GET') {
    try {
      const q = {}
      if (req.query.day) q.day = String(req.query.day)
      const items = await AgendaItem.find(q).sort({ day: 1, order: 1, time: 1, createdAt: 1 }).lean()
      return res.json({ success:true, items })
    } catch (e) {
      console.error('admin/agenda GET error:', e)
      return res.status(500).json({ success:false, error:'server_error', detail: e?.message })
    }
  }

  // POST: إضافة
  if (req.method === 'POST') {
    try {
      const { day, date, time, type, title, room, speaker, order } = req.body || {}
      if (!isStr(day) || !isStr(time) || !isStr(title)) {
        return res.status(400).json({ success:false, error:'bad_input', detail:'day,time,title are required' })
      }
      const doc = await AgendaItem.create({
        day: day.trim(),
        date: (date||'').toString().trim(),
        time: time.trim(),
        type: (type||'جلسة').toString().trim(),
        title: title.trim(),
        room: (room||'').toString().trim(),
        speaker: (speaker||'').toString().trim(),
        order: Number.isFinite(+order) ? +order : 0,
      })
      return res.status(201).json({ success:true, created:true, item:{ _id:String(doc._id) } })
    } catch (e) {
      console.error('admin/agenda POST error:', e)
      return res.status(500).json({ success:false, error:'server_error', detail: e?.message })
    }
  }

  // PUT: تعديل
  if (req.method === 'PUT') {
    try {
      const id = (req.query.id || req.body?.id || '').toString()
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success:false, error:'invalid_id' })
      }
      const patch = {}
      ;['day','date','time','type','title','room','speaker'].forEach(k=>{
        if (k in (req.body||{})) patch[k] = (req.body[k] ?? '').toString().trim()
      })
      if ('order' in (req.body||{})) patch.order = Number.isFinite(+req.body.order) ? +req.body.order : 0
      if (!Object.keys(patch).length) {
        return res.status(400).json({ success:false, error:'bad_input', detail:'no fields to update' })
      }
      const r = await AgendaItem.updateOne({ _id:id }, { $set: patch })
      return res.json({ success:true, updated:r.modifiedCount })
    } catch (e) {
      console.error('admin/agenda PUT error:', e)
      return res.status(500).json({ success:false, error:'server_error', detail: e?.message })
    }
  }

  // DELETE: حذف
  if (req.method === 'DELETE') {
    try {
      const id = (req.query.id || '').toString()
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success:false, error:'invalid_id' })
      }
      const r = await AgendaItem.deleteOne({ _id:id })
      return res.json({ success:true, deleted:r?.deletedCount || 0 })
    } catch (e) {
      console.error('admin/agenda DELETE error:', e)
      return res.status(500).json({ success:false, error:'server_error', detail: e?.message })
    }
  }

  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ success:false, error:'method_not_allowed' })
}

export default requireRole(handler, ['admin'])
