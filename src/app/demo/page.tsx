import Link from "next/link";
import { compararProceso } from "@/lib/ai/comparator";
import { DUMMY_PROFILE } from "@/lib/company/dummyProfile";
import { DEMO_PROCESS } from "@/lib/company/demoProcess";
import GaugeViabilidad from "@/components/GaugeViabilidad";
import BrechasTable from "@/components/BrechasTable";

export default function DemoPage() {
  const analisis = compararProceso(DEMO_PROCESS, DUMMY_PROFILE);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12 sm:py-16">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted transition hover:text-foreground"
        >
          <span aria-hidden>←</span> Volver al inicio
        </Link>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: "rgba(245,158,11,0.12)",
            color: "#fbbf24",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          Demo con datos simulados
        </span>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {analisis.proceso.objeto}
        </h1>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <span>
            <strong className="text-foreground">Empresa:</strong>{" "}
            {analisis.empresa.nombre}
          </span>
          <span>
            <strong className="text-foreground">Modalidad:</strong>{" "}
            {analisis.proceso.modalidad}
          </span>
          <span>
            <strong className="text-foreground">Valor:</strong> $
            {(analisis.proceso.valorEstimado / 1_000_000).toFixed(0)}M COP
          </span>
          <span>
            <strong className="text-foreground">Cierre:</strong> 15 jul 2026
          </span>
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
        <p className="text-sm leading-relaxed text-foreground">
          {analisis.resumenEjecutivo}
        </p>
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
          <GaugeViabilidad puntaje={analisis.puntaje} nivel={analisis.nivel} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <div
            className="mb-5 h-[3px] w-full rounded-full"
            style={{ background: "linear-gradient(90deg,#10b981,#06b6d4)" }}
          />
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted">
            Recomendaciones accionables
          </h2>
          {analisis.recomendaciones.length === 0 ? (
            <p className="text-sm text-muted">
              No hay recomendaciones — la empresa cumple todos los requisitos.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {analisis.recomendaciones.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">
                    {rec}
                  </span>
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
        <BrechasTable brechas={analisis.brechas} />
      </section>

      <footer className="mt-auto pt-8 text-center text-[11px] text-muted/70">
        SECOP AI Analyzer · Demo con datos simulados · No requiere API keys
      </footer>
    </div>
  );
}
