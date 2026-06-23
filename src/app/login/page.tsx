"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos.");
        return;
      }

      router.push("/perfil/documentos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-lg mb-4"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            SA
          </div>
          <h1 className="text-xl font-bold">Inicia sesión</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-[#0f1117] border border-[#2e3350] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/onboarding" className="text-indigo-400 hover:text-indigo-300">
            Crea una
          </Link>
        </p>
      </div>
    </main>
  );
}
