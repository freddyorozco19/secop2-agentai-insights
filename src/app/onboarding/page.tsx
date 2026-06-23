"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = ["Datos de la empresa", "Cuenta de administrador"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    companyName: "",
    nit: "",
    sector: "",
    name: "",
    email: "",
    password: "",
  });

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError("El nombre de la empresa es obligatorio.");
      return;
    }
    setError("");
    setStep(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Completa nombre, email y contraseña.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const signInResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error("Cuenta creada, pero el inicio de sesión automático falló. Inicia sesión manualmente.");
      }

      router.push("/perfil/documentos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-lg mb-4"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            SA
          </div>
          <h1 className="text-xl font-bold">Crea tu cuenta</h1>
          <p className="text-sm text-gray-400 mt-1">
            Paso {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-indigo-500" : "bg-[#2e3350]"}`}
            />
          ))}
        </div>

        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6">
          {step === 0 ? (
            <form onSubmit={next} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Nombre de la empresa *</label>
                <input
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="TechCorp Colombia SAS"
                  className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">NIT (opcional)</label>
                <input
                  value={form.nit}
                  onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))}
                  placeholder="900.123.456-1"
                  className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Sector (opcional)</label>
                <input
                  value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                  placeholder="Consultoría tecnológica"
                  className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Continuar →
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Tu nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Freddy Orozco"
                  disabled={saving}
                  className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="freddy@techcorp.com"
                  disabled={saving}
                  className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Contraseña *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  disabled={saving}
                  className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  disabled={saving}
                  className="px-4 py-2.5 border border-[#2e3350] rounded-lg text-sm text-gray-300 hover:bg-[#0f1117] transition-colors disabled:opacity-50"
                >
                  ← Atrás
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {saving ? "Creando cuenta…" : "Crear cuenta"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
