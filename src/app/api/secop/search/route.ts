import { NextResponse } from "next/server";
import { searchProcesses, SecopApiError } from "@/lib/secop/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;

  if (!q) {
    return NextResponse.json(
      { error: "El parámetro 'q' es requerido." },
      { status: 400 },
    );
  }

  if (Number.isNaN(limit) || limit < 1) {
    return NextResponse.json(
      { error: "El parámetro 'limit' debe ser un número positivo." },
      { status: 400 },
    );
  }

  try {
    const results = await searchProcesses(q, limit);
    return NextResponse.json({ query: q, count: results.length, results });
  } catch (error) {
    const status = error instanceof SecopApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Error al buscar procesos.";
    return NextResponse.json({ error: message }, { status });
  }
}
