import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AnalisisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-muted transition hover:text-foreground"
      >
        <span aria-hidden>←</span> Volver al inicio
      </Link>

      <header className="mb-6">
        <span className="inline-flex items-center rounded-full border border-border bg-surface2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Proceso
        </span>
        <h1 className="mt-3 break-all text-2xl font-extrabold tracking-tight text-foreground">
          {decodeURIComponent(id)}
        </h1>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div
          className="mb-5 h-[3px] w-full rounded-full"
          style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
        />
        <h2 className="text-base font-semibold text-foreground">
          Análisis en construcción
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          El motor de análisis (extracción de requisitos del pliego y matriz de
          viabilidad) se implementa en las próximas sesiones del piloto. Esta
          ruta está reservada para mostrar el resultado del análisis del
          proceso.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-md border border-border bg-surface2 px-2.5 py-1 text-[10px] font-semibold text-muted">
            Sesión 2 · API datos.gov.co
          </span>
          <span className="rounded-md border border-border bg-surface2 px-2.5 py-1 text-[10px] font-semibold text-muted">
            Sesión 4 · Extracción Claude
          </span>
          <span className="rounded-md border border-border bg-surface2 px-2.5 py-1 text-[10px] font-semibold text-muted">
            Sesión 6 · UI de resultados
          </span>
        </div>
      </section>
    </main>
  );
}
