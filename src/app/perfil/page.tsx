"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Submission, Challenge } from "@/types";

interface SubmissionWithChallengeDetails extends Omit<Submission, "challenge"> {
  challenge: Pick<Challenge, "id" | "titulo" | "lenguaje"> | null;
}

export default function PerfilPage() {
  const [submissions, setSubmissions] = useState<
    SubmissionWithChallengeDetails[]
  >([]);
  const [totalRetos, setTotalRetos] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number | string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user)
          throw new Error("Necesitas iniciar sesión para ver tu perfil.");

        const { count: retosCount, error: countError } = await supabase
          .from("challenges")
          .select("*", { count: "exact", head: true });

        if (countError) throw countError;
        setTotalRetos(retosCount ?? 0);

        const { data, error: submissionsError } = await supabase
          .from("submissions")
          .select(
            `
            id,
            created_at,
            codigo,
            resultado,
            challenge:challenge_id (
              id,
              titulo,
              lenguaje
            )
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (submissionsError) throw submissionsError;

        const fetchedData = (data ?? []).map((item) => ({
          ...item,
          challenge: Array.isArray(item.challenge)
            ? item.challenge[0]
            : item.challenge,
        })) as SubmissionWithChallengeDetails[];
        setSubmissions(fetchedData);
      } catch (err: unknown) {
        console.error("Error fetching profile data:", err);
        let message = "Error cargando perfil. Intenta de nuevo.";
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === "string") {
          message = err;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const completados = useMemo(
    () =>
      submissions.filter(
        (s) => s.resultado?.every((r: string) => r.includes("✅")) ?? false
      ),
    [submissions]
  );

  const porcentaje = totalRetos
    ? Math.round((completados.length / totalRetos) * 100)
    : 0;

  const ultimos = completados.slice(0, 5);

  const statsLenguaje = useMemo(() => {
    return completados.reduce<Record<string, number>>((acc, sub) => {
      const lang = sub.challenge?.lenguaje ?? "Otro";
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {});
  }, [completados]);

  const toggleExpand = (id: number | string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) return <p className="text-center mt-8">Cargando perfil…</p>;
  if (error) return <p className="text-center mt-8 text-red-600">{error}</p>;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold text-center text-gray-800">
        📋 Mi Perfil
      </h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition text-center">
          <h2 className="text-lg font-semibold text-blue-600">
            Retos completados
          </h2>
          <p className="text-3xl font-bold mt-2">
            {completados.length} / {totalRetos}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition text-center">
          <h2 className="text-lg font-semibold text-green-600">Progreso</h2>
          <div className="w-full bg-gray-200 rounded-full h-4 mt-2 overflow-hidden">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${porcentaje}%` }}
              role="progressbar"
              aria-valuenow={porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-1 font-semibold">{porcentaje}%</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition text-center">
          <h2 className="text-lg font-semibold text-yellow-600">
            Lenguajes usados (Completados)
          </h2>
          <ul className="mt-2 text-left text-sm">
            {Object.entries(statsLenguaje).length > 0 ? (
              Object.entries(statsLenguaje)
                .sort(([, countA], [, countB]) => countB - countA)
                .map(([lang, count]) => (
                  <li key={lang} className="flex items-center mb-1">
                    <span className="w-20 font-medium capitalize truncate">
                      {lang}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3 mx-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-3 rounded-full"
                        style={{
                          width: `${(count / completados.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold w-6 text-right">
                      {count}
                    </span>
                  </li>
                ))
            ) : (
              <li className="text-gray-600 italic">Aún no completas retos</li>
            )}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          📌 Últimos Retos Resueltos
        </h2>
        {ultimos.length === 0 ? (
          <p className="text-gray-600 text-center">
            Aún no has completado ningún reto. ¡Anímate!
          </p>
        ) : (
          <ul className="space-y-4">
            {ultimos.map((sub) => {
              const id = sub.id;
              const date = new Date(sub.created_at).toLocaleString();
              const isOpen = expanded.has(id);
              return (
                <li
                  key={id}
                  className="bg-white border rounded-lg p-4 shadow hover:shadow-md transition"
                >
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => toggleExpand(id)}
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {sub.challenge?.titulo ?? "Reto Desconocido"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sub.challenge?.lenguaje ?? "N/A"} — {date}
                      </p>
                    </div>
                    <span className="text-lg text-gray-600 hover:text-gray-800 transition">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                  {isOpen && (
                    <pre className="mt-4 bg-gray-100 p-3 rounded overflow-x-auto text-sm">
                      {sub.codigo ?? ""}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
