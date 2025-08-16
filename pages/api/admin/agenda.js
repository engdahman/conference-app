import { dbConnect } from '../../../lib/db'
import AgendaItem from '../../../models/AgendaItem'
import { requireRole } from '../../../lib/auth'

async function handler(req,res){
  await dbConnect()
  if(req.method==='GET'){
    const items = await AgendaItem.find({}).sort({ day:1, startTime:1 })
    return res.json({ success:true, items })
  }
  if(req.method==='POST'){
    const body = req.body || {}
    const a = await AgendaItem.create(body)
    return res.json({ success:true, item:a })
  }
  if(req.method==='DELETE'){
    const id = req.query.id
    await AgendaItem.deleteOne({ _id:id })
    return res.json({ success:true })
  }
  res.status(405).end()
}

export default requireRole(handler, ['admin'])
