import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchProcessesByDate, lastWorkingDayISO } from "@/lib/secop/discovery";
import { prescreenBatch } from "@/lib/ai/prescreener";
import { DUMMY_PROFILE } from "@/lib/company/dummyProfile";
import { sendDailyDigest } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCORE_ALTA = 70;

/**
 * Cron diario (ver vercel.json) que corre el Discovery Engine de S7 sin
 * intervención del usuario y envía un email con las oportunidades de score
 * ALTA al admin de cada empresa registrada.
 *
 * Limitación conocida: el prescreener usa DUMMY_PROFILE para todas las
 * empresas (igual que en S7) — no hay todavía un perfil financiero por
 * cliente conectado al pre-scoring. Pendiente para una sesión futura.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const fechaOverride = req.nextUrl.searchParams.get("fecha");
  const fecha = fechaOverride ?? lastWorkingDayISO();

  let oportunidadesAlta;
  try {
    const procesos = await fetchProcessesByDate({ fecha });
    const screened = prescreenBatch(procesos, DUMMY_PROFILE);
    oportunidadesAlta = screened.filter((r) => r.score >= SCORE_ALTA).slice(0, 15);
  } catch (err) {
    console.error("[cron/discovery-digest] error consultando SECOP:", err);
    return NextResponse.json(
      { error: "Error consultando procesos SECOP." },
      { status: 502 },
    );
  }

  if (oportunidadesAlta.length === 0) {
    return NextResponse.json({ ok: true, fecha, enviados: 0, motivo: "sin oportunidades ALTA" });
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, companyId: true },
  });

  let enviados = 0;
  const errores: string[] = [];

  for (const admin of admins) {
    try {
      await sendDailyDigest(admin.email, fecha, oportunidadesAlta);
      enviados += 1;
    } catch (err) {
      errores.push(
        `${admin.email}: ${err instanceof Error ? err.message : "error desconocido"}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    fecha,
    oportunidadesEncontradas: oportunidadesAlta.length,
    enviados,
    totalAdmins: admins.length,
    errores: errores.length > 0 ? errores : undefined,
  });
}
