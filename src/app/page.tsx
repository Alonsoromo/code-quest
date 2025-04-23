"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Challenge {
  id: string;
  titulo: string;
  lenguaje: string;
  nivel: string;
}

interface SubmissionRaw {
  challenge_id: string;
  resultado: string[];
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [retos, setRetos] = useState<Challenge[]>([]);
  const [completados, setCompletados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      const retosResp = await supabase
        .from("challenges")
        .select("id, titulo, lenguaje, nivel")
        .order("created_at", { ascending: false })
        .limit(5);
      const retosData: Challenge[] = retosResp.data ?? [];
      setRetos(retosData);

      if (u) {
        const subsResp = await supabase
          .from("submissions")
          .select("challenge_id, resultado")
          .eq("user_id", u.id);
        const subsData: SubmissionRaw[] = subsResp.data ?? [];
        const resueltos = new Set(
          subsData
            .filter((s) => s.resultado.every((r) => r.includes("✅")))
            .map((s) => s.challenge_id)
        );
        setCompletados(resueltos);
      } else {
        setCompletados(new Set());
      }

      setLoading(false);
    }
    load();
  }, [router]);

  const requireAuth = (path: string) => {
    if (!user) {
      router.push("/login?error=Necesitas iniciar sesión para continuar");
    } else {
      router.push(path);
    }
  };

  return (
    <main className="py-12 px-6 max-w-4xl mx-auto">
      <section className="text-center mb-16 bg-gradient-to-r from-green-500 to-blue-600 text-white py-12 rounded-lg shadow-lg">
        <h1 className="text-5xl font-extrabold mb-4">
          🎯 Bienvenido a <span className="text-yellow-300">CodeQuest</span>
        </h1>
        <p className="text-lg sm:text-xl">
          Mejora tus habilidades de programación resolviendo retos interactivos.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => requireAuth("/retos")}
            className="bg-white text-green-600 font-semibold px-8 py-3 rounded-lg shadow hover:bg-gray-100 transition"
          >
            🚀 Empezar retos
          </button>
          {user && (
            <button
              onClick={() => router.push("/historial")}
              className="bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg shadow hover:bg-gray-100 transition"
            >
              📚 Mi historial
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold mb-6 text-gray-800">
          🔥 Últimos retos añadidos
        </h2>
        {loading ? (
          <p className="text-center text-gray-500">Cargando retos…</p>
        ) : user ? (
          <ul className="grid md:grid-cols-2 gap-6">
            {retos.map((reto) => (
              <li
                key={reto.id}
                className="relative bg-white border border-gray-200 rounded-lg p-6 shadow hover:shadow-md transition"
              >
                <h3 className="text-xl font-semibold mb-2">{reto.titulo}</h3>
                <p className="text-sm text-gray-500">
                  {reto.lenguaje} —{" "}
                  <span className="capitalize">{reto.nivel}</span>
                </p>
                <button
                  onClick={() => requireAuth(`/retos/${reto.id}`)}
                  className={`mt-4 inline-flex items-center px-4 py-2 rounded-full text-white font-medium transition ${
                    completados.has(reto.id)
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {completados.has(reto.id) ? "👀 Ver solución" : "🚀 Intentar"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center text-gray-500 space-y-4">
            <span className="text-6xl">🔒</span>
            <p className="text-lg">
              Regístrate o inicia sesión para ver los retos.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="text-green-600 font-semibold hover:underline"
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
