import type { BrechaRequisito, CategoriaRequisito } from "@/types/ai";

export interface ScoreCategory {
  categoria: CategoriaRequisito;
  pesoTotal: number;
  pesoObtenido: number;
  brechas: BrechaRequisito[];
}

const CATEGORIAS: CategoriaRequisito[] = [
  "JURIDICO",
  "FINANCIERO",
  "EXPERIENCIA",
  "EQUIPO",
  "CERTIFICACION",
];

export function calcularScore(brechas: BrechaRequisito[]): {
  puntaje: number;
  porCategoria: ScoreCategory[];
} {
  const porCategoria: ScoreCategory[] = CATEGORIAS.map((categoria) => {
    const brechasCat = brechas.filter((b) => b.categoria === categoria);
    const pesoTotal = brechasCat.reduce((sum, b) => sum + b.peso, 0);

    const pesoObtenido = brechasCat.reduce((sum, b) => {
      if (b.estado === "CUMPLE") return sum + b.peso;
      if (b.estado === "PARCIAL") return sum + b.peso * 0.5;
      if (b.estado === "NO_APLICA") return sum + b.peso * 0.5;
      return sum;
    }, 0);

    return { categoria, pesoTotal, pesoObtenido, brechas: brechasCat };
  });

  const pesoTotalGlobal = porCategoria.reduce((s, c) => s + c.pesoTotal, 0);
  const pesoObtenidoGlobal = porCategoria.reduce((s, c) => s + c.pesoObtenido, 0);

  const puntaje =
    pesoTotalGlobal > 0
      ? Math.round((pesoObtenidoGlobal / pesoTotalGlobal) * 100)
      : 0;

  return { puntaje, porCategoria };
}

export function generarRecomendaciones(brechas: BrechaRequisito[]): string[] {
  const recomendaciones = brechas
    .filter((b) => b.estado === "NO_CUMPLE" || b.estado === "PARCIAL")
    .map((b) => b.recomendacion);

  return [...new Set(recomendaciones)].slice(0, 10);
}
