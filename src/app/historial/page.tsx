"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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

export default function HistorialPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todos" | "completados" | "incompletos">(
    "todos"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Necesitas iniciar sesión");
          return;
        }
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
        console.error(err);
        setError("Error cargando historial");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return submissions.filter((sub) => {
      const done = sub.resultado.every((r) => r.includes("✅"));
      if (filter === "completados") return done;
      if (filter === "incompletos") return !done;
      return true;
    });
  }, [submissions, filter]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) return <p className="text-center mt-8">Cargando historial…</p>;
  if (error) return <p className="text-center mt-8 text-red-600">{error}</p>;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">
        📜 Mi Historial de Retos
      </h1>

      {/* Filtros */}
      <div className="flex space-x-2">
        {["todos", "completados", "incompletos"].map((key) => (
          <button
            key={key}
            onClick={() =>
              setFilter(key as "todos" | "completados" | "incompletos")
            }
            className={`px-4 py-2 rounded-full transition ${
              filter === key
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {key === "todos"
              ? "Todos"
              : key === "completados"
              ? "Completados"
              : "Incompletos"}
          </button>
        ))}
      </div>

      {/* Lista de Submissions */}
      {filtered.length === 0 ? (
        <p className="text-gray-600">
          No hay registros para el filtro seleccionado.
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((sub) => {
            const done = sub.resultado.every((r) => r.includes("✅"));
            const date = new Date(sub.created_at).toLocaleString();
            return (
              <li
                key={sub.id}
                className="border rounded-lg p-4 hover:shadow-lg transition relative bg-white"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(sub.id)}
                >
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 hover:underline">
                      {sub.challenge ? (
                        <Link href={`/retos/${sub.challenge.id}`}>
                          {sub.challenge.titulo}
                        </Link>
                      ) : (
                        <span className="text-red-600">Reto no disponible</span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {sub.challenge?.lenguaje} — {date}
                    </p>
                  </div>
                  <span className="text-2xl">
                    {expandedId === sub.id ? "▲" : "▼"}
                  </span>
                </div>

                {expandedId === sub.id && (
                  <div className="mt-4 space-y-2">
                    <p>
                      Estado:{" "}
                      <span
                        className={`font-semibold ${
                          done ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {done ? "✔ Completado" : "✘ Incompleto"}
                      </span>
                    </p>
                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                      {sub.codigo}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
