import { dbConnect } from '@/lib/db'
import AgendaItem from '@/models/AgendaItem'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success:false, error:'method_not_allowed' })
  }

  try {
    await dbConnect()
    const q = {}
    if (req.query.day) q.day = String(req.query.day)
    const items = await AgendaItem.find(q)
      .sort({ day: 1, time: 1, order: 1, createdAt: 1 })
      .lean()
    return res.json({ success:true, items })
  } catch (e) {
    console.error('api/agenda GET error:', e)
    return res.status(500).json({ success:false, error:'server_error' })
  }
}
