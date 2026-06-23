"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface HistorialItem {
  id: string;
  procesoObjeto: string;
  valorEstimado: number;
  puntaje: number;
  nivel: string;
  modoAnalisis: string;
  seAplico: boolean;
  resultado: string;
  notas: string | null;
  createdAt: string;
}

interface HistorialResponse {
  items: HistorialItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface Calibracion {
  totalConFeedback: number;
  ganados: { total: number; promedioScore: number | null };
  perdidos: { total: number; promedioScore: number | null };
  calibrado: boolean | null;
  mensaje: string;
}

const NIVEL_COLORS: Record<string, string> = {
  ALTA: "#10b981",
  MEDIA: "#f59e0b",
  BAJA: "#fb923c",
  MUY_BAJA: "#ef4444",
};

const RESULTADOS = ["PENDIENTE", "GANADO", "PERDIDO", "NO_APLICO"];

const RESULTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  GANADO: "Ganado",
  PERDIDO: "Perdido",
  NO_APLICO: "No se aplicó",
};

const RESULTADO_COLORS: Record<string, string> = {
  PENDIENTE: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  GANADO: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  PERDIDO: "text-red-400 bg-red-500/10 border-red-500/30",
  NO_APLICO: "text-gray-500 bg-gray-800 border-gray-700",
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString("es-CO")}`;
}

export default function HistorialPage() {
  const [data, setData] = useState<HistorialResponse | null>(null);
  const [calibracion, setCalibracion] = useState<Calibracion | null>(null);
  const [page, setPage] = useState(1);
  const [filterNivel, setFilterNivel] = useState("");
  const [filterResultado, setFilterResultado] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterNivel) params.set("nivel", filterNivel);
    if (filterResultado) params.set("resultado", filterResultado);

    const [histRes, calRes] = await Promise.all([
      fetch(`/api/analyze/history?${params.toString()}`),
      fetch("/api/analyze/calibracion"),
    ]);

    if (histRes.ok) setData(await histRes.json());
    if (calRes.ok) setCalibracion(await calRes.json());
    setLoading(false);
  }, [page, filterNivel, filterResultado]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateFeedback(id: string, patch: { seAplico?: boolean; resultado?: string }) {
    setSavingId(id);
    const res = await fetch(`/api/analyze/history/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setData((d) =>
        d ? { ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...updated } : i)) } : d,
      );
      // Refresca calibración tras cada cambio de feedback
      fetch("/api/analyze/calibracion")
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => c && setCalibracion(c));
    }
    setSavingId(null);
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      <div className="border-b border-[#2e3350] px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Historial de análisis</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Registra el resultado real de cada proceso para calibrar el scoring
            </p>
          </div>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Calibración */}
        {calibracion && (
          <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Calibración del scoring</h2>
            {calibracion.totalConFeedback === 0 ? (
              <p className="text-xs text-gray-500">
                Aún no hay análisis con resultado registrado (Ganado/Perdido). Marca el resultado en la tabla de abajo para empezar a calibrar.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Ganados</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {calibracion.ganados.total}{" "}
                    <span className="text-xs text-gray-500">
                      (score prom. {calibracion.ganados.promedioScore ?? "—"})
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Perdidos</p>
                  <p className="text-lg font-bold text-red-400">
                    {calibracion.perdidos.total}{" "}
                    <span className="text-xs text-gray-500">
                      (score prom. {calibracion.perdidos.promedioScore ?? "—"})
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Estado</p>
                  <p className={`text-lg font-bold ${calibracion.calibrado ? "text-emerald-400" : "text-amber-400"}`}>
                    {calibracion.calibrado === null ? "—" : calibracion.calibrado ? "Calibrado" : "Revisar"}
                  </p>
                </div>
                <p className="sm:col-span-3 text-xs text-gray-500 mt-1">{calibracion.mensaje}</p>
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <select
            value={filterNivel}
            onChange={(e) => { setFilterNivel(e.target.value); setPage(1); }}
            className="text-xs bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-gray-300"
          >
            <option value="">Todos los niveles</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
            <option value="MUY_BAJA">Muy baja</option>
          </select>
          <select
            value={filterResultado}
            onChange={(e) => { setFilterResultado(e.target.value); setPage(1); }}
            className="text-xs bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-gray-300"
          >
            <option value="">Todos los resultados</option>
            {RESULTADOS.map((r) => (
              <option key={r} value={r}>{RESULTADO_LABELS[r]}</option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0f1117]">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Proceso</th>
                <th className="text-right px-4 py-3">Presupuesto</th>
                <th className="text-center px-4 py-3">Score</th>
                <th className="text-center px-4 py-3">Se aplicó</th>
                <th className="text-center px-4 py-3">Resultado</th>
                <th className="text-right px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e3350]">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-600 text-sm">Cargando…</td></tr>
              ) : !data || data.items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-600 text-sm">Sin análisis registrados.</td></tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className={savingId === item.id ? "opacity-50" : ""}>
                    <td className="px-4 py-3 text-gray-200 max-w-xs truncate">{item.procesoObjeto}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{fmt(item.valorEstimado)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold" style={{ color: NIVEL_COLORS[item.nivel] ?? "#9ca3af" }}>
                        {item.puntaje}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.seAplico}
                        onChange={(e) => updateFeedback(item.id, { seAplico: e.target.checked })}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={item.resultado}
                        onChange={(e) => updateFeedback(item.id, { resultado: e.target.value })}
                        className={`text-[10px] rounded-full border px-2 py-1 ${RESULTADO_COLORS[item.resultado]}`}
                      >
                        {RESULTADOS.map((r) => (
                          <option key={r} value={r}>{RESULTADO_LABELS[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {new Date(item.createdAt).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="bg-[#0f1117] border-t border-[#2e3350] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Página {data.page} de {data.totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs bg-[#1a1d27] border border-[#2e3350] rounded-lg text-gray-400 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-3 py-1.5 text-xs bg-[#1a1d27] border border-[#2e3350] rounded-lg text-gray-400 disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
