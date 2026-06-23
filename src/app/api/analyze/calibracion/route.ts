import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Compara el puntaje predicho por el modelo contra el resultado real
 * (GANADO/PERDIDO) reportado por el cliente. Si el promedio de puntaje de
 * los GANADO es mayor que el de los PERDIDO, el scoring está direccionalmente
 * calibrado. Estadística descriptiva simple — no es ML, apropiado para el
 * volumen de datos de un piloto.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const conResultado = await prisma.analisisHistorico.findMany({
    where: {
      tenantId: session.user.companyId,
      resultado: { in: ["GANADO", "PERDIDO"] },
    },
    select: { puntaje: true, resultado: true },
  });

  const ganados = conResultado.filter((r) => r.resultado === "GANADO");
  const perdidos = conResultado.filter((r) => r.resultado === "PERDIDO");

  const promedio = (arr: { puntaje: number }[]) =>
    arr.length > 0 ? Math.round(arr.reduce((s, x) => s + x.puntaje, 0) / arr.length) : null;

  const promedioGanados = promedio(ganados);
  const promedioPerdidos = promedio(perdidos);

  const calibrado =
    promedioGanados !== null && promedioPerdidos !== null
      ? promedioGanados > promedioPerdidos
      : null;

  return NextResponse.json({
    totalConFeedback: conResultado.length,
    ganados: { total: ganados.length, promedioScore: promedioGanados },
    perdidos: { total: perdidos.length, promedioScore: promedioPerdidos },
    calibrado,
    mensaje:
      conResultado.length < 5
        ? "Se necesitan al menos 5 análisis con feedback para una calibración confiable."
        : calibrado
          ? "El scoring está direccionalmente calibrado: los procesos ganados tienen, en promedio, mayor puntaje que los perdidos."
          : "El scoring no muestra correlación clara con los resultados reales — revisar los pesos por categoría.",
  });
}
