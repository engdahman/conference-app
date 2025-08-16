// pages/api/health.js
import { dbConnect } from '../../lib/db';
import { hasSmtp } from '../../lib/mailer';

export default async function handler(req, res) {
  try {
    await dbConnect();
    res.status(200).json({ ok: true, db: true, smtpConfigured: hasSmtp() });
  } catch (e) {
    res.status(500).json({ ok: false, db: false, error: String(e?.message || e) });
  }
}
