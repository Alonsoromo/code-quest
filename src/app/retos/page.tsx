"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Challenge {
  id: string;
  titulo: string;
  lenguaje: string;
  nivel: "Fácil" | "Media" | "Difícil";
  etiquetas: string[];
}

interface SubmissionRaw {
  challenge_id: string;
  resultado: string[];
}

export default function RetosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retos, setRetos] = useState<Challenge[]>([]);
  const [completados, setCompletados] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [lenguajeFiltro, setLenguajeFiltro] = useState<"Todos" | string>(
    "Todos"
  );
  const [etiquetaActiva, setEtiquetaActiva] = useState<string | null>(null);
  const [lenguajes, setLenguajes] = useState<string[]>([]);
  const [etiquetasUnicas, setEtiquetasUnicas] = useState<string[]>([]);
  const [orden, setOrden] = useState<"asc" | "desc">("asc");

  // Filtrado y ordenamiento (siempre se ejecuta para mantener orden de hooks)
  const retosFiltrados = useMemo(() => {
    return retos
      .filter(({ titulo, lenguaje, etiquetas }) => {
        const byTitle = titulo.toLowerCase().includes(busqueda.toLowerCase());
        const byLang =
          lenguajeFiltro === "Todos" || lenguaje === lenguajeFiltro;
        const byTag = !etiquetaActiva || etiquetas.includes(etiquetaActiva);
        return byTitle && byLang && byTag;
      })
      .sort((a, b) => {
        const niveles: Challenge["nivel"][] = ["Fácil", "Media", "Difícil"];
        const diff = niveles.indexOf(a.nivel) - niveles.indexOf(b.nivel);
        return orden === "asc" ? diff : -diff;
      });
  }, [retos, busqueda, lenguajeFiltro, etiquetaActiva, orden]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push(
            "/login?error=Necesitas iniciar sesión para ver los retos"
          );
          return;
        }

        const [retosResp, subsResp] = await Promise.all([
          supabase
            .from("challenges")
            .select("id, titulo, lenguaje, nivel, etiquetas"),
          supabase
            .from("submissions")
            .select("challenge_id, resultado")
            .eq("user_id", user.id),
        ]);

        const retosData = retosResp.data as Challenge[];
        setRetos(retosData);

        const únicosLeng = Array.from(
          new Set(retosData.map((ch) => ch.lenguaje))
        );
        setLenguajes(["Todos", ...únicosLeng]);

        const tagsSet = new Set<string>();
        retosData.forEach((ch) =>
          ch.etiquetas.forEach((tag) => tagsSet.add(tag))
        );
        setEtiquetasUnicas(Array.from(tagsSet).sort());

        const subsData = subsResp.data as SubmissionRaw[];
        const ids = subsData
          .filter((sub) => sub.resultado.every((r) => r.includes("✅")))
          .map((sub) => sub.challenge_id);
        setCompletados(new Set(ids));
      } catch (err) {
        console.error(err);
        setError("Error cargando datos");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  if (loading) {
    return <p className="text-center mt-10">Comprobando sesión…</p>;
  }

  if (error) {
    return <p className="text-center mt-10 text-red-500">{error}</p>;
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">📚 Retos disponibles</h1>

      <div className="grid sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">
            Buscar por título
          </label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="ej. suma, array..."
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Filtrar por lenguaje
          </label>
          <select
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
          <label className="block text-sm font-medium mb-1">Ordenar</label>
          <select
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
          {etiquetasUnicas.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setEtiquetaActiva(tag === etiquetaActiva ? null : tag)
              }
              className={`px-3 py-1 rounded-full border transition ${
                etiquetaActiva === tag
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-4">
        {retosFiltrados.length === 0 ? (
          <li key="no-retos" className="text-gray-600">
            No hay retos que coincidan con tus filtros.
          </li>
        ) : (
          retosFiltrados.map((reto) => (
            <li
              key={reto.id}
              className="flex flex-col sm:flex-row items-center justify-between border p-4 rounded shadow hover:shadow-lg transition"
            >
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{reto.titulo}</h2>
                <p className="text-sm text-gray-600">
                  Lenguaje: {reto.lenguaje} | Nivel: {reto.nivel}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {reto.etiquetas.map((et) => (
                    <span
                      key={et}
                      className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full"
                    >
                      #{et}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/retos/${reto.id}`}
                className={`mt-4 sm:mt-0 inline-block px-4 py-2 rounded text-white font-semibold ${
                  completados.has(reto.id)
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {completados.has(reto.id) ? "👀 Ver solución" : "🚀 Intentar"}
              </Link>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
