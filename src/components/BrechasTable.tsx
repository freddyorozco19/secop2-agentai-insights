"use client";

import { useState, useMemo } from "react";
import type { BrechaRequisito, CategoriaRequisito } from "@/types/ai";

interface BrechasTableProps {
  brechas: BrechaRequisito[];
}

const CATEGORIAS: { value: CategoriaRequisito | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "JURIDICO", label: "Jurídico" },
  { value: "FINANCIERO", label: "Financiero" },
  { value: "EXPERIENCIA", label: "Experiencia" },
  { value: "EQUIPO", label: "Equipo" },
  { value: "CERTIFICACION", label: "Certificación" },
];

const ESTADOS = {
  CUMPLE: { icon: "✅", color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
  PARCIAL: { icon: "⚠️", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  NO_CUMPLE: { icon: "❌", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  NO_APLICA: { icon: "—", color: "#64748b", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)" },
} as const;

const CATEGORIA_LABEL: Record<CategoriaRequisito, string> = {
  JURIDICO: "Jurídico",
  FINANCIERO: "Financiero",
  EXPERIENCIA: "Experiencia",
  EQUIPO: "Equipo",
  CERTIFICACION: "Certificación",
  TECNICO: "Técnico",
};

export default function BrechasTable({ brechas }: BrechasTableProps) {
  const [filtro, setFiltro] = useState<CategoriaRequisito | "ALL">("ALL");

  const filtradas = useMemo(() => {
    if (filtro === "ALL") return brechas;
    return brechas.filter((b) => b.categoria === filtro);
  }, [brechas, filtro]);

  const counts = useMemo(() => {
    const c = { CUMPLE: 0, PARCIAL: 0, NO_CUMPLE: 0, NO_APLICA: 0 };
    for (const b of brechas) c[b.estado]++;
    return c;
  }, [brechas]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFiltro(cat.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filtro === cat.value
                ? "bg-brand text-white"
                : "border border-border bg-surface2 text-muted hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
        <div className="ml-auto flex gap-3 text-[11px] font-medium">
          <span className="text-emerald" style={{ color: "#10b981" }}>✅ {counts.CUMPLE}</span>
          <span style={{ color: "#f59e0b" }}>⚠️ {counts.PARCIAL}</span>
          <span style={{ color: "#ef4444" }}>❌ {counts.NO_CUMPLE}</span>
          <span className="text-muted">— {counts.NO_APLICA}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface2">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">Requisito</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">Categoría</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">Estado</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">Detalle</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted">Recomendación</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No hay requisitos en esta categoría.
                </td>
              </tr>
            ) : (
              filtradas.map((b, i) => {
                const est = ESTADOS[b.estado];
                return (
                  <tr
                    key={i}
                    className="border-t border-border transition hover:bg-surface2/50"
                  >
                    <td className="px-4 py-3 align-top text-foreground">{b.requisito}</td>
                    <td className="px-4 py-3 align-top">
                      <span className="rounded-md border border-border bg-surface2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                        {CATEGORIA_LABEL[b.categoria]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                        style={{ color: est.color, background: est.bg, border: `1px solid ${est.border}` }}
                      >
                        {est.icon} {b.estado.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs leading-relaxed text-muted">{b.detalle}</td>
                    <td className="px-4 py-3 align-top text-xs leading-relaxed text-muted">{b.recomendacion}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
