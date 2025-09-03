// pages/index.js
import Head from 'next/head'
import Link from 'next/link'
import { dbConnect } from '@/lib/db'
import Settings from '@/models/Settings'
import Speaker from '@/models/Speaker'
import Sponsor from '@/models/Sponsor'
import AgendaItem from '@/models/AgendaItem'

// ==== Helpers ====
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
  src = src.replace(/\\/g, '/')
  if (src.startsWith('public/uploads/')) src = src.replace(/^public\/?/, '/')
  if (src.startsWith('uploads/')) src = '/' + src
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src
  return src
}
function firstNonEmpty(...vals){ return vals.find(v => typeof v === 'string' && v.trim() !== '') || '' }
function asBool(v){
  const s = String(v ?? '').trim().toLowerCase()
  return v === true || v === 1 || v === '1' || s === 'true' || s === 'on' || s === 'yes'
}
function slug(s=''){return s.toString().trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}
function cx(...a){return a.filter(Boolean).join(' ')}
function isHttpUrl(u=''){ return /^https?:\/\//i.test(String(u||'').trim()) }

function getLogoPath(sp = {}) {
  const raw = sp.logo || sp.image || sp.logoUrl || sp.logo_path || ''
  return resolveSrc(raw)
}
function getSpeakerPhoto(sp = {}) {
  const raw = sp.photo || sp.image || sp.avatar || sp.avatarUrl || ''
  return resolveSrc(raw)
}
function getMemberPhoto(m = {}) {
  const raw = m.photo || m.image || m.avatar || m.avatarUrl || ''
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

function groupAgenda(sortedItems = []) {
  const map = {}
  for (const it of sortedItems) {
    const key = it.day || 'اليوم'
    if (!map[key]) map[key] = []
    map[key].push(it)
  }
  return Object.entries(map).map(([day, list]) => ({ day, list }))
}

/* ===== Helpers لترتيب الأجندة ===== */
const ORDINALS = { 'الأولى':1,'الثانية':2,'الثالثة':3,'الرابعة':4,'الخامسة':5,'السادسة':6,'السابعة':7,'الثامنة':8,'التاسعة':9,'العاشرة':10 }
function dayRank(day=''){
  const m = String(day).match(/المحطة\s+([^\s—-]+)/)
  if (m && ORDINALS[m[1]]) return ORDINALS[m[1]]
  if (/ختام|الختام/.test(day)) return 990
  if (/منصة|معرض/.test(day)) return 995
  return 900
}
function pad2(n){ return String(n).padStart(2,'0') }
function timeKey(t=''){
  const m = String(t).match(/(\d{1,2}):(\d{2})/)
  if (!m) return '99:99'
  return `${pad2(+m[1])}:${m[2]}`
}
function compareAgenda(a,b){
  const ao = Number.isFinite(+a.order) ? +a.order : null
  const bo = Number.isFinite(+b.order) ? +b.order : null
  if (ao != null || bo != null) {
    if (ao == null) return 1
    if (bo == null) return -1
    if (ao !== bo) return ao - bo
  }
  const dr = dayRank(a.day) - dayRank(b.day)
  if (dr) return dr
  const ta = timeKey(a.time), tb = timeKey(b.time)
  if (ta !== tb) return ta.localeCompare(tb)
  return (a.title||'').localeCompare(b.title||'')
}

// ===== تحميل موديل اللجنة بشكل اختياري وآمن =====
async function loadCommitteeModelIfAvailable() {
  try {
    const _require = eval('require') // لتجنّب تحليل Webpack/Next
    const fs = _require('fs')
    const path = _require('path')
    const candidates = [
      // مسارات شائعة في مشاريع Next
      ['models','Committee.js'], ['models','Committee.ts'],
      ['models','CommitteeMember.js'], ['models','CommitteeMember.ts'],
      ['src','models','Committee.js'], ['src','models','Committee.ts'],
      ['src','models','CommitteeMember.js'], ['src','models','CommitteeMember.ts'],
    ].map(parts => path.join(process.cwd(), ...parts))

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const mod = _require(p)
        return mod?.default || mod
      }
    }

    // محاولة أخيرة عبر alias @ (إن وُجدت فعليًا)
    try { return _require('@/models/Committee') } catch {}
    try { return _require('@/models/CommitteeMember') } catch {}
  } catch {}
  return null
}

