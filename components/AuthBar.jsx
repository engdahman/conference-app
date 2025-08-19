// components/AuthBar.jsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AuthBar({ afterLogout }) {
  const [user, setUser] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const r = await fetch('/api/auth/me', { credentials:'include' })
        const d = await r.json().catch(()=>null)
        if (!ignore && r.ok && d?.ok) setUser(d.user || null)
      } catch {}
    })()
    return () => { ignore = true }
  }, [])

  async function logout(){
    setBusy(true)
    try { await fetch('/api/auth/logout', { method:'POST', credentials:'include' }) } catch {}
    const next = afterLogout || `/admin/login?next=${encodeURIComponent(window.location.pathname)}`
    window.location.href = next
  }

  return (
    <div className="authbar" dir="rtl">
      <div className="info">
        {user ? (
          <>
            <span>مسجّل باسم:</span>
            <b style={{marginInlineStart:6}}>{user.email}</b>
            {Array.isArray(user.roles)&&user.roles.length ? (
              <span className="roles"> — {user.roles.join(', ')}</span>
            ) : null}
          </>
        ) : <span>غير معروف</span>}
      </div>
      <div className="actions">
        <button className="btn" onClick={logout} disabled={busy}>{busy?'...':'تسجيل الخروج'}</button>
        <Link className="btn" href={`/admin/login?next=${encodeURIComponent(typeof window!=='undefined'?window.location.pathname:'/')}`}>
          تبديل مستخدم
        </Link>
      </div>
      <style jsx>{`
        .authbar{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;margin-bottom:10px}
        .btn{border:1px solid #d1d5db;background:#fff;padding:6px 10px;border-radius:8px;cursor:pointer}
        .btn:hover{background:#f3f4f6}
        .actions{display:flex;gap:8px;align-items:center}
        .roles{color:#6b7280}
      `}</style>
    </div>
  )
}
