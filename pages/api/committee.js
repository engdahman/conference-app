// pages/api/committee.js
import { dbConnect } from '@/lib/db'
import CommitteeMember from '@/models/CommitteeMember'

export default async function handler(req, res) {
  await dbConnect()
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' })
  }
  const members = await CommitteeMember.find({})
    .sort({ order: 1, name: 1 })
    .lean()
  return res.json({ success: true, members })
}
