// pages/index.js
import Head from 'next/head'
import Link from 'next/link'
import { dbConnect } from '@/lib/db'
import Settings from '@/models/Settings'
import Speaker from '@/models/Speaker'
import Sponsor from '@/models/Sponsor'
import AgendaItem from '@/models/AgendaItem'

// يحوّل أي كائن قادم من مونغو إلى JSON صالح للإرجاع من getServerSideProps
function toPlain(doc = {}) {
  if (!doc || typeof doc !== 'object') return doc
  const obj = { ...doc }
  if (obj._id?.toString) obj._id = obj._id.toString()
  for (const k in obj) {
    if (obj[k] instanceof Date) obj[k] = obj[k].toISOString()
  }
  return obj
}
const toPlainList = (docs = []) => docs.map(toPlain)

function resolveSrc(src = '') {
  if (!src) return ''
  // إصلاح backslashes من ويندوز
  src = src.replace(/\\/g, '/')
  // طبيعــة المسارات من public/uploads -> /uploads
  if (src.startsWith('public/uploads/')) src = src.replace(/^public\/?/, '/')
  if (src.startsWith('uploads/')) src = '/' + src
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src
  return src
}
function firstNonEmpty(...vals){ return vals.find(v => typeof v === 'string' && v.trim() !== '') || '' }
function asBool(v){ return v === true || v === 'true' || v === 1 || v === '1' }
function slug(s=''){return s.toString().trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}
function cx(...a){return a.filter(Boolean).join(' ')}

function getLogoPath(sp = {}) {
  const raw = sp.logo || sp.image || sp.logoUrl || sp.logo_path || ''
  return resolveSrc(raw)
}
function getSpeakerPhoto(sp = {}) {
  const raw = sp.photo || sp.image || sp.avatar || sp.avatarUrl || ''
  return resolveSrc(raw)
}

function groupByTier(items = []) {
  if (!items.length) return []
  const m = {}
  for (const it of items) {
    const t = it.tier || 'رعاة'
    if (!m[t]) m[t] = []
    m[t].push(it)
  }
  return Object.entries(m).map(([tier, list]) => ({ tier, list }))
}
function groupAgenda(items = []) {
  const map = {}
  for (const it of items) {
    const key = it.day || 'اليوم'
    if (!map[key]) map[key] = []
    map[key].push(it)
  }
  return Object.entries(map).map(([day, list]) => ({ day, list }))
}

export async function getServerSideProps() {
  await dbConnect()

  const settingsDoc  = await Settings.findOne({}).lean()
  const speakersDocs = await Speaker.find({}).sort({ createdAt: -1 }).lean()
  const sponsorsDocs = await Sponsor.find({}).sort({ tier: 1, name: 1 }).lean()
  const agendaDocs   = await AgendaItem.find({}).sort({ day: 1, time: 1 }).lean()

  const settings = settingsDoc ? toPlain(settingsDoc) : {}
  const speakers = toPlainList(speakersDocs)
  const sponsors = toPlainList(sponsorsDocs)
  const agenda   = toPlainList(agendaDocs)

  return { props: { settings, speakers, sponsors, agenda } }
}

