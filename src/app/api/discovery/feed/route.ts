import { NextRequest, NextResponse } from "next/server";
import { fetchProcessesByDate } from "@/lib/secop/discovery";
import { prescreenBatch } from "@/lib/ai/prescreener";
import { DUMMY_PROFILE } from "@/lib/company/dummyProfile";
import { SecopApiError } from "@/lib/secop/api";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const fecha =
    searchParams.get("fecha") ??
    new Date().toISOString().split("T")[0];
  const modalidad = searchParams.get("modalidad") ?? undefined;
  const tipoContrato = searchParams.get("tipo") ?? undefined;
  const minScore = Math.max(0, Number(searchParams.get("minScore") ?? "0"));
  const presupuestoMin = searchParams.get("presupuestoMin")
    ? Number(searchParams.get("presupuestoMin"))
    : undefined;
  const presupuestoMax = searchParams.get("presupuestoMax")
    ? Number(searchParams.get("presupuestoMax"))
    : undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json(
      { error: "Formato de fecha inválido. Use YYYY-MM-DD." },
      { status: 400 },
    );
  }

  try {
    const procesos = await fetchProcessesByDate({
      fecha,
      modalidad,
      tipoContrato,
      presupuestoMin,
      presupuestoMax,
    });

    const screened = prescreenBatch(procesos, DUMMY_PROFILE);
    const filtered = screened.filter((r) => r.score >= minScore);

    const total = filtered.length;
    const offset = (page - 1) * PAGE_SIZE;
    const items = filtered.slice(offset, offset + PAGE_SIZE);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
      fecha,
    });
  } catch (err) {
    if (err instanceof SecopApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[discovery/feed]", err);
    return NextResponse.json(
      { error: "Error consultando procesos." },
      { status: 500 },
    );
  }
}
