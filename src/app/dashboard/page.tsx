"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardStats {
  total: number;
  promedioScore: number;
  tasaViabilidadAlta: number;
  porNivel: Record<string, number>;
  brechasFrecuentes: { categoria: string; total: number }[];
  recientes: {
    id: string;
    procesoObjeto: string;
    valorEstimado: number;
    puntaje: number;
    nivel: string;
    modoAnalisis: string;
    createdAt: string;
  }[];
}

const NIVEL_COLORS: Record<string, string> = {
  ALTA: "#10b981",
  MEDIA: "#f59e0b",
  BAJA: "#fb923c",
  MUY_BAJA: "#ef4444",
};

const CATEGORIA_LABELS: Record<string, string> = {
  JURIDICO: "Jurídico",
  FINANCIERO: "Financiero",
  TECNICO: "Técnico",
  EXPERIENCIA: "Experiencia",
  EQUIPO: "Equipo",
  CERTIFICACION: "Certificación",
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString("es-CO")}`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Error ${res.status}`);
        }
        return res.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="min-h-screen bg-[#0f1117] flex items-center justify-center text-red-400 text-sm">
        {error || "No se pudo cargar el dashboard."}
      </main>
    );
  }

  const nivelData = Object.entries(stats.porNivel)
    .filter(([, v]) => v > 0)
    .map(([nivel, value]) => ({ nivel, value }));

  const brechasData = stats.brechasFrecuentes.map((b) => ({
    categoria: CATEGORIA_LABELS[b.categoria] ?? b.categoria,
    total: b.total,
  }));

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      <div className="border-b border-[#2e3350] px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Histórico de análisis de viabilidad de tu empresa
            </p>
          </div>
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Procesos analizados</p>
            <p className="text-3xl font-bold mt-2">{stats.total}</p>
          </div>
          <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Score promedio</p>
            <p className="text-3xl font-bold mt-2">{stats.promedioScore}<span className="text-base text-gray-500">/100</span></p>
          </div>
          <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Tasa de viabilidad alta</p>
            <p className="text-3xl font-bold mt-2 text-emerald-400">{stats.tasaViabilidadAlta}%</p>
          </div>
        </div>

        {stats.total === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">
            Aún no has analizado ningún proceso.{" "}
            <Link href="/" className="text-indigo-400 hover:underline">Analiza tu primer proceso</Link>.
          </div>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">Distribución de viabilidad</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={nivelData}
                      dataKey="value"
                      nameKey="nivel"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(d: { nivel?: string; value?: number }) => `${d.nivel}: ${d.value}`}
                    >
                      {nivelData.map((entry) => (
                        <Cell key={entry.nivel} fill={NIVEL_COLORS[entry.nivel] ?? "#6366f1"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #2e3350" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">Brechas más frecuentes</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={brechasData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e3350" />
                    <XAxis dataKey="categoria" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #2e3350" }} />
                    <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recientes */}
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Análisis recientes</h2>
              <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#0f1117]">
                    <tr className="text-xs text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Proceso</th>
                      <th className="text-right px-4 py-3">Presupuesto</th>
                      <th className="text-center px-4 py-3">Score</th>
                      <th className="text-center px-4 py-3">Modo</th>
                      <th className="text-right px-4 py-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e3350]">
                    {stats.recientes.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-gray-200 max-w-xs truncate">{r.procesoObjeto}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{fmt(r.valorEstimado)}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="font-bold"
                            style={{ color: NIVEL_COLORS[r.nivel] ?? "#9ca3af" }}
                          >
                            {r.puntaje}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-[10px] text-gray-500">{r.modoAnalisis}</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                          {new Date(r.createdAt).toLocaleDateString("es-CO")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
