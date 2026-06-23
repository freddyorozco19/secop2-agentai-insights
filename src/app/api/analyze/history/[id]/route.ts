import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ResultadoAplicacion } from "@/generated/prisma/client";

const VALID_RESULTADOS = ["PENDIENTE", "GANADO", "PERDIDO", "NO_APLICO"];

interface FeedbackBody {
  seAplico?: boolean;
  resultado?: string;
  notas?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const registro = await prisma.analisisHistorico.findUnique({ where: { id } });
  if (!registro) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }
  if (registro.tenantId !== session.user.companyId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  if (body.resultado && !VALID_RESULTADOS.includes(body.resultado)) {
    return NextResponse.json(
      { error: `resultado inválido. Usa uno de: ${VALID_RESULTADOS.join(", ")}` },
      { status: 400 },
    );
  }

  const updated = await prisma.analisisHistorico.update({
    where: { id },
    data: {
      ...(body.seAplico !== undefined ? { seAplico: body.seAplico } : {}),
      ...(body.resultado ? { resultado: body.resultado as ResultadoAplicacion } : {}),
      ...(body.notas !== undefined ? { notas: body.notas } : {}),
    },
  });

  return NextResponse.json(updated);
}