export default function Home({ settings, speakers, sponsors, agenda }) {
  const eventTitle   = firstNonEmpty(settings?.eventTitle, process.env.NEXT_PUBLIC_SITE_NAME, 'ملتقى هندسي')
  const tagline      = firstNonEmpty(settings?.tagline, process.env.NEXT_PUBLIC_EVENT_TAGLINE)
  const dateRange    = firstNonEmpty(settings?.eventDateRangeText, process.env.NEXT_PUBLIC_EVENT_DATE_RANGE_TEXT)
  const locationText = firstNonEmpty(settings?.eventLocationText, process.env.NEXT_PUBLIC_EVENT_LOCATION_TEXT)
  const address      = firstNonEmpty(settings?.eventAddress, process.env.NEXT_PUBLIC_EVENT_ADDRESS)

  const orgLogo   = resolveSrc(firstNonEmpty(settings?.orgLogo, settings?.org_logo, settings?.organizerLogo))
  const eventLogo = resolveSrc(firstNonEmpty(settings?.eventLogo, settings?.event_logo, settings?.conferenceLogo))

  const bannerEnabled = asBool(settings?.bannerEnabled)
  const bannerImage   = resolveSrc(firstNonEmpty(settings?.bannerImage, settings?.banner, settings?.heroImage))
  const bannerLink    = settings?.bannerLink || ''

  const agendaGrouped = groupAgenda(agenda)

  return (
    <>
      <Head>
        <title>{eventTitle}</title>
        <meta name="description" content={tagline} />
      </Head>

      <main dir="rtl">
        {/* BANNER */}
        {bannerEnabled && bannerImage && (
          <div className="banner">
            {bannerLink ? (
              <a href={bannerLink} target="_blank" rel="noreferrer">
                <img src={bannerImage} alt="Banner" />
              </a>
            ) : (
              <img src={bannerImage} alt="Banner" />
            )}
          </div>
        )}

        {/* HERO */}
        <section className="hero">
          <div className="container">
            <div className="logos">
              {orgLogo ? <img className="logo" src={orgLogo} alt="شعار المؤسسة" /> : <div className="logo placeholder">شعار المؤسسة</div>}
              <div className="divider">×</div>
              {eventLogo ? <img className="logo" src={eventLogo} alt="شعار المؤتمر" /> : <div className="logo placeholder">شعار المؤتمر</div>}
            </div>

            <h1 className="title">{eventTitle}</h1>
            <p className="tagline">{tagline}</p>

            <div className="meta">
              {dateRange && <span className="chip">{dateRange}</span>}
              {locationText && <span className="chip">{locationText}</span>}
              {address && <span className="chip muted">{address}</span>}
            </div>

            <div className="cta">
              <Link href="/register" className="btn primary">سجّل الآن</Link>
              <a href="#agenda" className="btn">البرنامج</a>
              <a href="#speakers" className="btn">المتحدثون</a>
              <a href="#sponsors" className="btn">الرعاة</a>
            </div>
          </div>
          <div className="hero-bg" />
        </section>

        {/* SPEAKERS */}
        <section id="speakers" className="section">
          <div className="container">
            <div className="section-head">
              <h2>المتحدثون</h2>
              <p className="section-sub">نخبة من الخبراء وقادة الفكر</p>
            </div>
            <div className="grid cards">
              {speakers?.length ? speakers.map(sp => (
                <article key={sp._id} className="card speaker">
                  <div className="avatar">
                    {getSpeakerPhoto(sp) ? <img src={getSpeakerPhoto(sp)} alt={sp.name} /> : <div className="avatar-ph">No Image</div>}
                  </div>
                  <div className="body">
                    <h3 className="name">{sp.name}</h3>
                    {sp.title && <div className="role">{sp.title}</div>}
                    {sp.talk && <div className="talk">{sp.talk}</div>}
                    {sp.bio && <p className="bio">{sp.bio}</p>}
                  </div>
                </article>
              )) : <p className="empty">سيتم الإعلان عن المتحدثين قريبًا.</p>}
            </div>
          </div>
        </section>

        {/* AGENDA */}
        <section id="agenda" className="section alt">
          <div className="container">
            <div className="section-head">
              <h2>البرنامج</h2>
              <p className="section-sub">الجدول الزمني لأيام المؤتمر</p>
            </div>

            {agendaGrouped.length ? agendaGrouped.map(group => (
              <div key={group.day} className="agenda-day">
                <h3 className="agenda-title">{group.day}</h3>
                <ul className="timeline">
                  {group.list.map(item => (
                    <li key={item._id} className="timeline-item">
                      <div className="time">{item.time}</div>
                      <div className="content">
                        <div className="row1">
                          <span className={cx('type', item.type && `t-${slug(item.type)}`)}>{item.type || 'جلسة'}</span>
                          <strong className="session">{item.title}</strong>
                        </div>
                        {(item.room || item.speaker) && (
                          <div className="row2">{[item.room, item.speaker].filter(Boolean).join(' — ')}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )) : <p className="empty">سيتم نشر البرنامج قريبًا.</p>}
          </div>
        </section>

        {/* SPONSORS */}
        <section id="sponsors" className="section">
          <div className="container">
            <div className="section-head">
              <h2>الرعاة</h2>
              <p className="section-sub">شكرًا لشركائنا الداعمين</p>
            </div>

            <div className="sponsors">
              {groupByTier(sponsors).map(({ tier, list }) => (
                <div key={tier} className="s-group">
                  <h4 className="tier">{tier}</h4>
                  <div className="s-grid">
                    {list.map(sp => (
                      <a key={sp._id} href={sp.url || '#'} target="_blank" rel="noreferrer" className="s-card">
                        {getLogoPath(sp) ? <img src={getLogoPath(sp)} alt={sp.name} /> : <div className="s-ph">{sp.name}</div>}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {!sponsors?.length && <p className="empty">سيتم الإعلان عن الرعاة قريبًا.</p>}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="container">
            <div className="f-row">
              <div className="f-col">
                <div className="brand">{eventTitle}</div>
                <div className="muted">{tagline}</div>
              </div>
              <div className="f-col">
                <div className="muted">© جميع الحقوق محفوظة</div>
                <Link href="/admin" className="link">لوحة التحكم</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* CSS */}
      <style jsx>{`
        :root{
          --bg:#0b1020; --bg2:#0f1630; --fg:#ffffff; --muted:#c8d0e0;
          --accent:#4cc9f0; --border:rgba(255,255,255,0.12); --card:rgba(255,255,255,0.06); --chip:rgba(255,255,255,0.1);
        }
        body{margin:0;background:#060a18;color:var(--fg);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,'Noto Naskh Arabic UI',Tahoma}
        a{color:inherit;text-decoration:none}
        main{display:block}
        .container{max-width:1200px;margin:0 auto;padding:0 20px}

        .banner{background:#000}
        .banner img{display:block;width:100%;height:auto}

        .hero{position:relative;overflow:hidden;padding:80px 0 60px;background:radial-gradient(1000px 400px at 80% -20%, #24306a55, transparent), linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)}
        .hero-bg{position:absolute;inset:-2px;pointer-events:none;background:
          radial-gradient(1200px 600px at 10% -10%, #4cc9f015, transparent),
          radial-gradient(1000px 500px at 90% 10%, #a1f0c410, transparent)}
        .logos{display:flex;gap:18px;align-items:center;justify-content:center;margin-bottom:18px;flex-wrap:wrap}
        .logo{height:68px;max-width:220px;object-fit:contain;background:#fff;border-radius:12px;padding:10px;box-shadow:0 6px 16px rgba(0,0,0,.25)}
        .logo.placeholder{display:flex;align-items:center;justify-content:center;color:#666;background:#eee}
        .divider{opacity:.6;font-size:28px}

        .title{text-align:center;margin:6px 0 10px;font-size:40px;font-weight:800;letter-spacing:.3px}
        .tagline{text-align:center;margin:0 auto 14px;max-width:800px;font-size:18px;color:var(--muted)}
        .meta{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:10px 0 20px}
        .chip{background:var(--chip);border:1px solid var(--border);padding:8px 12px;border-radius:999px}
        .chip.muted{opacity:.85}

        .cta{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
        .btn{border:1px solid var(--border);background:rgba(255,255,255,.06);padding:10px 16px;border-radius:10px}
        .btn:hover{background:rgba(255,255,255,.12)}
        .btn.primary{background:linear-gradient(90deg,var(--accent),#7bdff6);color:#00111a;border:none;font-weight:700}
        .btn.primary:hover{filter:brightness(0.95)}

        .section{padding:60px 0}
        .section.alt{background:linear-gradient(180deg, rgba(255,255,255,0.02), transparent)}
        .section-head{text-align:center;margin-bottom:26px}
        .section-head h2{font-size:28px;margin:0 0 6px}
        .section-sub{color:var(--muted);margin:0}

        .grid.cards{display:grid;grid-template-columns:repeat( auto-fill, minmax(240px, 1fr));gap:16px}
        .card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
        .card .body{padding:14px}

        .speaker .avatar{height:220px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;overflow:hidden}
        .speaker .avatar img{width:100%;height:100%;object-fit:cover}
        .speaker .name{margin:0 0 4px;font-size:18px}
        .speaker .role{color:var(--muted);font-size:14px;margin-bottom:6px}
        .speaker .talk{background:var(--chip);display:inline-block;border:1px solid var(--border);padding:4px 8px;border-radius:8px;margin-bottom:8px}
        .speaker .bio{margin:0;color:var(--muted);font-size:14px;line-height:1.7}

        .agenda-day{margin-bottom:22px}
        .agenda-title{margin:0 0 10px;font-size:20px}
        .timeline{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
        .timeline-item{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px}
        .timeline .time{font-weight:700;min-width:70px;padding:6px 10px;background:var(--chip);border:1px solid var(--border);border-radius:8px;text-align:center}
        .timeline .row1{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
        .timeline .type{font-size:12px;padding:4px 8px;border-radius:999px;border:1px solid var(--border);background:rgba(255,255,255,.08)}
        .timeline .session{font-size:16px}
        .timeline .row2{color:var(--muted);font-size:14px}

        .sponsors{display:flex;flex-direction:column;gap:24px}
        .s-group .tier{margin:0 0 10px;font-size:16px;color:var(--muted)}
        .s-grid{display:grid;grid-template-columns:repeat( auto-fill, minmax(160px, 1fr));gap:14px;align-items:center}
        .s-card{background:#fff;border-radius:12px;padding:10px;display:flex;align-items:center;justify-content:center;min-height:90px;border:1px solid #e5e7eb}
        .s-card img{max-width:100%;max-height:56px;object-fit:contain}
        .s-ph{color:#333;text-align:center}

        .empty{color:var(--muted);text-align:center}

        .footer{border-top:1px solid var(--border);padding:24px 0;background:rgba(255,255,255,.02)}
        .f-row{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:center}
        .brand{font-weight:900;font-size:18px}
        .muted{color:var(--muted)}
        .link{border:1px solid var(--border);padding:8px 12px;border-radius:10px}
      `}</style>
    </>
  )
}
