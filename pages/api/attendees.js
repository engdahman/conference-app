// pages/api/attendees.js
import { dbConnect } from '@/lib/db'
import Attendee from '@/models/Attendee'
import { requireRole } from '@/lib/auth'

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method Not Allowed' })
  await dbConnect()
  const attendees = await Attendee.find({}).sort({ createdAt: -1 }).lean()
  return res.status(200).json({ success: true, attendees })
}

export default requireRole(handler, ['admin', 'staff'])
