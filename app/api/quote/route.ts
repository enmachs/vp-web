import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

// Resend client is created once at module scope.
// process.env.RESEND_API_KEY is read server-side only — never sent to the browser.
const resend = new Resend(process.env.RESEND_API_KEY);

const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL ?? 'hola@viajerosparaguana.com';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'cotizaciones@viajerosparaguana.com';

// Simple in-memory rate limit: max 5 submissions per IP per minute.
// Each serverless instance has its own Map; this prevents bursts within a single instance.
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const WINDOW_MS = 60_000;
  const LIMIT = 5;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= LIMIT) return false;
  entry.count += 1;
  return true;
}

// Escape user input before embedding it in HTML to prevent injection in the email body.
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface QuotePayload {
  name: string;
  from: string;
  to: string;
  type: string;
  phone: string;
  heard: string;
  notes?: string;
}

// Server-side validation — the client validates too, but we never trust it alone.
function validate(data: unknown): { ok: boolean; errors: string[] } {
  if (!data || typeof data !== 'object') return { ok: false, errors: ['Invalid payload'] };

  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  const required: (keyof QuotePayload)[] = ['name', 'from', 'to', 'type', 'phone', 'heard'];
  for (const field of required) {
    if (!d[field] || typeof d[field] !== 'string' || !(d[field] as string).trim()) {
      errors.push(`${field} is required`);
    }
  }

  if (typeof d.phone === 'string' && d.phone.trim().length < 7) {
    errors.push('Phone number is too short');
  }

  const maxLen: Partial<Record<keyof QuotePayload, number>> = {
    name: 120, from: 100, to: 100, type: 60,
    phone: 30, heard: 80, notes: 1200,
  };
  for (const [field, max] of Object.entries(maxLen)) {
    if (typeof d[field] === 'string' && (d[field] as string).length > max) {
      errors.push(`${field} exceeds maximum length`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function buildEmail(p: QuotePayload): string {
  const whatsappHref = `https://wa.me/${p.phone.replace(/\D/g, '')}`;
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #e0e0de;">
        <span style="display:block;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#767674;font-weight:700;margin-bottom:4px;">${label}</span>
        <span style="font-size:15px;color:#0e0e0e;">${value}</span>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#e7e7e5;font-family:system-ui,sans-serif;">
  <div style="max-width:580px;margin:0 auto;">

    <div style="background:#0e0e0e;padding:36px 40px;border-radius:20px 20px 0 0;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(244,244,243,0.5);font-weight:700;">Viajeros Paraguaná</p>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#f4f4f3;letter-spacing:-0.01em;">Nueva cotización recibida</h1>
    </div>

    <div style="background:#f4f4f3;padding:36px 40px;border-radius:0 0 20px 20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${row('Cliente', esc(p.name))}
        ${row('Ruta', `${esc(p.from)} → ${esc(p.to)}`)}
        ${row('Tipo de servicio', esc(p.type))}
        ${row('Teléfono', esc(p.phone))}
        ${row('¿Cómo nos conoció?', esc(p.heard))}
        ${p.notes?.trim() ? row('Detalles adicionales', esc(p.notes)) : ''}
      </table>

      <div style="margin-top:32px;">
        <a href="${whatsappHref}"
           style="display:inline-block;background:#0e0e0e;color:#f4f4f3;padding:14px 26px;
                  border-radius:999px;text-decoration:none;font-weight:700;font-size:13px;
                  letter-spacing:0.06em;">
          Responder por WhatsApp →
        </a>
      </div>

      <p style="margin:28px 0 0;font-size:11px;color:#767674;line-height:1.5;">
        Este mensaje fue enviado automáticamente desde el formulario de cotización de
        <a href="https://viajerosparaguana.com" style="color:#0e0e0e;">viajerosparaguana.com</a>.
      </p>
    </div>

  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // Rate limiting — use CF-Connecting-IP (Cloudflare/Vercel edge) or x-forwarded-for
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ok, errors } = validate(body);
  if (!ok) {
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  const payload = body as QuotePayload;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: BUSINESS_EMAIL,
      subject: `Cotización: ${payload.name} · ${payload.from} → ${payload.to}`,
      html: buildEmail(payload),
      // reply-to isn't set because the client only provided a phone number.
      // The WhatsApp link in the email body is the response channel.
    });

    if (error) {
      // Resend returned an API-level error (e.g. unverified domain)
      console.error('[quote] Resend API error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[quote] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
