"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface Challenge {
  id: string;
  titulo: string;
  lenguaje: string;
}

interface SubmissionRaw {
  id: string;
  created_at: string;
  codigo: string;
  resultado: string[];
  challenge: Challenge | Challenge[];
}

interface Submission {
  id: string;
  created_at: string;
  codigo: string;
  resultado: string[];
  challenge: Challenge | null;
}

export default function PerfilPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalRetos, setTotalRetos] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Necesitas iniciar sesión");

        const { data: retos } = await supabase.from("challenges").select("id");
        setTotalRetos(retos?.length ?? 0);

        const { data, error } = await supabase
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
        if (error) throw error;

        const raw = (data ?? []) as SubmissionRaw[];
        const normalized: Submission[] = raw.map((sub) => {
          const chal = Array.isArray(sub.challenge)
            ? sub.challenge[0] ?? null
            : sub.challenge;
          return { ...sub, challenge: chal };
        });
        setSubmissions(normalized);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error cargando perfil";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const completados = useMemo(
    () => submissions.filter((s) => s.resultado.every((r) => r.includes("✅"))),
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

  const toggleExpand = (id: string) => {
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

      {/* Resumen */}
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
          <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
            <div
              className="bg-green-500 h-4 rounded-full transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="mt-1 font-semibold">{porcentaje}%</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition text-center">
          <h2 className="text-lg font-semibold text-yellow-600">
            Lenguajes usados
          </h2>
          <ul className="mt-2 text-left">
            {Object.entries(statsLenguaje).length > 0 ? (
              Object.entries(statsLenguaje).map(([lang, count]) => (
                <li key={lang} className="flex items-center mb-1">
                  <span className="w-24 font-medium capitalize">{lang}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 mx-2">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{
                        width: `${(count / completados.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-semibold">{count}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-600">Aún no completas retos</li>
            )}
          </ul>
        </div>
      </section>

      {/* Últimos Retos */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          📌 Últimos Retos Resueltos
        </h2>
        {ultimos.length === 0 ? (
          <p className="text-gray-600 text-center">
            Aún no has completado ningún reto.
          </p>
        ) : (
          <ul className="space-y-4">
            {ultimos.map((sub) => {
              const date = new Date(sub.created_at).toLocaleString();
              const isOpen = expanded.has(sub.id);
              return (
                <li
                  key={sub.id}
                  className="bg-white border rounded-lg p-4 shadow hover:shadow-md transition"
                >
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => toggleExpand(sub.id)}
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {sub.challenge?.titulo}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sub.challenge?.lenguaje} — {date}
                      </p>
                    </div>
                    <span className="text-lg text-gray-600 hover:text-gray-800 transition">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                  {isOpen && (
                    <pre className="mt-4 bg-gray-100 p-3 rounded overflow-x-auto text-sm">
                      {sub.codigo}
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
