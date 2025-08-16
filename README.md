# Conference App (Next.js + MongoDB)

## Quick Start
1. `cp .env.local.example .env.local` and edit **MONGODB_URI**, SMTP, and logo paths if needed.
2. `npm install`
3. `npm run dev` → visit http://localhost:3000

**Admin login:** default is `bassam / admin123` (change in `.env.local`).
- Admin panel: `/admin`
- Staff check-in: `/staff/checkin`
- Printable badges: `/admin/badges`

## Features
- Registration with email confirmation & QR code (if SMTP configured).
- Manage speakers, sponsors, agenda, and settings (logos, dates, etc.).
- Create staff users, control roles.
- Check-in via camera (BarcodeDetector) or manual search.
- Export attendees and check-ins as CSV.
- Stats (infographics) without external chart libraries.
- Printable badges 100mm × 50mm with both logos, attendee name, and QR.

## Notes
- File upload is base64 JSON (no extra server lib) → saves to `public/uploads`.
- If your browser doesn't support `BarcodeDetector`, you still have a search field.
