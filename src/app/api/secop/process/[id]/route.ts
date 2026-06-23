import { NextResponse } from "next/server";
import { fetchProcess, SecopApiError } from "@/lib/secop/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = decodeURIComponent(rawId).trim();

  if (!id) {
    return NextResponse.json(
      { error: "El id del proceso es requerido." },
      { status: 400 },
    );
  }

  try {
    const process = await fetchProcess(id);
    if (!process) {
      return NextResponse.json(
        { error: `No se encontró el proceso "${id}".` },
        { status: 404 },
      );
    }
    return NextResponse.json(process);
  } catch (error) {
    const status = error instanceof SecopApiError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Error al obtener el proceso.";
    return NextResponse.json({ error: message }, { status });
  }
}
