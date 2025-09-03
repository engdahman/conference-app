// pages/api/admin/committee.js
import { dbConnect } from '@/lib/db'
import CommitteeMember from '@/models/CommitteeMember'
import jwt from 'jsonwebtoken'

function toRootPath(src='') {
  if (!src) return ''
  let s = String(src).trim().replace(/\\/g, '/')
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('/')) return s
  if (s.startsWith('uploads/')) return '/' + s
  return '/' + s.replace(/^\.?\/+/, '')
}

function isAdmin(req) {
  try {
    const cookie = req.headers.cookie || ''
    const cookies = Object.fromEntries(cookie.split(';').map(s => {
      const i = s.indexOf('=')
      if (i === -1) return [s.trim(), '']
      return [s.slice(0, i).trim(), decodeURIComponent(s.slice(i+1).trim())]
    }).filter(([k]) => k))
    const token = cookies.admin_token || cookies.token || ''
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const roles = Array.isArray(payload?.roles) ? payload.roles : []
    return roles.includes('admin')
  } catch { return false }
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ success:false, error:'unauthorized' })
  await dbConnect()

  try {
    if (req.method === 'GET') {
      const itemsRaw = await CommitteeMember.find({}).sort({ order: 1, name: 1 }).lean()
      const items = itemsRaw.map(it => ({ ...it, _id: String(it._id) }))
      // نعيد الحقلين items و committee للتوافق مع أي واجهة قديمة
      return res.status(200).json({ success:true, items, committee: items })
    }

    if (req.method === 'POST') {
      const { name, title='', bio='', photo='', order=0 } = req.body || {}
      if (!name?.trim()) return res.status(400).json({ success:false, error:'missing_name' })
      const doc = await CommitteeMember.create({
        name: name.trim(),
        title: String(title||'').trim(),
        bio: String(bio||'').trim(),
        photo: toRootPath(photo),
        order: Number(order) || 0
      })
      return res.status(200).json({ success:true, id: String(doc._id) })
    }

    if (req.method === 'PUT') {
      const { id } = req.query
      if (!id) return res.status(400).json({ success:false, error:'missing_id' })
      const { name, title, bio, photo, order } = req.body || {}
      const update = {}
      if (name  != null) update.name  = String(name).trim()
      if (title != null) update.title = String(title).trim()
      if (bio   != null) update.bio   = String(bio).trim()
      if (photo != null) update.photo = toRootPath(photo)
      if (order != null) update.order = Number(order) || 0
      const d = await CommitteeMember.findByIdAndUpdate(id, update, { new:true })
      return res.status(200).json({ success:true, updated: !!d })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ success:false, error:'missing_id' })
      const r = await CommitteeMember.findByIdAndDelete(id)
      return res.status(200).json({ success:true, deleted: !!r })
    }

    res.setHeader('Allow', ['GET','POST','PUT','DELETE'])
    return res.status(405).json({ success:false, error:'method_not_allowed' })
  } catch (e) {
    return res.status(500).json({ success:false, error:'server_error', detail:e.message })
  }
}
