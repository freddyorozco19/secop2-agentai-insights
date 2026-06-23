import { Resend } from "resend";
import type { PreScreenResult } from "@/lib/ai/prescreener";

let client: Resend | null = null;

function getClient(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }
  client = new Resend(apiKey);
  return client;
}

function fmtMoney(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString("es-CO")}`;
}

function buildDigestHtml(fecha: string, oportunidades: PreScreenResult[], appUrl: string): string {
  const filas = oportunidades
    .map(
      (r) => `
      <tr style="border-bottom:1px solid #2e3350;">
        <td style="padding:10px 8px;color:#10b981;font-weight:700;">${r.score}</td>
        <td style="padding:10px 8px;color:#e5e7eb;">${r.proceso.entidad ?? "—"}</td>
        <td style="padding:10px 8px;color:#e5e7eb;max-width:280px;">${r.proceso.nombre_del_procedimiento ?? "Sin descripción"}</td>
        <td style="padding:10px 8px;color:#9ca3af;text-align:right;">${fmtMoney(r.proceso.precio_base)}</td>
      </tr>`,
    )
    .join("");

  return `
  <div style="background:#0f1117;padding:24px;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#1a1d27;border-radius:16px;padding:24px;border:1px solid #2e3350;">
      <h1 style="color:#fff;font-size:18px;margin:0 0 4px;">Oportunidades del ${fecha}</h1>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">
        ${oportunidades.length} proceso(s) SECOP II con alta viabilidad para tu empresa.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid #2e3350;">
            <th style="text-align:left;padding:8px;color:#6b7280;font-size:11px;">SCORE</th>
            <th style="text-align:left;padding:8px;color:#6b7280;font-size:11px;">ENTIDAD</th>
            <th style="text-align:left;padding:8px;color:#6b7280;font-size:11px;">OBJETO</th>
            <th style="text-align:right;padding:8px;color:#6b7280;font-size:11px;">PRESUPUESTO</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <a href="${appUrl}/oportunidades" style="display:inline-block;margin-top:20px;background:#6366f1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">
        Ver todas las oportunidades →
      </a>
    </div>
  </div>`;
}

export async function sendDailyDigest(
  to: string,
  fecha: string,
  oportunidades: PreScreenResult[],
): Promise<void> {
  const resend = getClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const from = process.env.DIGEST_FROM_EMAIL ?? "SECOP AI <onboarding@resend.dev>";

  await resend.emails.send({
    from,
    to,
    subject: `${oportunidades.length} oportunidades SECOP II detectadas — ${fecha}`,
    html: buildDigestHtml(fecha, oportunidades, appUrl),
  });
}
