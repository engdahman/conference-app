import { dbConnect } from '@/lib/db'
import Attendee from '@/models/Attendee'
import { requireRole } from '@/lib/auth'

function countBy(arr, key){
  const m = {}
  for(const a of arr){
    const k = (a[key]||'غير محدد').trim() || 'غير محدد'
    m[k] = (m[k]||0)+1
  }
  return m
}

function ageFromDOB(d){
  try{
    const dt = new Date(d)
    if(!(dt instanceof Date) || isNaN(dt)) return null
    const now = new Date()
    let age = now.getFullYear() - dt.getFullYear()
    const m = now.getMonth() - dt.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) age--
    return age
  }catch{ return null }
}

function groupAges(rows){
  const buckets = { '≤18':0, '19–24':0, '25–34':0, '35–44':0, '45–54':0, '55+':0, 'غير محدد':0 }
  for(const r of rows){
    const a = ageFromDOB(r.birthDate)
    if(a==null){ buckets['غير محدد']++; continue }
    if(a<=18) buckets['≤18']++
    else if(a<=24) buckets['19–24']++
    else if(a<=34) buckets['25–34']++
    else if(a<=44) buckets['35–44']++
    else if(a<=54) buckets['45–54']++
    else buckets['55+']++
  }
  return buckets
}

async function handler(req,res){
  await dbConnect()
  const rows = await Attendee.find({}).lean()
  const total = rows.length
  const byGender = countBy(rows,'gender')
  const byRegion = countBy(rows,'region')
  const byEmployment = countBy(rows,'employmentStatus')
  const byAge = groupAges(rows)
  const checkedIn = rows.filter(r=>r.checkedIn).length
  res.json({ success:true, total, checkedIn, byGender, byRegion, byEmployment, byAge })
}

export default requireRole(handler, ['admin'])
