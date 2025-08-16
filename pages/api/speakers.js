// pages/api/speakers.js
import { dbConnect } from '@/lib/db'
import Speaker from '@/models/Speaker'

function toPlain(doc = {}) {
  if (!doc || typeof doc !== 'object') return doc
  const o = { ...doc }
  if (o._id?.toString) o._id = o._id.toString()
  for (const k in o) if (o[k] instanceof Date) o[k] = o[k].toISOString()
  return o
}

export default async function handler(req, res) {
  try {
    await dbConnect()
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method Not Allowed' })
    const docs = await Speaker.find({}).sort({ createdAt: -1 }).lean()
    return res.json({ success: true, speakers: docs.map(toPlain) })
  } catch (e) {
    console.error('speakers GET error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
}