export async function getServerSideProps() {
  await dbConnect()

  const settingsDoc  = await Settings.findOne({}).lean()
  const speakersDocs = await Speaker.find({}).sort({ name: 1 }).lean()
  const sponsorsDocs = await Sponsor.find({}).sort({ tier: 1, name: 1 }).lean()
  const agendaDocs   = await AgendaItem.find({}).lean()

  // ✅ اللجنة التحضيرية: تُحمَّل فقط إن وُجد الموديل
  let committeeDocs = []
  try {
    const CommitteeModel = await loadCommitteeModelIfAvailable()
    if (CommitteeModel?.find) {
      committeeDocs = await CommitteeModel.find({}).sort({ order: 1, name: 1 }).lean()
    }
  } catch {}

  const settings = settingsDoc ? toPlain(settingsDoc) : {}
  const speakers = toPlainList(speakersDocs)
  const sponsors = toPlainList(sponsorsDocs)
  const committee = toPlainList(committeeDocs)
  const agendaRaw = toPlainList(agendaDocs)
  const agenda    = [...agendaRaw].sort(compareAgenda)

  return { props: { settings, speakers, sponsors, agenda, committee } }
}

export default function Home({ settings, speakers, sponsors, agenda, committee }) {
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

  // ✅ إعدادات زر التسجيل
  const regModeRaw = String(firstNonEmpty(settings?.registrationMode, 'internal')).toLowerCase()
  const regUrl     = String(firstNonEmpty(settings?.registrationUrl, '')).trim()
  const regNewTab  = asBool(settings?.registrationNewTab)
  const haveValidExternal = isHttpUrl(regUrl)
  const useExternal = (regModeRaw === 'external' && haveValidExternal) || (!regModeRaw && haveValidExternal)

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
          <div className="container hero-inner">
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
              {useExternal ? (
                <a
                  href={regUrl}
                  className="btn primary"
                  target={regNewTab ? '_blank' : undefined}
                  rel={regNewTab ? 'noopener noreferrer' : undefined}
                >
                  سجّل الآن
                </a>
              ) : (
                <Link href="/register" className="btn primary">سجّل الآن</Link>
              )}
              <a href="#agenda" className="btn">البرنامج</a>
              <a href="#speakers" className="btn">المتحدثون</a>
              <a href="#committee" className="btn">اللجنة التحضيرية</a>
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

        {/* COMMITTEE */}
        <section id="committee" className="section alt">
          <div className="container">
            <div className="section-head">
              <h2>اللجنة التحضيرية</h2>
              <p className="section-sub">فريق التنظيم والإشراف على الملتقى</p>
            </div>
            <div className="grid cards">
              {committee?.length ? committee.map(m => (
                <article key={m._id} className="card member">
                  <div className="avatar">
                    {getMemberPhoto(m) ? <img src={getMemberPhoto(m)} alt={m.name} /> : <div className="avatar-ph">No Image</div>}
                  </div>
                  <div className="body">
                    <h3 className="name">{m.name}</h3>
                    {m.title && <div className="role">{m.title}</div>}
                    {m.bio && <p className="bio">{m.bio}</p>}
                  </div>
                </article>
              )) : <p className="empty">سيتم الإعلان عن أعضاء اللجنة قريبًا.</p>}
            </div>
          </div>
        </section>

        {/* AGENDA */}
        <section id="agenda" className="section">
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
        <section id="sponsors" className="section alt">
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
          --page:#f7fafc; --fg:#0f172a; --muted:#475569;
          --accent:#0ea5e9; --accent2:#22d3ee;

          --border:#e5e7eb; --card:#ffffff;
          --chip:#f1f5f9;
        }

        html,body{margin:0;padding:0}
        body{
          background:var(--page);
          color:var(--fg);
          font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,'Noto Naskh Arabic UI',Tahoma;
          line-height:1.65;
          -webkit-font-smoothing:antialiased;
          text-rendering:optimizeLegibility;
        }
        a{color:inherit;text-decoration:none}
        main{display:block; scroll-behavior:smooth}
        section{scroll-margin-top:72px}
        img{max-width:100%;height:auto;display:block}

        .container{max-width:1200px;margin:0 auto;padding:0 20px}
        @media (min-width:1280px){ .container{max-width:1280px} }

        .banner{background:#000}
        .banner img{width:100%;height:auto;display:block}

        .hero{
          position:relative; isolation:isolate; overflow:hidden;
          min-height:78vh;
          padding:24px 0;
          background: linear-gradient(180deg,#f8fafc 0%, #eef2f7 100%);
          border-bottom:1px solid #e2e8f0;
          color: var(--fg);
          text-align:center;

          display:flex;
          align-items:center;
          justify-content:center;
        }
        .hero .hero-inner{
          position:relative; z-index:1;
          width:100%;
          max-width:1200px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:10px;
        }
        .hero-bg{ display:none }

        .logos{
          display:flex; gap:18px; align-items:center; justify-content:center;
          margin-bottom:18px; flex-wrap:wrap
        }
        .logo{
          height:76px; max-width:260px; object-fit:contain;
          background:#fff; border-radius:14px; padding:10px;
          box-shadow:0 10px 26px rgba(0,0,0,.08)
        }
        .logo.placeholder{display:flex;align-items:center;justify-content:center;color:#666;background:#eee}
        .divider{opacity:.65;font-size:30px}

        .title{ margin:8px 0 10px; font-size:48px; font-weight:900; letter-spacing:.2px; color:var(--fg) }
        .tagline{ margin:0 auto 14px; max-width:820px; font-size:18px; color:#64748b }
        .meta{ display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:12px 0 22px }
        .chip{ background:#f1f5f9; border:1px solid #e2e8f0; padding:8px 12px; border-radius:999px; color:#0f172a }
        .chip.muted{ color:#334155 }

        .cta{ display:flex; gap:10px; justify-content:center; flex-wrap:wrap }
        .btn{
          border:1px solid #cbd5e1;
          background:#ffffff;
          padding:10px 16px; border-radius:10px; color:#0f172a;
          transition:background .2s, transform .2s, box-shadow .2s
        }
        .btn:hover{ background:#f8fafc }
        .btn.primary{
          background:linear-gradient(90deg, var(--accent2), var(--accent));
          color:#06121f; border:none; font-weight:800; letter-spacing:.1px
        }

        .section{ padding:60px 0 }
        .section.alt{ background:#fff }
        .section-head{ text-align:center; margin-bottom:28px }
        .section-head h2{ font-size:28px; margin:0 0 6px }
        .section-sub{ color:#64748b; margin:0 }

        .grid.cards{ display:grid; grid-template-columns:repeat( auto-fill, minmax(260px, 1fr)); gap:16px }
        .card{
          background:var(--card); border:1px solid var(--border);
          border-radius:16px; overflow:hidden;
          box-shadow:0 3px 10px rgba(2,6,23,.06);
          transition:transform .2s ease, box-shadow .2s ease
        }
        .card:hover{ transform:translateY(-2px); box-shadow:0 10px 24px rgba(2,6,23,.08) }
        .card .body{ padding:14px }

        .speaker .avatar,
        .member .avatar{
          height:240px; background:#f1f5f9;
          display:flex; align-items:center; justify-content:center; overflow:hidden
        }
        .speaker .avatar img,
        .member .avatar img{ width:100%; height:100%; object-fit:cover }
        .speaker .name,
        .member .name{ margin:0 0 4px; font-size:18px; font-weight:800 }
        .speaker .role,
        .member .role{ color:#64748b; font-size:14px; margin-bottom:6px }
        .speaker .talk{
          background:var(--chip); display:inline-block;
          border:1px solid var(--border); padding:4px 8px; border-radius:8px; margin-bottom:8px
        }
        .speaker .bio,
        .member .bio{ margin:0; color:#64748b; font-size:14px; line-height:1.8 }

        .agenda-day{ margin-bottom:26px }
        .agenda-title{ margin:0 0 12px; font-size:20px; font-weight:900; color:#0f172a }

        .timeline{
          --time-col: 170px;
          list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:12px; position:relative;
        }
        .timeline:before{
          content:''; position:absolute; top:0; bottom:0; right:calc(var(--time-col) + 20px);
          width:2px; background:#e5e7eb;
        }
        .timeline-item{
          position:relative;
          display:grid; grid-template-columns:var(--time-col) 1fr; gap:16px; align-items:center;
          background:#fff; border:1px solid var(--border); border-radius:12px; padding:14px;
        }
        .timeline-item:after{
          content:''; position:absolute; right:calc(var(--time-col) + 20px); top:50%;
          width:10px; height:10px; background:#38bdf8; border-radius:50%;
          transform:translate(50%,-50%); box-shadow:0 0 0 3px #e0f2fe;
        }
        .timeline .time{
          display:inline-block;
          font-weight:800; padding:10px 12px; text-align:center;
          background:#eff6ff; color:#0f172a; border:1px solid #dbeafe; border-radius:10px;
          white-space:nowrap; font-variant-numeric:tabular-nums;
        }
        .timeline .row1{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:2px }
        .timeline .type{
          font-size:12px; padding:4px 8px; border-radius:999px;
          border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a
        }
        .timeline .session{ font-size:16px }
        .timeline .row2{ color:#64748b; font-size:14px }

        .sponsors{ display:flex; flex-direction:column; gap:24px }
        .s-group .tier{ margin:0 0 10px; font-size:16px; color:#64748b }
        .s-grid{ display:grid; grid-template-columns:repeat( auto-fill, minmax(240px, 1fr)); gap:20px; align-items:center }
        .s-card{
          background:#fff; border-radius:14px; padding:16px; min-height:130px;
          border:1px solid var(--border); display:flex; align-items:center; justify-content:center;
          transition:transform .2s ease, box-shadow .2s ease
        }
        .s-card:hover{ transform:translateY(-2px); box-shadow:0 8px 20px rgba(2,6,23,.08) }
        .s-card img{ max-width:100%; max-height:96px; object-fit:contain; filter:grayscale(.06); opacity:.98; transition:filter .2s, opacity .2s }
        .s-card:hover img{ filter:none; opacity:1 }

        .empty{ color:#64748b; text-align:center }

        .footer{ border-top:1px solid var(--border); padding:26px 0; background:#fff }
        .f-row{ display:flex; justify-content:space-between; gap:20px; flex-wrap:wrap; align-items:center }
        .brand{ font-weight:900; font-size:18px }
        .muted{ color:#64748b }
        .link{ border:1px solid var(--border); padding:8px 12px; border-radius:10px }

        @media (min-width:1024px){
          .title{ font-size:56px }
          .tagline{ font-size:20px }
          .speaker .avatar, .member .avatar{ height:260px }
          .section{ padding:72px 0 }
        }
        @media (max-width:640px){
          .hero{ min-height:60vh; padding:20px 0 }
          .logo{ height:64px; max-width:220px }
          .title{ font-size:36px }
          .timeline{ --time-col: 120px }
          .s-grid{ grid-template-columns:repeat( auto-fill, minmax(170px, 1fr)); }
          .s-card{ min-height:110px }
          .s-card img{ max-height:80px }
        }
      `}</style>
    </>
  )
}
