"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
// Importa los tipos centralizados
import { Challenge, Submission } from "@/types";

const Editor = dynamic(() => import("react-simple-code-editor"), {
  ssr: false,
});
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-javascript"; // Asegúrate de importar los lenguajes necesarios
import "prismjs/components/prism-python"; // Ejemplo si soportas Python
import "prismjs/themes/prism-okaidia.css"; // Cambia el tema si lo deseas

// Define un tipo para los datos de submission que necesitas aquí
type SubmissionData = Pick<Submission, "codigo" | "resultado">;

export default function RetoPage() {
  const params = useParams();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;

  const [reto, setReto] = useState<Challenge | null>(null);
  const [codigo, setCodigo] = useState<string>("");
  const [salida, setSalida] = useState<string[]>([]);
  const [resuelto, setResuelto] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ejecutando, setEjecutando] = useState<boolean>(false);

  useEffect(() => {
    setReto(null);
    setCodigo("");
    setSalida([]);
    setResuelto(false);
    setLoading(true);
    setError(null);

    if (!idParam) {
      setError("ID del reto no encontrado.");
      setLoading(false);
      return;
    }

    const challengeId = idParam;

    async function fetchReto() {
      try {
        const { data: challengeData, error: challengeError } = await supabase
          .from("challenges")
          .select("id, titulo, descripcion, lenguaje, codigo_base, test_cases")
          .eq("id", challengeId)
          .single();

        if (challengeError) throw challengeError;
        if (!challengeData) throw new Error("Reto no encontrado.");

        const fetchedReto = challengeData as Challenge;
        setReto(fetchedReto);
        setCodigo(fetchedReto.codigo_base ?? "");

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: submissions, error: submissionsError } = await supabase
            .from("submissions")
            .select("codigo, resultado")
            .eq("user_id", user.id)
            .eq("challenge_id", fetchedReto.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (submissionsError) {
            console.error("Error fetching submissions:", submissionsError);
          } else if (submissions && submissions.length > 0) {
            const ultima = submissions[0] as SubmissionData;
            const completo =
              ultima.resultado?.every((r: string) => r.includes("✅")) ?? false;
            if (completo) {
              setResuelto(true);
              setCodigo(ultima.codigo ?? fetchedReto.codigo_base ?? "");
              setSalida(ultima.resultado ?? []);
            }
          }
        }
      } catch (err: unknown) {
        console.error("Error fetching challenge data:", err);
        if (err instanceof Error) {
          setError(err.message || "Error al cargar el reto.");
        } else {
          setError("Ocurrió un error desconocido al cargar el reto.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchReto();
  }, [idParam]);

  const ejecutar = async () => {
    if (!reto || resuelto || ejecutando) return;

    setEjecutando(true);
    setSalida(["Ejecutando..."]);

    const resultados: string[] = [];
    try {
      if (!Array.isArray(reto.test_cases)) {
        throw new Error("Formato de test cases inválido.");
      }

      const funcion = new Function("return " + codigo)();

      reto.test_cases.forEach((testCase, index) => {
        if (
          !testCase ||
          !Array.isArray(testCase.input) ||
          typeof testCase.output === "undefined"
        ) {
          resultados.push(`Caso ${index + 1}: ⚠️ Formato inválido`);
          return;
        }
        const { input, output } = testCase;
        try {
          const res = funcion(...input);
          const correcto = JSON.stringify(res) === JSON.stringify(output);
          resultados.push(
            `Caso ${index + 1}: ${
              correcto
                ? "✅ Correcto"
                : `❌ Esperado ${JSON.stringify(
                    output
                  )}, recibido ${JSON.stringify(res)}`
            }`
          );
        } catch (runError) {
          resultados.push(
            `Caso ${index + 1}: ⚠️ Error en ejecución: ${
              (runError as Error).message
            }`
          );
        }
      });
    } catch (e) {
      resultados.push(
        `⚠️ Error al preparar o ejecutar el código: ${(e as Error).message}`
      );
    }

    setSalida(resultados);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && reto) {
      const { error: insertError } = await supabase.from("submissions").insert([
        {
          user_id: user.id,
          challenge_id: reto.id,
          codigo,
          resultado: resultados,
        },
      ]);
      if (insertError) {
        console.error("Error saving submission:", insertError);
        setSalida((prev) => [...prev, "⚠️ Error al guardar el intento."]);
      }
    }

    const completo = resultados.every((r) => r.includes("✅"));
    if (completo) {
      setResuelto(true);
    }

    setEjecutando(false);
  };

  const prismLanguage =
    reto?.lenguaje === "python" ? languages.python : languages.javascript;
  const prismLangString = reto?.lenguaje === "python" ? "python" : "javascript";

  if (loading) {
    return <p className="text-center mt-10">Cargando reto...</p>;
  }

  if (error) {
    return <p className="text-center mt-10 text-red-500">{error}</p>;
  }

  if (!reto) {
    return (
      <p className="text-center mt-10 text-gray-600">Reto no disponible.</p>
    );
  }

  return (
    <main className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{reto.titulo}</h1>
        <div className="prose prose-sm sm:prose-base max-w-none max-h-60 overflow-y-auto p-3 border rounded bg-gray-50">
          <p>{reto.descripcion}</p>
        </div>
        {resuelto && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded shadow text-center font-semibold">
            ✅ ¡Ya resolviste este reto con éxito!
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-lg font-semibold mb-2">
          Tu Código ({prismLangString})
        </label>
        <Editor
          value={codigo}
          onValueChange={setCodigo}
          highlight={(code) => highlight(code, prismLanguage, prismLangString)}
          padding={10}
          className="border rounded bg-gray-800 text-gray-100 font-mono shadow-inner"
          style={{
            minHeight: "250px",
            fontSize: 14,
            outline: "none",
          }}
          disabled={resuelto || ejecutando}
          aria-label="Editor de código"
        />
      </div>

      <button
        onClick={ejecutar}
        className={`w-full sm:w-auto px-6 py-2 rounded text-white font-semibold transition ${
          resuelto || ejecutando
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        disabled={resuelto || ejecutando}
      >
        {ejecutando ? "Ejecutando..." : "Ejecutar y Enviar"}
      </button>

      {salida.length > 0 && (
        <div className="mt-6 p-4 border rounded bg-white shadow">
          <h2 className="text-xl font-semibold mb-3">Resultados:</h2>
          <ul className="space-y-1 text-sm font-mono">
            {salida.map((linea, i) => (
              <li
                key={i}
                data-testid={`resultado-${i}`}
                className={`whitespace-pre-wrap ${
                  linea.includes("✅")
                    ? "text-green-600"
                    : linea.includes("❌")
                    ? "text-red-600"
                    : linea.includes("⚠️")
                    ? "text-yellow-600"
                    : "text-gray-700"
                }`}
              >
                {linea}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
