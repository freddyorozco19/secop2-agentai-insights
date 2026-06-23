"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface CompanyDocument {
  id: string;
  nombre: string;
  tipo: string;
  indexStatus: "PENDIENTE" | "INDEXANDO" | "INDEXADO" | "ERROR";
  chunksIndexed: number;
  errorMensaje: string | null;
  createdAt: string;
}

const TIPOS: { value: string; label: string }[] = [
  { value: "PERFIL_FINANCIERO", label: "Perfil financiero" },
  { value: "CERTIFICACION", label: "Certificación" },
  { value: "HOJA_DE_VIDA", label: "Hoja de vida" },
  { value: "EXPERIENCIA", label: "Experiencia / Contratos previos" },
  { value: "JURIDICO", label: "Jurídico (RUP, Cámara de Comercio)" },
  { value: "OTRO", label: "Otro" },
];

function StatusBadge({ status, error }: { status: string; error: string | null }) {
  const map: Record<string, string> = {
    PENDIENTE: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    INDEXANDO: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    INDEXADO: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    ERROR: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels: Record<string, string> = {
    PENDIENTE: "Pendiente",
    INDEXANDO: "Indexando…",
    INDEXADO: "Indexado",
    ERROR: "Error",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}
      title={error ?? undefined}
    >
      {labels[status]}
    </span>
  );
}

export default function DocumentosPage() {
  const [docs, setDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [tipo, setTipo] = useState("OTRO");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/documents");
      setDocs(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tipo", tipo);
        formData.append("nombre", file.name);

        const res = await fetch("/api/profile/documents", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Error ${res.status}`);
        }

        await fetchDocs();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al subir el documento.");
      } finally {
        setUploading(false);
      }
    },
    [tipo, fetchDocs],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este documento? Se borrará también de la base vectorial.")) return;
    await fetch(`/api/profile/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      <div className="border-b border-[#2e3350] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Documentos de la empresa</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Sube perfiles financieros, certificaciones y HVs — se indexan automáticamente para el análisis con IA
            </p>
          </div>
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Selector de tipo + dropzone */}
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Tipo de documento a subir</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="bg-[#1a1d27] border border-[#2e3350] rounded-lg px-3 py-2 text-sm text-gray-300 max-w-xs focus:outline-none focus:border-indigo-500"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-indigo-500 bg-indigo-500/5"
                : "border-[#2e3350] hover:border-indigo-500/50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <span className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Subiendo e indexando…</p>
              </div>
            ) : (
              <>
                <p className="text-gray-300 font-medium">Arrastra un archivo aquí o haz clic para seleccionar</p>
                <p className="text-gray-600 text-xs mt-1">PDF, TXT o Markdown</p>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Lista de documentos */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">
            Documentos cargados {!loading && `(${docs.length})`}
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-[#1a1d27] border border-[#2e3350] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <p className="text-gray-600 text-sm py-8 text-center">
              Aún no has subido documentos.
            </p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 bg-[#1a1d27] border border-[#2e3350] rounded-xl px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{doc.nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {TIPOS.find((t) => t.value === doc.tipo)?.label ?? doc.tipo}
                      {doc.indexStatus === "INDEXADO" && ` · ${doc.chunksIndexed} fragmentos indexados`}
                    </p>
                  </div>
                  <StatusBadge status={doc.indexStatus} error={doc.errorMensaje} />
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
