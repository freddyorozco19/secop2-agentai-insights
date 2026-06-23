"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { PreScreenResult } from "@/lib/ai/prescreener";
import { MODALIDADES } from "@/lib/secop/discovery";

interface FeedResponse {
  items: PreScreenResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  fecha: string;
}

function lastWorkingDay(): string {
  // Colombia UTC-5, retrocede al último día hábil (el API tiene ~1 día de delay)
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  const dow = d.getUTCDay(); // 0=Dom, 6=Sab
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2); // domingo → viernes
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1); // sábado → viernes
  return d.toISOString().split("T")[0];
}

function fmt(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString("es-CO")}`;
}

function ScoreBadge({ score, nivel }: { score: number; nivel: string }) {
  const colors =
    nivel === "ALTA"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : nivel === "MEDIA"
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${colors}`}
    >
      {score}
      <span className="font-normal opacity-70">/ 100</span>
    </span>
  );
}

function NivelBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500"
      : score >= 45
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
      <div
        className={`${color} h-1 rounded-full transition-all`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export default function OportunidadesPage() {
  const [fecha, setFecha] = useState(lastWorkingDay());
  const [modalidad, setModalidad] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ fecha, page: String(page) });
      if (modalidad) params.set("modalidad", modalidad);
      if (minScore > 0) params.set("minScore", String(minScore));

      const res = await fetch(`/api/discovery/feed?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [fecha, modalidad, minScore, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reiniciar página al cambiar filtros
  function applyFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-[#2e3350] px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              Oportunidades de contratación
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Procesos SECOP II rankeados por viabilidad para TechCorp Colombia
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="border-b border-[#2e3350] bg-[#1a1d27] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-end gap-4">
          {/* Fecha */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Fecha de publicación</label>
            <input
              type="date"
              value={fecha}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => applyFilter(() => setFecha(e.target.value))}
              className="bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Modalidad */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Modalidad</label>
            <select
              value={modalidad}
              onChange={(e) => applyFilter(() => setModalidad(e.target.value))}
              className="bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Todas las modalidades</option>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Score mínimo */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs text-gray-400 font-medium">
              Score mínimo:{" "}
              <span className="text-indigo-400 font-bold">{minScore}</span>
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={minScore}
              onChange={(e) =>
                applyFilter(() => setMinScore(Number(e.target.value)))
              }
              className="accent-indigo-500"
            />
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Consultando…
              </>
            ) : (
              "Consultar"
            )}
          </button>

          {data && !loading && (
            <span className="text-xs text-gray-500 ml-auto">
              {data.total} proceso{data.total !== 1 ? "s" : ""} encontrado
              {data.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-[#1a1d27] border border-[#2e3350] rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Tabla */}
        {!loading && data && data.items.length > 0 && (
          <div className="rounded-xl border border-[#2e3350] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a1d27] border-b border-[#2e3350] text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 w-28">Viabilidad</th>
                    <th className="text-left px-4 py-3">Entidad</th>
                    <th className="text-left px-4 py-3 max-w-xs">Objeto</th>
                    <th className="text-right px-4 py-3 w-28">Presupuesto</th>
                    <th className="text-left px-4 py-3 w-36">Modalidad</th>
                    <th className="text-center px-4 py-3 w-24">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e3350]">
                  {data.items.map((r) => (
                    <tr
                      key={r.proceso.id_del_proceso}
                      className="bg-[#0f1117] hover:bg-[#1a1d27] transition-colors group"
                    >
                      {/* Score */}
                      <td className="px-4 py-3">
                        <ScoreBadge score={r.score} nivel={r.nivel} />
                        <NivelBar score={r.score} />
                      </td>

                      {/* Entidad */}
                      <td className="px-4 py-3">
                        <p className="text-gray-300 text-xs font-medium truncate max-w-[160px]">
                          {r.proceso.entidad ?? "—"}
                        </p>
                        <p className="text-gray-600 text-[10px] mt-0.5">
                          {r.proceso.ciudad_entidad ?? ""}
                        </p>
                      </td>

                      {/* Objeto */}
                      <td className="px-4 py-3 max-w-xs">
                        <p
                          className="text-white text-xs leading-snug line-clamp-2"
                          title={r.proceso.nombre_del_procedimiento ?? ""}
                        >
                          {r.proceso.nombre_del_procedimiento ?? "Sin descripción"}
                        </p>
                        <p className="text-gray-600 text-[10px] mt-0.5 font-mono">
                          {r.proceso.id_del_proceso}
                        </p>
                      </td>

                      {/* Presupuesto */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-200 text-xs font-medium">
                          {fmt(r.proceso.precio_base)}
                        </span>
                      </td>

                      {/* Modalidad */}
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-[10px] leading-tight block">
                          {r.proceso.modalidad_de_contratacion ?? "—"}
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/analisis/${encodeURIComponent(r.proceso.id_del_proceso)}`}
                          className={`inline-block px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            r.nivel === "ALTA"
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                              : r.nivel === "MEDIA"
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                          }`}
                        >
                          {r.nivel === "ALTA" ? "Analizar ↗" : "Ver"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {data.totalPages > 1 && (
              <div className="bg-[#1a1d27] border-t border-[#2e3350] px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Página {data.page} de {data.totalPages} · {data.total} resultados
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="px-3 py-1.5 text-xs bg-[#0f1117] border border-[#2e3350] rounded-lg text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    ← Anterior
                  </button>
                  {[...Array(Math.min(5, data.totalPages))].map((_, i) => {
                    const p = i + Math.max(1, page - 2);
                    if (p > data.totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
                          p === page
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-[#0f1117] border-[#2e3350] text-gray-400 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages || loading}
                    className="px-3 py-1.5 text-xs bg-[#0f1117] border border-[#2e3350] rounded-lg text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Estado vacío */}
        {!loading && data && data.items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Sin resultados para {data.fecha}</p>
            <p className="text-gray-600 text-sm mt-2">
              El API de SECOP tiene ~1 día de delay. Prueba con el viernes o jueves anterior.
            </p>
            <p className="text-gray-700 text-xs mt-1">
              Los fines de semana no se publican procesos.
            </p>
          </div>
        )}

        {/* Estado inicial */}
        {!loading && !data && !error && (
          <div className="text-center py-20 text-gray-600 text-sm">
            Selecciona una fecha y presiona Consultar.
          </div>
        )}
      </div>
    </main>
  );
}
