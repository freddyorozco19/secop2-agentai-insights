"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { parseProcessInput } from "@/lib/utils";

const STEPS = [
  {
    title: "Pega el proceso",
    desc: "Ingresa la URL del proceso en SECOP II o su número (ej. CO1.REQ.5912737).",
  },
  {
    title: "Extracción con IA",
    desc: "El agente descarga el pliego y los estudios previos y extrae los requisitos estructurados.",
  },
  {
    title: "Matriz de viabilidad",
    desc: "Compara los requisitos contra el perfil de tu empresa y entrega un puntaje 0–100 con recomendaciones.",
  },
];

export default function ProcessAnalyzer() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = parseProcessInput(value);
    if (!parsed) {
      setError(
        "Ingresa una URL o número de proceso válido. Ejemplo: CO1.REQ.5912737",
      );
      return;
    }
    setLoading(true);
    router.push(`/analisis/${encodeURIComponent(parsed.id)}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[680px] -translate-x-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(circle at center, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-16 sm:py-24">
        <header className="mb-10 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            SA
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-foreground">
              SECOP AI <span className="text-brand">Analyzer</span>
            </h1>
            <p className="text-xs text-muted">Piloto · Contratación pública Colombia</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {status === "authenticated" && session ? (
              <>
                <span className="text-[11px] text-muted">{session.user.name}</span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-full border border-border bg-surface2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-foreground transition"
                >
                  Salir
                </button>
              </>
            ) : status === "unauthenticated" ? (
              <Link
                href="/login"
                className="rounded-full border border-border bg-surface2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-foreground transition"
              >
                Iniciar sesión
              </Link>
            ) : null}
          </div>
        </header>

        <section className="mb-8">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Analiza procesos de SECOP II con IA
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Pega la URL o el número de un proceso de contratación pública. El
            agente extrae los requisitos del pliego y los compara contra el
            perfil de tu empresa para determinar la viabilidad de participación.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div
            className="mb-5 h-[3px] w-full rounded-full"
            style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
          />
          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor="process-input"
              className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              URL o número de proceso SECOP II
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="process-input"
                name="process-input"
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="CO1.REQ.5912737 o pega la URL del proceso"
                autoComplete="off"
                spellCheck={false}
                className="w-full flex-1 rounded-lg border border-border bg-surface2 px-4 py-3 text-sm text-foreground placeholder:text-muted/70 outline-none transition focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/40"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Analizando…
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    Analizar proceso
                  </>
                )}
              </button>
            </div>
            {error ? (
              <p className="mt-3 text-xs font-medium text-danger">{error}</p>
            ) : null}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
              <span>Ejemplo:</span>
              <code className="rounded-md border border-border bg-surface2 px-2 py-0.5 font-mono text-[11px] text-brand">
                CO1.REQ.5912737
              </code>
              <span>o</span>
              <code className="rounded-md border border-border bg-surface2 px-2 py-0.5 font-mono text-[11px] text-brand">
                https://community.secop.gov.co/...
              </code>
            </div>
          </form>
        </section>

        <section className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface2 px-4 py-2.5 text-xs font-semibold text-muted transition hover:text-foreground"
          >
            <span aria-hidden>▶</span> Ver demo con datos simulados
          </Link>
          <Link
            href="/oportunidades"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-600/10 px-4 py-2.5 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-600/20 hover:text-indigo-300"
          >
            <span aria-hidden>📋</span> Ver oportunidades del día
          </Link>
          <Link
            href="/perfil/documentos"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface2 px-4 py-2.5 text-xs font-semibold text-muted transition hover:text-foreground"
          >
            <span aria-hidden>📁</span> Documentos de la empresa
          </Link>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted">
            Cómo funciona
          </h3>
          <ol className="flex flex-col gap-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex items-start gap-4">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-brand"
                  style={{ background: "rgba(99,102,241,0.12)" }}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-auto pt-10 text-center text-[11px] text-muted/70">
          SECOP AI Analyzer · Piloto de análisis de contratación pública · SECOP II
        </footer>
      </div>
    </main>
  );
}
