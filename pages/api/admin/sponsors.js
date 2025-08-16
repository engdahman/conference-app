// pages/api/admin/sponsors.js
import { dbConnect } from '@/lib/db'
import Sponsor from '@/models/Sponsor'

function normalizePath(p = '') {
  if (!p) return ''
  return p.replace(/\\/g, '/').replace(/^public\//, '').replace(/^\/?uploads\//, '/uploads/')
}

export default async function handler(req, res) {
  await dbConnect()

  try {
    if (req.method === 'GET') {
      const list = await Sponsor.find({}).sort({ tier: 1, name: 1 }).lean()
      return res.json({ sponsors: list })
    }

    if (req.method === 'POST') {
      const { name, logo, url, tier, description } = req.body || {}
      const doc = await Sponsor.create({
        name,
        logo: normalizePath(logo),
        url, tier, description
      })
      return res.json({ success: true, sponsor: doc })
    }

    if (req.method === 'PUT') {
      const { id } = req.query
      if (!id) return res.status(400).json({ success: false, error: 'Missing id' })
      const { name, logo, url, tier, description } = req.body || {}
      const doc = await Sponsor.findByIdAndUpdate(
        id,
        { name, logo: normalizePath(logo), url, tier, description },
        { new: true, upsert: false }
      )
      if (!doc) return res.status(404).json({ success: false, error: 'Not found' })
      return res.json({ success: true, sponsor: doc })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ success: false, error: 'Missing id' })
      await Sponsor.findByIdAndDelete(id)
      return res.json({ success: true })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
}
