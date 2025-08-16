import { dbConnect } from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { requireRole } from '@/lib/auth'

async function handler(req,res){
  await dbConnect()
  if(req.method==='GET'){
    const users = await User.find({}).select('-passwordHash').sort({ createdAt:-1 })
    return res.json({ success:true, users })
  }
  if(req.method==='POST'){
    const { username, password, role } = req.body || {}
    if(!username || !password) return res.status(400).json({ success:false, error:'missing' })
    const exists = await User.findOne({ username })
    if(exists) return res.status(409).json({ success:false, error:'exists' })
    const hash = await bcrypt.hash(password, 10)
    const u = await User.create({ username, passwordHash: hash, role: role==='admin'?'admin':'staff' })
    return res.json({ success:true, user: { _id:u._id, username:u.username, role:u.role } })
  }
  if(req.method==='DELETE'){
    const id = req.query.id
    if(!id) return res.status(400).json({ success:false })
    await User.deleteOne({ _id:id })
    return res.json({ success:true })
  }
  res.status(405).end()
}

export default requireRole(handler, ['admin'])
