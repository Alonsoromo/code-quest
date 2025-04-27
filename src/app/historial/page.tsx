"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; // Keep supabase for specific query
import { Submission, Challenge } from "@/types";
import { useAuthUser } from "@/lib/hooks/useAuthUser"; // Import auth hook
import { useRouter } from "next/navigation"; // Import router for redirect

// Keep this interface as it defines the specific joined data structure needed
interface SubmissionWithChallengeDetails extends Omit<Submission, "challenge"> {
  challenge: Pick<Challenge, "id" | "titulo" | "lenguaje"> | null;
}

export default function HistorialPage() {
  const { user, loading: authLoading, error: authError } = useAuthUser(); // Use auth hook
  const router = useRouter(); // Initialize router

  const [submissions, setSubmissions] = useState<
    SubmissionWithChallengeDetails[]
  >([]);
  const [fetchLoading, setFetchLoading] = useState(true); // Specific loading for this fetch
  const [fetchError, setFetchError] = useState<string | null>(null); // Specific error for this fetch
  const [filter, setFilter] = useState<"todos" | "completados" | "incompletos">(
    "todos"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Combined loading/error
  const loading = authLoading || fetchLoading;
  const error = authError || fetchError;

  useEffect(() => {
    if (authLoading) return; // Wait for auth check

    if (!user) {
      // Redirect if not logged in after auth check
      router.push(
        "/login?error=Necesitas iniciar sesión para ver tu historial."
      );
      return;
    }

    async function fetchData() {
      setFetchLoading(true);
      setFetchError(null);
      try {
        // User is guaranteed here by the check above
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
          .eq("user_id", user!.id) // Use user from hook
          .order("created_at", { ascending: false });

        if (submissionsError) throw submissionsError;

        // Process data (handle potential array in challenge)
        const fetchedData = (data ?? []).map((item) => ({
          ...item,
          challenge: Array.isArray(item.challenge)
            ? item.challenge[0] // Take the first element if it's an array (shouldn't happen with .single() equivalent in join)
            : item.challenge,
        })) as SubmissionWithChallengeDetails[];
        setSubmissions(fetchedData);
      } catch (err: unknown) {
        console.error("Error fetching history:", err);
        let message = "Error cargando historial. Intenta de nuevo.";
        if (err instanceof Error) message = err.message;
        setFetchError(message);
      } finally {
        setFetchLoading(false);
      }
    }
    fetchData();
  }, [user, authLoading, router]); // Depend on user and auth state

  const filtered = useMemo(() => {
    return submissions.filter((sub) => {
      if (!sub.resultado) {
        return filter === "incompletos" || filter === "todos";
      }
      const done = sub.resultado.every((r: string) => r.includes("✅"));
      if (filter === "completados") return done;
      if (filter === "incompletos") return !done;
      return true;
    });
  }, [submissions, filter]);

  const toggleExpand = (id: number | string) => {
    const idStr = String(id);
    setExpandedId((prev) => (prev === idStr ? null : idStr));
  };

  // Use combined 'loading' and 'error' states
  if (loading)
    return (
      <p className="text-center mt-10 text-gray-600">Cargando historial...</p>
    );
  // Display auth error preferentially if it exists, otherwise fetch error
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">
        📜 Mi Historial de Retos
      </h1>

      <div className="flex space-x-2">
        {(["todos", "completados", "incompletos"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
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

      {filtered.length === 0 ? (
        <p className="text-gray-600">
          No hay registros para el filtro seleccionado.
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((sub) => {
            const isDone =
              sub.resultado?.every((r: string) => r.includes("✅")) ?? false;
            const date = new Date(sub.created_at).toLocaleString();
            const isExpanded = expandedId === String(sub.id);

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
                  <span className="text-2xl">{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-2">
                    <p>
                      Estado:{" "}
                      <span
                        className={`font-semibold ${
                          isDone ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isDone ? "✔ Completado" : "✘ Incompleto"}
                      </span>
                    </p>
                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                      {sub.codigo ?? ""}
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
