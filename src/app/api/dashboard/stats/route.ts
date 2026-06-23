import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { BrechaRequisito, NivelViabilidad } from "@/types/ai";

export const dynamic = "force-dynamic";

interface BrechaConteo {
  categoria: string;
  total: number;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const registros = await prisma.analisisHistorico.findMany({
    where: { tenantId: session.user.companyId },
    orderBy: { createdAt: "desc" },
  });

  const total = registros.length;
  const promedioScore =
    total > 0
      ? Math.round(registros.reduce((s, r) => s + r.puntaje, 0) / total)
      : 0;

  const porNivel: Record<NivelViabilidad, number> = {
    ALTA: 0,
    MEDIA: 0,
    BAJA: 0,
    MUY_BAJA: 0,
  };
  for (const r of registros) {
    if (r.nivel in porNivel) porNivel[r.nivel as NivelViabilidad] += 1;
  }

  const conteoCategorias = new Map<string, number>();
  for (const r of registros) {
    try {
      const brechas = JSON.parse(r.brechasJson) as BrechaRequisito[];
      for (const b of brechas) {
        if (b.estado === "NO_CUMPLE" || b.estado === "PARCIAL") {
          conteoCategorias.set(
            b.categoria,
            (conteoCategorias.get(b.categoria) ?? 0) + 1,
          );
        }
      }
    } catch {
      // brechasJson corrupto en un registro puntual — se ignora, no rompe el dashboard
    }
  }

  const brechasFrecuentes: BrechaConteo[] = [...conteoCategorias.entries()]
    .map(([categoria, totalCat]) => ({ categoria, total: totalCat }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const recientes = registros.slice(0, 10).map((r) => ({
    id: r.id,
    procesoObjeto: r.procesoObjeto,
    valorEstimado: r.valorEstimado,
    puntaje: r.puntaje,
    nivel: r.nivel,
    modoAnalisis: r.modoAnalisis,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({
    total,
    promedioScore,
    tasaViabilidadAlta: total > 0 ? Math.round((porNivel.ALTA / total) * 100) : 0,
    porNivel,
    brechasFrecuentes,
    recientes,
  });
}
