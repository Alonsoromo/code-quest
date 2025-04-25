"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { Challenge, Submission } from "@/types";

type SubmissionStatus = Pick<Submission, "challenge_id" | "resultado">;

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [retos, setRetos] = useState<Challenge[]>([]);
  const [completados, setCompletados] = useState<Set<number | string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user: u },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error fetching user:", userError);
        }
        setUser(u);

        const retosPromise = supabase
          .from("challenges")
          .select("id, titulo, lenguaje, nivel")
          .order("created_at", { ascending: false })
          .limit(5);

        const subsPromise = u
          ? supabase
              .from("submissions")
              .select("challenge_id, resultado")
              .eq("user_id", u.id)
          : Promise.resolve({ data: [], error: null });

        const [retosResp, subsResp] = await Promise.all([
          retosPromise,
          subsPromise,
        ]);

        if (retosResp.error) throw retosResp.error;
        if (subsResp.error) throw subsResp.error;

        const retosData = (retosResp.data as Challenge[]) ?? [];
        setRetos(retosData);

        if (u && subsResp.data) {
          const subsData = (subsResp.data as SubmissionStatus[]) ?? [];
          const resueltos = new Set(
            subsData
              .filter((s) =>
                s.resultado?.every((r: string) => r.includes("✅"))
              )
              .map((s) => s.challenge_id)
          );
          setCompletados(resueltos);
        } else {
          setCompletados(new Set());
        }
      } catch (err: unknown) {
        console.error("Error loading home page data:", err);
        let errorMessage = "Error desconocido";
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError("No se pudieron cargar los datos: " + errorMessage);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        {error && <p className="text-center text-red-500 mb-4">{error}</p>}

        {loading ? (
          <p className="text-center text-gray-500">Cargando retos…</p>
        ) : user ? (
          retos.length > 0 ? (
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
                    {completados.has(reto.id)
                      ? "👀 Ver solución"
                      : "🚀 Intentar"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500">
              No hay retos disponibles por el momento.
            </p>
          )
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
