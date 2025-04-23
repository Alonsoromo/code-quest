"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Submission {
  id: string;
  created_at: string;
  codigo: string;
  resultado: string[];
  user: { email: string } | null;
  challenge: { titulo: string } | null;
}

// Raw data returned by Supabase
interface RawSubmission {
  id: string;
  created_at: string;
  codigo: string;
  resultado: string[];
  user: { email: string }[] | null;
  challenge: { titulo: string }[] | null;
}

export default function SubmissionsAdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [busquedaEmail, setBusquedaEmail] = useState("");
  const [busquedaReto, setBusquedaReto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "todos" | "completados" | "incompletos"
  >("todos");

  useEffect(() => {
    async function fetchSubmissions() {
      const { data, error } = await supabase
        .from("submissions")
        .select(
          `id, created_at, codigo, resultado, ` +
            `user:public_user_profiles(email), ` +
            `challenge:challenges!submissions_challenge_id_fkey(titulo)`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al cargar submissions:", error);
        return;
      }
      if (!data) {
        console.warn("No se recibieron datos de submissions");
        return;
      }

      // Normalize arrays to single objects
      const normalized = (data as unknown as RawSubmission[]).map((item) => ({
        id: item.id,
        created_at: item.created_at,
        codigo: item.codigo,
        resultado: item.resultado,
        user:
          Array.isArray(item.user) && item.user.length > 0
            ? item.user[0]
            : null,
        challenge:
          Array.isArray(item.challenge) && item.challenge.length > 0
            ? item.challenge[0]
            : null,
      }));
      setSubmissions(normalized);
    }

    fetchSubmissions();
  }, []);

  // Filter logic
  const filtrados = submissions.filter((sub) => {
    const email = sub.user?.email.toLowerCase() || "";
    const titulo = sub.challenge?.titulo.toLowerCase() || "";
    const coincideEmail = email.includes(busquedaEmail.toLowerCase());
    const coincideReto = titulo.includes(busquedaReto.toLowerCase());
    const completado = sub.resultado.every((r) => r.includes("✅"));

    if (filtroEstado === "completados" && !completado) return false;
    if (filtroEstado === "incompletos" && completado) return false;
    return coincideEmail && coincideReto;
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Submissions de usuarios</h1>

      {/* Filtros */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por email"
          value={busquedaEmail}
          onChange={(e) => setBusquedaEmail(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Buscar por reto"
          value={busquedaReto}
          onChange={(e) => setBusquedaReto(e.target.value)}
          className="border p-2 rounded"
        />
        <select
          value={filtroEstado}
          onChange={(e) =>
            setFiltroEstado(
              e.target.value as "todos" | "completados" | "incompletos"
            )
          }
          className="border p-2 rounded"
        >
          <option value="todos">Todos</option>
          <option value="completados">Completados</option>
          <option value="incompletos">Incompletos</option>
        </select>
      </div>

      {/* Lista de submissions */}
      {filtrados.length === 0 ? (
        <p className="text-gray-600">
          No hay submissions que coincidan con tu búsqueda.
        </p>
      ) : (
        <ul className="space-y-4">
          {filtrados.map((sub) => (
            <li key={sub.id} className="border p-4 rounded bg-white">
              <p className="text-sm text-gray-500">
                <strong>Fecha:</strong>{" "}
                {new Date(sub.created_at).toLocaleString()}
                <br />
                <strong>Usuario:</strong> {sub.user?.email || "Desconocido"}
                <br />
                <strong>Reto:</strong> {sub.challenge?.titulo || "Eliminado"}
                <br />
                <strong>Resultado:</strong>{" "}
                {sub.resultado.every((r) => r.includes("✅")) ? (
                  <span className="text-green-600 font-semibold">
                    ✔ Completado
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold">
                    ✘ Incompleto
                  </span>
                )}
              </p>
              <pre className="mt-2 bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {sub.codigo}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
