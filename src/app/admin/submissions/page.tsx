"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Submission } from "@/types";

export default function SubmissionsAdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [busquedaEmail, setBusquedaEmail] = useState("");
  const [busquedaReto, setBusquedaReto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "todos" | "completados" | "incompletos"
  >("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true);
      setError(null);
      setSubmissions([]);

      try {
        const { data, error: fetchError } = await supabase
          .from("submissions")
          .select(
            `
            id,
            created_at,
            codigo,
            resultado,
            user_id,
            challenge_id,
            user:public_user_profiles ( email ),
            challenges ( titulo )
          `
          )
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError; // Throw the Supabase error object

        // Define a type for the data structure returned by Supabase
        type FetchedSubmission = {
          id: string | number; // Match Submission['id'] type
          created_at: string;
          codigo: string | null;
          resultado: string[] | null;
          user_id: string;
          challenge_id: string | number; // Match Submission['challenge_id'] type
          // Use table names as keys for joined data
          users: { email: string } | null;
          challenges: { titulo: string } | null;
        };

        // Map the fetched data to ensure it matches the Submission type
        // Cast 'data' to 'unknown' first, then to the specific array type for safety
        const fetchedSubmissions =
          (data as unknown as FetchedSubmission[]) ?? [];
        const formattedData = fetchedSubmissions.map((item) => ({
          id: item.id,
          created_at: item.created_at,
          codigo: item.codigo,
          resultado: item.resultado,
          user_id: item.user_id,
          challenge_id: item.challenge_id,
          // Map from the keys returned by Supabase (table names) to the keys expected by Submission type
          user: item.users,
          challenge: item.challenges,
        }));

        // Ensure the final mapped data conforms to the Submission[] type expected by the state
        setSubmissions(formattedData as Submission[]);
      } catch (err: unknown) {
        console.error("Error raw al cargar submissions:", err); // Log the raw error object

        // Attempt to extract a meaningful message from the error
        let errorMessage = "Ocurrió un error desconocido."; // Default message

        if (typeof err === "object" && err !== null && "message" in err) {
          // Most likely a Supabase error object or similar object with a message property
          errorMessage = String(err.message); // Convert message to string just in case
        } else if (err instanceof Error) {
          // Standard JavaScript Error object
          errorMessage = err.message;
        } else if (typeof err === "string") {
          // If the error thrown was just a string
          errorMessage = err;
        }
        // You could add more specific checks here if needed, e.g., for err.code

        setError("No se pudieron cargar las submissions: " + errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, []);

  const filtrados = useMemo(() => {
    return submissions.filter((sub) => {
      const email = sub.user?.email?.toLowerCase() ?? "";
      const titulo = sub.challenge?.titulo?.toLowerCase() ?? "";
      const coincideEmail = email.includes(busquedaEmail.toLowerCase());
      const coincideReto = titulo.includes(busquedaReto.toLowerCase());
      const completado =
        sub.resultado?.every((r: string) => r.includes("✅")) ?? false;

      if (filtroEstado === "completados" && !completado) return false;
      if (filtroEstado === "incompletos" && completado) return false;

      return coincideEmail && coincideReto;
    });
  }, [submissions, busquedaEmail, busquedaReto, filtroEstado]);

  if (loading)
    return <p className="text-center mt-8">Cargando submissions...</p>;
  if (error) return <p className="text-center mt-8 text-red-600">{error}</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Submissions de usuarios</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por email"
          value={busquedaEmail}
          onChange={(e) => setBusquedaEmail(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          placeholder="Buscar por reto"
          value={busquedaReto}
          onChange={(e) => setBusquedaReto(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <select
          value={filtroEstado}
          onChange={(e) =>
            setFiltroEstado(
              e.target.value as "todos" | "completados" | "incompletos"
            )
          }
          className="border p-2 rounded w-full"
        >
          <option value="todos">Todos</option>
          <option value="completados">Completados</option>
          <option value="incompletos">Incompletos</option>
        </select>
      </div>

      {filtrados.length === 0 ? (
        <p className="text-gray-600 text-center">
          No hay submissions que coincidan con tu búsqueda.
        </p>
      ) : (
        <ul className="space-y-4">
          {filtrados.map((sub) => {
            const isDone =
              sub.resultado?.every((r: string) => r.includes("✅")) ?? false;
            return (
              <li
                key={sub.id}
                className="border p-4 rounded bg-white shadow-sm hover:shadow-md transition"
              >
                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    <strong>Fecha:</strong>{" "}
                    {new Date(sub.created_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Usuario:</strong>{" "}
                    {sub.user?.email ?? (
                      <span className="text-gray-500 italic">Desconocido</span>
                    )}
                  </p>
                  <p>
                    <strong>Reto:</strong>{" "}
                    {sub.challenge?.titulo ?? (
                      <span className="text-gray-500 italic">
                        Eliminado/No encontrado
                      </span>
                    )}
                  </p>
                  <p>
                    <strong>Resultado:</strong>{" "}
                    {isDone ? (
                      <span className="text-green-600 font-semibold">
                        ✔ Completado
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">
                        ✘ Incompleto
                      </span>
                    )}
                  </p>
                </div>
                <pre className="mt-3 bg-gray-100 p-3 rounded text-sm overflow-x-auto font-mono">
                  {sub.codigo ?? ""}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
