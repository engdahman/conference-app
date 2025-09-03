import { dbConnect } from '@/lib/db'
import CommitteeMember from '@/models/CommitteeMember'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ success:false, error:'method_not_allowed' })
  }
  await dbConnect()
  const members = await CommitteeMember.find({}).sort({ order: 1, name: 1 }).lean()
  return res.status(200).json({ success:true, members })
}
