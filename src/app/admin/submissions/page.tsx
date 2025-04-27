"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Submission } from "@/types";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useRouter } from "next/navigation";

type FetchedSubmission = {
  id: string | number;
  created_at: string;
  codigo: string | null;
  resultado: string[] | null;
  user_id: string;
  challenge_id: string | number;
  user: { email: string } | null;
  challenges: { titulo: string } | null;
};

type MappedSubmission = Omit<Submission, "user" | "challenge"> & {
  user: { email: string } | null;
  challenge: { titulo: string } | null;
};

export default function SubmissionsAdminPage() {
  const { user, loading: authLoading, error: authError } = useAuthUser();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(true);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<MappedSubmission[]>([]);
  const [busquedaEmail, setBusquedaEmail] = useState("");
  const [busquedaReto, setBusquedaReto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "todos" | "completados" | "incompletos"
  >("todos");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const pageLoading = authLoading || checkingAdmin || (isAdmin && fetchLoading);
  const pageError = authError || adminCheckError || fetchError;

  useEffect(() => {
    setIsAdmin(false);
    setCheckingAdmin(true);
    setAdminCheckError(null);

    if (authLoading) return;

    if (!user) {
      setCheckingAdmin(false);
      router.push("/login?error=Acceso denegado.");
      return;
    }

    async function checkAdminStatus() {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("public_user_profiles")
          .select("is_admin")
          .eq("id", user!.id)
          .single();

        if (profileError) throw profileError;

        if (profile && profile.is_admin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push("/?error=Acceso denegado.");
        }
      } catch (err: unknown) {
        console.error("Error checking admin status:", err);
        let message = "Error al verificar permisos de administrador.";
        if (err instanceof Error) message = err.message;
        setAdminCheckError(message);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    }
    checkAdminStatus();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (checkingAdmin || !isAdmin) {
      setFetchLoading(false);
      if (!isAdmin) setSubmissions([]);
      return;
    }

    async function fetchSubmissions() {
      setFetchLoading(true);
      setFetchError(null);

      try {
        const { data, error: queryError } = await supabase
          .from("submissions")
          .select(
            `
            id, created_at, codigo, resultado, user_id, challenge_id,
            user:public_user_profiles ( email ),
            challenges ( titulo )
          `
          )
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;

        const fetchedSubmissions =
          (data as unknown as FetchedSubmission[]) ?? [];
        const formattedData: MappedSubmission[] = fetchedSubmissions.map(
          (item) => ({
            id: item.id,
            created_at: item.created_at,
            codigo: item.codigo ?? "", // Provide default empty string if null
            resultado: item.resultado,
            user_id: item.user_id,
            challenge_id: item.challenge_id,
            user: item.user,
            challenge: item.challenges,
          })
        );
        setSubmissions(formattedData);
      } catch (err: unknown) {
        console.error("Error raw al cargar submissions:", err);
        let errorMessage = "Ocurrió un error desconocido.";
        if (typeof err === "object" && err !== null && "message" in err) {
          errorMessage = String(err.message);
        } else if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }
        setFetchError("No se pudieron cargar las submissions: " + errorMessage);
      } finally {
        setFetchLoading(false);
      }
    }

    fetchSubmissions();
  }, [isAdmin, checkingAdmin]);

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

  if (pageLoading && submissions.length === 0) {
    return (
      <p className="text-center mt-10 text-gray-600 dark:text-gray-400">
        Cargando...
      </p>
    );
  }
  if (pageError && submissions.length === 0) {
    return <p className="text-center mt-10 text-red-600">{pageError}</p>;
  }
  if (!checkingAdmin && !isAdmin) {
    return <p className="text-center mt-10 text-red-600">Acceso denegado.</p>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 dark:text-gray-200">
      <h1 className="text-2xl font-bold mb-6">📊 Submissions de usuarios</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por email"
          value={busquedaEmail}
          onChange={(e) => setBusquedaEmail(e.target.value)}
          className="border p-2 rounded w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
        <input
          type="text"
          placeholder="Buscar por reto"
          value={busquedaReto}
          onChange={(e) => setBusquedaReto(e.target.value)}
          className="border p-2 rounded w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
        <select
          value={filtroEstado}
          onChange={(e) =>
            setFiltroEstado(
              e.target.value as "todos" | "completados" | "incompletos"
            )
          }
          className="border p-2 rounded w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="todos">Todos</option>
          <option value="completados">Completados</option>
          <option value="incompletos">Incompletos</option>
        </select>
      </div>

      {fetchError && !fetchLoading && submissions.length > 0 && (
        <p className="text-center text-red-600 mb-4">{fetchError}</p>
      )}

      {fetchLoading && submissions.length > 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
          Actualizando...
        </p>
      )}
      {filtrados.length === 0 && !fetchLoading ? (
        <p className="text-gray-600 dark:text-gray-400 text-center">
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
                className="border p-4 rounded bg-white shadow-sm hover:shadow-md transition dark:bg-gray-800 dark:border-gray-700 dark:hover:shadow-lg dark:hover:shadow-blue-900/20"
              >
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p>
                    <strong>Fecha:</strong>{" "}
                    {new Date(sub.created_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Usuario:</strong>{" "}
                    {sub.user?.email ?? (
                      <span className="text-gray-500 dark:text-gray-400 italic">
                        Desconocido
                      </span>
                    )}
                  </p>
                  <p>
                    <strong>Reto:</strong>{" "}
                    {sub.challenge?.titulo ?? (
                      <span className="text-gray-500 dark:text-gray-400 italic">
                        Eliminado/No encontrado
                      </span>
                    )}
                  </p>
                  <p>
                    <strong>Resultado:</strong>{" "}
                    {isDone ? (
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        ✔ Completado
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">
                        ✘ Incompleto
                      </span>
                    )}
                  </p>
                </div>
                <pre className="mt-3 bg-gray-100 dark:bg-gray-900 dark:text-gray-300 p-3 rounded text-sm overflow-x-auto font-mono">
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
