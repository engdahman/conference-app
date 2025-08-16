// pages/api/admin/speakers.js
import { dbConnect } from '@/lib/db'
import Speaker from '@/models/Speaker'

function normalizePath(p = '') {
  if (!p) return ''
  return p.replace(/\\/g, '/').replace(/^public\//, '').replace(/^\/?uploads\//, '/uploads/')
}

export default async function handler(req, res) {
  await dbConnect()

  try {
    if (req.method === 'GET') {
      const list = await Speaker.find({}).sort({ createdAt: -1 }).lean()
      return res.json({ speakers: list })
    }

    if (req.method === 'POST') {
      const { name, title, talk, bio, photo } = req.body || {}
      const doc = await Speaker.create({
        name, title, talk, bio,
        photo: normalizePath(photo),
      })
      return res.json({ success: true, speaker: doc })
    }

    if (req.method === 'PUT') {
      const { id } = req.query
      if (!id) return res.status(400).json({ success: false, error: 'Missing id' })
      const { name, title, talk, bio, photo } = req.body || {}
      const doc = await Speaker.findByIdAndUpdate(
        id,
        { name, title, talk, bio, photo: normalizePath(photo) },
        { new: true, upsert: false }
      )
      if (!doc) return res.status(404).json({ success: false, error: 'Not found' })
      return res.json({ success: true, speaker: doc })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ success: false, error: 'Missing id' })
      await Speaker.findByIdAndDelete(id)
      return res.json({ success: true })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
}
