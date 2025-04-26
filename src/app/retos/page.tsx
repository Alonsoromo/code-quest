"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Challenge } from "@/types";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useUserSubmissions } from "@/lib/hooks/useUserSubmissions";

export default function RetosPage() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuthUser();
  const {
    submissions: userSubmissions,
    loading: subsLoading,
    error: subsError,
  } = useUserSubmissions();

  const [retosLoading, setRetosLoading] = useState(true);
  const [retosError, setRetosError] = useState<string | null>(null);
  const [retos, setRetos] = useState<Challenge[]>([]);
  const [completados, setCompletados] = useState<Set<number | string>>(
    new Set()
  );
  const [busqueda, setBusqueda] = useState("");
  const [lenguajeFiltro, setLenguajeFiltro] = useState<"Todos" | string>(
    "Todos"
  );
  const [etiquetaActiva, setEtiquetaActiva] = useState<string | null>(null);
  const [lenguajes, setLenguajes] = useState<string[]>([]);
  const [etiquetasUnicas, setEtiquetasUnicas] = useState<string[]>([]);
  const [orden, setOrden] = useState<"asc" | "desc">("asc");

  const loading = authLoading || subsLoading || retosLoading;
  const error = authError || subsError || retosError;

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login?error=Necesitas iniciar sesión para ver los retos");
      return;
    }

    async function fetchChallenges() {
      setRetosLoading(true);
      setRetosError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("challenges")
          .select("id, titulo, lenguaje, nivel, etiquetas");

        if (fetchError) throw fetchError;

        const retosData = (data as Challenge[]) || [];
        setRetos(retosData);

        const únicosLeng = Array.from(
          new Set(retosData.map((ch) => ch.lenguaje).filter(Boolean))
        );
        setLenguajes(["Todos", ...únicosLeng.sort()]);

        const tagsSet = new Set<string>();
        retosData.forEach((ch) =>
          ch.etiquetas?.forEach((tag) => tagsSet.add(tag))
        );
        setEtiquetasUnicas(Array.from(tagsSet).sort());
      } catch (err: unknown) {
        console.error("Error cargando retos:", err);
        let message = "Error cargando retos.";
        if (err instanceof Error) message = err.message;
        setRetosError(message);
      } finally {
        setRetosLoading(false);
      }
    }

    fetchChallenges();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (subsLoading || !userSubmissions) return;

    const idsCompletados = userSubmissions
      .filter((sub) => sub.resultado?.every((r: string) => r.includes("✅")))
      .map((sub) => sub.challenge_id);
    setCompletados(new Set(idsCompletados));
  }, [userSubmissions, subsLoading]);

  const retosFiltrados = useMemo(() => {
    return retos
      .filter(({ titulo, lenguaje, etiquetas }) => {
        const tags = etiquetas || [];
        const byTitle = titulo.toLowerCase().includes(busqueda.toLowerCase());
        const byLang =
          lenguajeFiltro === "Todos" || lenguaje === lenguajeFiltro;
        const byTag = !etiquetaActiva || tags.includes(etiquetaActiva);
        return byTitle && byLang && byTag;
      })
      .sort((a, b) => {
        const niveles: Challenge["nivel"][] = ["Fácil", "Medio", "Difícil"];
        const diff = niveles.indexOf(a.nivel) - niveles.indexOf(b.nivel);
        return orden === "asc" ? diff : -diff;
      });
  }, [retos, busqueda, lenguajeFiltro, etiquetaActiva, orden]);

  if (loading && retos.length === 0) {
    return <p className="text-center mt-10">Cargando...</p>;
  }

  if (error && retos.length === 0) {
    return <p className="text-center mt-10 text-red-500">{error}</p>;
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">📚 Retos disponibles</h1>

      <div className="grid sm:grid-cols-3 gap-4 items-end">
        <div>
          <label
            htmlFor="search-title"
            className="block text-sm font-medium mb-1"
          >
            Buscar por título
          </label>
          <input
            id="search-title"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="ej. suma, array..."
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label
            htmlFor="lang-filter"
            className="block text-sm font-medium mb-1"
          >
            Filtrar por lenguaje
          </label>
          <select
            id="lang-filter"
            value={lenguajeFiltro}
            onChange={(e) => setLenguajeFiltro(e.target.value)}
            className="w-full border p-2 rounded"
          >
            {lenguajes.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="sort-order"
            className="block text-sm font-medium mb-1"
          >
            Ordenar por Dificultad
          </label>
          <select
            id="sort-order"
            value={orden}
            onChange={(e) => setOrden(e.target.value as "asc" | "desc")}
            className="w-full border p-2 rounded"
          >
            <option value="asc">Fácil → Difícil</option>
            <option value="desc">Difícil → Fácil</option>
          </select>
        </div>
      </div>

      {etiquetasUnicas.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-sm font-medium mr-2">
            Filtrar por etiqueta:
          </span>
          {etiquetasUnicas.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setEtiquetaActiva(tag === etiquetaActiva ? null : tag)
              }
              className={`px-3 py-1 rounded-full border text-sm transition ${
                etiquetaActiva === tag
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              #{tag}
            </button>
          ))}
          {etiquetaActiva && (
            <button
              onClick={() => setEtiquetaActiva(null)}
              className="text-sm text-red-600 hover:underline ml-2"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {retosFiltrados.length === 0 ? (
          <li key="no-retos" className="text-gray-600 text-center pt-4">
            No hay retos que coincidan con tus filtros.
          </li>
        ) : (
          retosFiltrados.map((reto) => (
            <li
              key={reto.id}
              className="border p-4 rounded shadow hover:shadow-md transition bg-white"
            >
              <div className="flex-1 mb-3 sm:mb-0">
                <h2 className="text-xl font-semibold text-gray-800">
                  {reto.titulo}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Lenguaje: <span className="font-medium">{reto.lenguaje}</span>{" "}
                  | Nivel: <span className="font-medium">{reto.nivel}</span>
                </p>
                {reto.etiquetas && reto.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {reto.etiquetas.map((et) => (
                      <span
                        key={et}
                        className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full"
                      >
                        #{et}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href={`/retos/${reto.id}`}
                className={`shrink-0 inline-block px-4 py-2 rounded text-white font-semibold transition ${
                  completados.has(reto.id)
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {completados.has(reto.id) ? "👀 Ver Solución" : "🚀 Intentar"}
              </Link>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
