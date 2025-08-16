// pages/admin/login.js
import { useEffect, useMemo, useState } from 'react'

function safeNext() {
  if (typeof window === 'undefined') return '/admin'

  // اقرأ المرة الأولى من كويري ستـرنج
  const qs = new URLSearchParams(window.location.search)
  let v = qs.get('next') || '/admin'

  // فك ترميز URL عدة مرات لو كان متعشّش
  for (let i = 0; i < 6; i++) {
    try {
      const dec = decodeURIComponent(v)
      if (dec === v) break
      v = dec
    } catch { break }
  }

  // لو كانت قيمة كاملة ببروتوكول، أبقِها داخل نفس الـ origin فقط
  try {
    if (/^https?:\/\//i.test(v)) {
      const u = new URL(v, window.location.origin)
      if (u.origin !== window.location.origin) return '/admin'
      v = u.pathname + u.search + u.hash
    }
  } catch {
    v = '/admin'
  }

  // لو ما تزال تشير لصفحة login، استخرج next الأعمق أو ارجع لـ /admin
  let guard = 0
  while (/^\/admin\/login/i.test(v) && guard++ < 6) {
    const m = v.match(/[?&]next=([^&]+)/)
    if (m) {
      try { v = decodeURIComponent(m[1]) } catch { v = m[1] }
      continue
    }
    v = '/admin'
    break
  }

  if (!v.startsWith('/')) v = '/admin'
  if (v.startsWith('/admin/login')) v = '/admin'
  return v
}

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const next = useMemo(() => safeNext(), [])

  // إن كان مسجّل أصلاً، دخّله مباشرة (بدون حلقات)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' })
        if (r.ok) {
          window.location.replace(next)
        }
      } catch {}
    })()
  }, [next])

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, remember })
      })
      const d = await r.json().catch(()=>({}))
      if (!r.ok || !d?.ok) {
        setErr(d?.error === 'bad_credentials' ? 'بيانات غير صحيحة' : (d?.error || 'فشل الدخول'))
        return
      }
      // حوّل بأمان بعد استلام الكوكي
      window.location.replace(next)
    } finally { setBusy(false) }
  }

  return (
    <main dir="rtl" style={{display:'grid',placeItems:'center',minHeight:'70vh',padding:16}}>
      <form onSubmit={submit} style={{background:'#fff',border:'1px solid #eee',borderRadius:12,padding:16,minWidth:320}}>
        <h3 style={{marginTop:0}}>تسجيل الدخول</h3>
        <label>اسم المستخدم</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} className="input" />
        <label>كلمة المرور</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input" />

        <label style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
          <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
          تذكّرني
        </label>

        {err && <div style={{color:'#b91c1c',marginTop:8}}>{err}</div>}
        <button className="btn" disabled={busy} style={{marginTop:12}}>{busy?'...':'دخول'}</button>
        <style jsx>{`
          .input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin:6px 0}
          .btn{border:1px solid #d1d5db;background:#0ea5e9;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
        `}</style>
      </form>
    </main>
  )
}
