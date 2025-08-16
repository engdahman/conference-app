// lib/paths.js
export function toWebPath(p) {
  if (!p) return ''
  let s = String(p).trim().replace(/\\/g, '/')
  // لو المسار محلي: تأكد إنه يبدأ بـ / وليس /public
  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    s = s.replace(/^public\//, '')
    if (!s.startsWith('/')) s = '/' + s
  }
  s = s.replace(/^\/public\//, '/').replace(/\/+/g, '/')
  return s
}
