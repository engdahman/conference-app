// components/AgendaPublic.js
import { useEffect, useState, useRef } from 'react'

export default function AgendaPublic({
  apiUrl = '/api/agenda',
  heading = 'أجندة الملتقى',
  showHeader = true,
}) {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navRef = useRef(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${apiUrl}?bust=${Date.now()}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok || !d?.success) throw new Error(d?.error || r.statusText)
      setDays(d.days || [])
    } catch (e) {
      setError(e?.message || 'تعذر تحميل الأجندة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function scrollNav(dir = 1) {
    const el = navRef.current
    if (!el) return
    el.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  return (
    <section dir="rtl" className="agenda-wrap">
      {showHeader && (
        <div className="head">
          <h2 className="title">{heading}</h2>
          <div className="actions">
            <button className="btn" onClick={load} disabled={loading}>{loading ? '...' : 'تحديث'}</button>
          </div>
        </div>
      )}

      {/* شريط تنقّل بين المحطات */}
      {Boolean(days?.length) && (
        <div className="daybar">
          <button aria-label="يسار" className="navbtn" onClick={()=>scrollNav(-1)}>‹</button>
          <div className="scroller" ref={navRef}>
            {days.map((d, i) => (
              <a key={i} className="chip" href={`#day-${d.dayOrder}`}>{d.day}{d.date ? ` — ${d.date}` : ''}</a>
            ))}
          </div>
          <button aria-label="يمين" className="navbtn" onClick={()=>scrollNav(1)}>›</button>
        </div>
      )}

      {/* حالات */}
      {loading && (
        <div className="skeleton">
          {Array.from({ length: 3 }).map((_,i)=>(
            <div key={i} className="sk-day">
              <div className="sk-head" />
              {Array.from({ length: 3 }).map((__,j)=>(<div key={j} className="sk-item" />))}
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="error">حدث خطأ: {error}</div>
      )}

      {!loading && !error && !days.length && (
        <div className="muted">لم تُضف الأجندة بعد.</div>
      )}

      {/* الأجندة */}
      {!loading && !error && days.map((g) => (
        <div key={`${g.dayOrder}-${g.day}`} className="day" id={`day-${g.dayOrder}`}>
          <div className="day-head">
            <div className="day-title">{g.day}</div>
            {g.date && <div className="day-date">{g.date}</div>}
          </div>

          <div className="timeline">
            {g.items.map((it, idx) => (
              <div key={it._id || idx} className="item">
                <div className="dot" aria-hidden />
                <div className="card">
                  <div className="row">
                    <span className="time">{it.time}</span>
                    {it.type && <span className="type">{it.type}</span>}
                  </div>
                  {it.title && <div className="title">{it.title}</div>}
                  {(it.room || it.speaker) && (
                    <div className="meta">{[it.room, it.speaker].filter(Boolean).join(' — ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style jsx>{`
        .agenda-wrap{padding:24px 0}
        .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .title{margin:0;font-size:22px}
        .actions{display:flex;gap:8px}
        .btn{border:1px solid #d1d5db;background:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
        .btn:disabled{opacity:.6;cursor:default}

        .daybar{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin:8px 0 16px}
        .navbtn{border:1px solid #e5e7eb;background:#fff;width:34px;height:34px;border-radius:8px;cursor:pointer}
        .scroller{display:flex;gap:8px;overflow:auto;padding:2px}
        .scroller::-webkit-scrollbar{height:6px}
        .chip{flex:0 0 auto;background:#f8fafc;border:1px solid #e2e8f0;padding:8px 12px;border-radius:999px;text-decoration:none;color:#111;white-space:nowrap}
        .chip:hover{background:#eef6ff;border-color:#c7e5ff}

        .day{margin:18px 0;page-break-inside:avoid}
        .day-head{display:flex;gap:8px;align-items:center;margin-bottom:8px}
        .day-title{font-weight:800;font-size:18px}
        .day-date{color:#64748b}
        .timeline{position:relative;padding-inline-start:16px;border-inline-start:3px solid #e2e8f0}
        .item{position:relative;margin:14px 0}
        .dot{position:absolute;inset-inline-start:-10px;top:14px;width:12px;height:12px;border-radius:50%;background:#0ea5e9}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px}
        .row{display:flex;gap:8px;align-items:center}
        .time{font-weight:700}
        .type{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:2px 8px;font-size:12px}
        .title{margin-top:6px;font-size:15px}
        .meta{margin-top:4px;color:#6b7280;font-size:13px}

        .muted{color:#6b7280}
        .error{color:#b91c1c}

        /* Skeleton */
        .skeleton{display:grid;gap:16px}
        .sk-day{display:grid;gap:10px}
        .sk-head{height:18px;background:linear-gradient(90deg,#f3f4f6,#e5e7eb,#f3f4f6);border-radius:8px;animation:sh 1.2s infinite}
        .sk-item{height:60px;background:linear-gradient(90deg,#f3f4f6,#e5e7eb,#f3f4f6);border-radius:12px;animation:sh 1.2s infinite}
        @keyframes sh{0%{background-position:0%}100%{background-position:100%}}

        @media print{
          .daybar,.actions{display:none}
          .agenda-wrap{padding:0}
          .timeline{border-inline-start:2px solid #ccc}
        }
      `}</style>
    </section>
  )
}
