// pages/admin/login.js
import { useState } from 'react'
import { useRouter } from 'next/router'

export default function AdminLogin(){
  const router = useRouter()
  const [u,setU] = useState('')
  const [p,setP] = useState('')
  const [busy,setBusy] = useState(false)
  const [err,setErr] = useState('')

  async function submit(e){
    e.preventDefault()
    setErr(''); setBusy(true)
    try{
      const r = await fetch('/api/auth/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify({ username:u, password:p })
      })
      const d = await r.json().catch(()=>null)
      if(!r.ok || !d?.success){ setErr(d?.error||d?.message||r.statusText); return }
      const next = (router.query.next||'/admin').toString()
      router.replace(next)
    }finally{ setBusy(false) }
  }

  return (
    <main dir="rtl" style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f7fafc',padding:'24px'}}>
      <form onSubmit={submit} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:16,minWidth:320}}>
        <h3 style={{marginTop:0}}>تسجيل دخول الأدمن</h3>
        <label>اسم المستخدم</label>
        <input value={u} onChange={e=>setU(e.target.value)} className="input" />
        <label>كلمة المرور</label>
        <input type="password" value={p} onChange={e=>setP(e.target.value)} className="input" />
        {err && <div style={{color:'#b91c1c',marginBottom:8}}>{err}</div>}
        <button className="btn primary" disabled={busy} type="submit">{busy?'...':'دخول'}</button>
        <style jsx>{`
          .input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin:6px 0 10px;background:#fff}
          .btn{border:1px solid #0ea5e9;background:#0ea5e9;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
          .btn:disabled{opacity:.7;cursor:not-allowed}
        `}</style>
      </form>
    </main>
  )
}
