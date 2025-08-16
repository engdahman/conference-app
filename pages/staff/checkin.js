import { useEffect, useState } from 'react'
import QRScanner from '@/components/QRScanner'

function LoginInline({ onLogged }){
  const [username,setUsername]=useState('')
  const [password,setPassword]=useState('')
  const [err,setErr]=useState('')
  const submit=async(e)=>{
    e.preventDefault(); setErr('')
    const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})})
    if(r.status===200){ onLogged() } else setErr('بيانات غير صحيحة')
  }
  return (<div className="card" style={{maxWidth:440, margin:'0 auto'}}>
    <h3>تسجيل دخول الموظفين</h3>
    <form onSubmit={submit}>
      <label>اسم المستخدم</label><input className="input" value={username} onChange={e=>setUsername(e.target.value)}/>
      <label>كلمة المرور</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
        <button className="btn btn-primary">دخول</button>
        {err && <div className="small" style={{color:'#fca5a5'}}>{err}</div>}
      </div>
    </form>
  </div>)
}

export default function StaffCheckin(){
  const [me,setMe]=useState(null)
  const [query,setQuery]=useState('')
  const [res,setRes]=useState('')
  const [last,setLast]=useState(null)

  const refresh=async()=>{
    const r=await fetch('/api/auth/me'); if(r.status===200){ const d=await r.json(); setMe(d.user) } else setMe(null)
  }
  useEffect(()=>{ refresh() },[])

  const check=async(q)=>{
    setRes(''); setLast(null)
    const r=await fetch('/api/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})})
    if(r.status===200){ const d=await r.json(); setRes('تم تسجيل الدخول ✓'); setLast(d.attendee) } else setRes('لم يتم العثور على مشارك بهذا الكود/البريد/الهاتف')
  }

  if(!me) return (<div className="container rtl"><LoginInline onLogged={refresh}/></div>)
  if(!(me.role==='admin' || me.role==='staff')) return <div className="container rtl">لا تملك صلاحيات</div>

  return (<div className="container rtl">
    <h2>تسجيل حضور المشاركين</h2>
    <div className="grid-2">
      <div className="card">
        <h3>مسح QR</h3>
        <QRScanner onResult={check}/>
      </div>
      <div className="card">
        <h3>بحث يدوي</h3>
        <input className="input" placeholder="أدخل QR / البريد / الهاتف" value={query} onChange={e=>setQuery(e.target.value)}/>
        <div style={{marginTop:8}}><button className="btn btn-primary" onClick={()=>check(query)}>تأكيد الحضور</button></div>
        {res && <div className="alert" style={{marginTop:10}}>{res}</div>}
        {last && <div className="card" style={{marginTop:10, background:'#0e162f'}}>
          <div><b>{last.fullName}</b></div>
          <div className="small">{last.qrCode}</div>
          <div className="small">الوقت: {new Date(last.checkinAt).toLocaleString()}</div>
        </div>}
      </div>
    </div>
  </div>)
}
