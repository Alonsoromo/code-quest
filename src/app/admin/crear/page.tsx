"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const etiquetasDisponibles = [
  "arrays",
  "strings",
  "bucles",
  "condicionales",
  "objetos",
  "recursividad",
];

export default function CrearRetoPage() {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lenguaje, setLenguaje] = useState("javascript");
  const [nivel, setNivel] = useState("Fácil");
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [codigoBase, setCodigoBase] = useState("");
  const [testCasesRaw, setTestCasesRaw] = useState("");
  const [mensaje, setMensaje] = useState("");

  const toggleEtiqueta = (etiqueta: string) => {
    setEtiquetas((prev) =>
      prev.includes(etiqueta)
        ? prev.filter((e) => e !== etiqueta)
        : [...prev, etiqueta]
    );
  };

  const guardarReto = async () => {
    setMensaje("");
    try {
      // 1. Verificar sesión de usuario
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) throw new Error("Debes iniciar sesión para crear retos.");

      // 2. Verificar permisos de admin
      const { data: admin, error: errAdmin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      console.log("🛡️ admin check", { admin, errAdmin });
      if (errAdmin)
        throw new Error("Error comprobando permisos de administrador.");
      if (!admin) throw new Error("No tienes permisos para crear retos.");

      // 3. Parsear test cases
      const testCasesParsed = JSON.parse(testCasesRaw);
      if (!Array.isArray(testCasesParsed))
        throw new Error("Los test cases deben ser un array");

      // 4. Insertar reto en Supabase
      const { error } = await supabase.from("challenges").insert({
        titulo,
        descripcion,
        lenguaje,
        nivel,
        etiquetas,
        codigo_base: codigoBase,
        test_cases: testCasesParsed,
      });
      if (error) throw error;

      setMensaje("✅ Reto creado exitosamente");
      // Limpiar campos (opcional)
      setTitulo("");
      setDescripcion("");
      setLenguaje("javascript");
      setNivel("Fácil");
      setEtiquetas([]);
      setCodigoBase("");
      setTestCasesRaw("");
    } catch (e) {
      setMensaje("❌ Error: " + (e as Error).message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Crear nuevo reto</h1>

      <label className="block mb-2 font-semibold">Título</label>
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full border p-2 mb-4 rounded"
      />

      <label className="block mb-2 font-semibold">Descripción</label>
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="w-full border p-2 mb-4 rounded h-24"
      />

      <label className="block mb-2 font-semibold">Lenguaje</label>
      <select
        value={lenguaje}
        onChange={(e) => setLenguaje(e.target.value)}
        className="w-full border p-2 mb-4 rounded"
      >
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
      </select>

      <label className="block mb-2 font-semibold">Nivel</label>
      <select
        value={nivel}
        onChange={(e) => setNivel(e.target.value)}
        className="w-full border p-2 mb-4 rounded"
      >
        <option value="Fácil">Fácil</option>
        <option value="Media">Media</option>
        <option value="Difícil">Difícil</option>
      </select>

      <label className="block mb-2 font-semibold">Etiquetas</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {etiquetasDisponibles.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleEtiqueta(tag)}
            className={`px-3 py-1 rounded-full text-sm border ${
              etiquetas.includes(tag)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      <label className="block mb-2 font-semibold">Código base</label>
      <textarea
        value={codigoBase}
        onChange={(e) => setCodigoBase(e.target.value)}
        className="w-full border p-2 mb-4 rounded h-40 font-mono"
      />

      <label className="block mb-2 font-semibold">
        Test cases (en formato JSON)
      </label>
      <textarea
        value={testCasesRaw}
        onChange={(e) => setTestCasesRaw(e.target.value)}
        placeholder='[
  { "input": [2, 3], "output": 5 },
  { "input": [-1, 1], "output": 0 }
]'
        className="w-full border p-2 mb-4 rounded h-40 font-mono"
      />

      <button
        onClick={guardarReto}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Guardar reto
      </button>

      {mensaje && <p className="mt-4 font-semibold text-center">{mensaje}</p>}
    </div>
  );
}
