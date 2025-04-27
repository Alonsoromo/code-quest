"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LeaderboardItem } from "@/types";

export default function RankingPage() {
  const [ranking, setRanking] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      setError(null);
      setRanking([]);

      const { data, error: rpcError } = await supabase.rpc("get_ranking");

      if (rpcError) {
        console.error("Error fetching ranking:", rpcError);
        setError("No se pudo cargar el ranking. Intenta de nuevo más tarde.");
      } else {
        setRanking(data || []);
      }
      setLoading(false);
    }

    fetchRanking();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🏆 Ranking Global</h1>

      {loading ? (
        <p className="text-center mt-10 text-gray-600">Cargando ranking...</p>
      ) : error ? (
        <p className="text-center mt-10 text-red-600">{error}</p>
      ) : ranking.length === 0 ? (
        <p className="text-gray-600 text-center">
          Aún no hay usuarios con retos completados. ¡Sé el primero!
        </p>
      ) : (
        <ol className="space-y-3">
          {ranking.map((user, i) => (
            <li
              key={user.user_id}
              className="border p-4 rounded shadow-md flex items-center justify-between bg-white hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg font-medium text-gray-500 w-6 text-right">
                  {i + 1}.
                </span>
                <div>
                  <p className="font-semibold text-gray-800">
                    {user.email.replace(/(.{3}).+(@.+)/, "$1***$2")}
                  </p>
                  <p className="text-sm text-gray-500">
                    Último completado:{" "}
                    {new Date(user.ultimo_envio).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                {user.completados} ✅
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
