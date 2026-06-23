"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GaugeViabilidad from "./GaugeViabilidad";
import BrechasTable from "./BrechasTable";
import type { AnalisisViabilidad } from "@/types/ai";

interface AnalysisResultProps {
  processId: string;
}

const LOADING_STEPS = [
  "Obteniendo proceso de SECOP II...",
  "Descargando documentos del pliego...",
  "Analizando requisitos con IA...",
  "Comparando contra perfil de empresa...",
];

export default function AnalysisResult({ processId }: AnalysisResultProps) {
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<AnalisisViabilidad | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runAnalysis() {
      try {
        const stepInterval = setInterval(() => {
          if (cancelled) return;
          setCurrentStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
        }, 4000);

        const response = await fetch("/api/analyze/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noticeUID: processId }),
        });

        clearInterval(stepInterval);

        if (cancelled) return;

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error al analizar el proceso.");
        }

        setResult(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error desconocido.");
        setLoading(false);
      }
    }

    runAnalysis();
    return () => {
      cancelled = true;
    };
  }, [processId]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-muted transition hover:text-foreground"
        >
          <span aria-hidden>←</span> Volver al inicio
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-brand"
            aria-hidden
          />
          <div className="w-full max-w-md">
            <h2 className="mb-4 text-center text-base font-semibold text-foreground">
              Analizando proceso
            </h2>
            <div className="flex flex-col gap-3">
              {LOADING_STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition ${
                    i < currentStep
                      ? "border-emerald/30 bg-emerald/5 opacity-60"
                      : i === currentStep
                        ? "border-brand/40 bg-brand/5"
                        : "border-border bg-surface2 opacity-40"
                  }`}
                  style={
                    i < currentStep
                      ? { borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)" }
                      : i === currentStep
                        ? { borderColor: "rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.05)" }
                        : undefined
                  }
                >
                  <span className="text-sm">
                    {i < currentStep ? "✅" : i === currentStep ? "⏳" : "⬚"}
                  </span>
                  <span
                    className={`text-xs ${
                      i === currentStep ? "font-semibold text-foreground" : "text-muted"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-muted transition hover:text-foreground"
        >
          <span aria-hidden>←</span> Volver al inicio
        </Link>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            ❌
          </div>
          <h2 className="text-lg font-bold text-foreground">No se pudo completar el análisis</h2>
          <p className="max-w-md text-center text-sm text-muted">{error}</p>
          <Link
            href="/"
            className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand2"
          >
            Intentar con otro proceso
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted transition hover:text-foreground"
      >
        <span aria-hidden>←</span> Volver al inicio
      </Link>

      <header className="mb-8">
        <span className="inline-flex items-center rounded-full border border-border bg-surface2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Resultado del análisis
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {result.proceso.objeto || "Proceso sin nombre"}
        </h1>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <span>
            <strong className="text-foreground">Empresa:</strong> {result.empresa.nombre}
          </span>
          <span>
            <strong className="text-foreground">Modalidad:</strong> {result.proceso.modalidad || "N/A"}
          </span>
          {result.proceso.valorEstimado > 0 && (
            <span>
              <strong className="text-foreground">Valor:</strong> $
              {(result.proceso.valorEstimado / 1_000_000).toFixed(0)}M COP
            </span>
          )}
        </div>
      </header>

      <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <div
          className="mb-5 h-[3px] w-full rounded-full"
          style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
        />
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted">
          Resumen ejecutivo
        </h2>
        <p className="text-sm leading-relaxed text-foreground">{result.resumenEjecutivo}</p>
      </section>

      <section className="mb-8 grid gap-6 sm:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div
            className="mb-5 h-[3px] w-full rounded-full"
            style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
          />
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted">
            Puntaje de viabilidad
          </h2>
          <GaugeViabilidad puntaje={result.puntaje} nivel={result.nivel} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <div
            className="mb-5 h-[3px] w-full rounded-full"
            style={{ background: "linear-gradient(90deg,#10b981,#06b6d4)" }}
          />
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted">
            Recomendaciones accionables
          </h2>
          {result.recomendaciones.length === 0 ? (
            <p className="text-sm text-muted">
              No hay recomendaciones — la empresa cumple todos los requisitos.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {result.recomendaciones.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <div
          className="mb-5 h-[3px] w-full rounded-full"
          style={{ background: "linear-gradient(90deg,#ec4899,#8b5cf6)" }}
        />
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted">
          Matriz de brechas
        </h2>
        <BrechasTable brechas={result.brechas} />
      </section>

      <footer className="mt-auto pt-8 text-center text-[11px] text-muted/70">
        SECOP AI Analyzer · Piloto · {result.proceso.fuenteDocumento}
      </footer>
    </div>
  );
}
