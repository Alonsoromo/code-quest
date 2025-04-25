"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("react-simple-code-editor"), {
  ssr: false,
});
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css";

interface TestCase {
  input: unknown[];
  output: unknown;
}

interface Challenge {
  id: string;
  titulo: string;
  descripcion: string;
  lenguaje: string;
  codigo_base: string;
  test_cases: TestCase[];
}

export default function RetoPage() {
  const { id } = useParams();
  const [reto, setReto] = useState<Challenge | null>(null);
  const [codigo, setCodigo] = useState<string>("");
  const [salida, setSalida] = useState<string[]>([]);
  const [resuelto, setResuelto] = useState<boolean>(false);

  useEffect(() => {
    async function fetchReto() {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching challenge:", error);
        return;
      }

      setReto(data);
      setCodigo(data.codigo_base);

      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) return;

      const { data: submissions, error: submissionsError } = await supabase
        .from("submissions")
        .select("codigo, resultado")
        .eq("user_id", user.id)
        .eq("challenge_id", data.id)
        .order("created_at", { ascending: false });

      if (submissionsError) {
        console.error("Error fetching submissions:", submissionsError);
        return;
      }

      if (submissions && submissions.length > 0) {
        const ultima = submissions[0];
        const completo = ultima.resultado.every((r: string) =>
          r.includes("✅")
        );
        if (completo) {
          setResuelto(true);
          setCodigo(ultima.codigo);
        }
      }
    }

    fetchReto();
  }, [id]);

  const ejecutar = async () => {
    if (!reto || resuelto) return;

    const resultados: string[] = [];
    try {
      const funcion = new Function("return " + codigo)();
      reto.test_cases.forEach(({ input, output }, index) => {
        const res = funcion(...input);
        const correcto = res === output;
        resultados.push(
          `Caso ${index + 1}: ${
            correcto ? "✅" : `❌ Esperado ${output}, recibido ${res}`
          }`
        );
      });
    } catch (e) {
      resultados.push(
        `⚠️ Error al ejecutar el código: ${(e as Error).message}`
      );
    }

    // Actualiza el estado de salida antes de realizar la inserción
    setSalida([...resultados]);

    const { data: session } = await supabase.auth.getUser();
    const user = session?.user;
    if (!user) return;

    const { error } = await supabase.from("submissions").insert([
      {
        user_id: user.id,
        challenge_id: reto.id,
        codigo,
        resultado: resultados,
      },
    ]);
    if (error) console.error("Error saving submission:", error);

    const completo = resultados.every((r) => r.includes("✅"));
    if (completo) setResuelto(true);
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      {reto ? (
        <>
          <h1 className="text-3xl font-bold mb-2">{reto.titulo}</h1>
          <p className="text-gray-700 mb-4">{reto.descripcion}</p>
          {resuelto && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded shadow">
              ✅ ¡Ya resolviste este reto con éxito!
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-700 mb-4">Cargando reto...</p>
      )}

      <Editor
        value={codigo}
        onValueChange={setCodigo}
        highlight={(code) =>
          highlight(code, languages.javascript, "javascript")
        }
        padding={10}
        className="border rounded bg-white font-mono mb-4"
        style={{ minHeight: "200px", fontSize: 14 }}
        disabled={resuelto}
      />

      <button
        onClick={ejecutar}
        className={`px-4 py-2 rounded text-white ${
          resuelto
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
        }`}
        disabled={resuelto}
      >
        Ejecutar código
      </button>

      {salida.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Resultados:</h2>
          <ul className="list-disc pl-6 space-y-1">
            {salida.map((linea, i) => (
              <li key={i} data-testid={`resultado-${i}`}>
                {linea}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
