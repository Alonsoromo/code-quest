"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Challenge {
  id: string;
  titulo: string;
  descripcion: string;
  lenguaje: string;
  nivel: string;
  etiquetas: string[];
  codigo_base: string;
  test_cases: { input: unknown[]; output: unknown }[];
}

const etiquetasDisponibles = [
  "arrays",
  "strings",
  "bucles",
  "condicionales",
  "objetos",
  "recursividad",
];

export default function RetosAdminPage() {
  const [retos, setRetos] = useState<Challenge[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Challenge>>({});
  const [testCasesRaw, setTestCasesRaw] = useState("");

  useEffect(() => {
    const cargarRetos = async () => {
      const { data, error } = await supabase.from("challenges").select("*");
      if (error) {
        console.error("Error al cargar retos:", error);
      } else {
        setRetos(data || []);
      }
    };
    cargarRetos();
  }, []);

  const eliminarReto = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este reto?")) return;
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) {
      console.error("Error al eliminar reto:", error);
    } else {
      setRetos(retos.filter((r) => r.id !== id));
    }
  };

  const empezarEdicion = (reto: Challenge) => {
    setEditandoId(reto.id);
    setForm({ ...reto });
    setTestCasesRaw(JSON.stringify(reto.test_cases, null, 2));
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm({});
    setTestCasesRaw("");
  };

  const toggleEtiqueta = (etiqueta: string) => {
    setForm((prev) => {
      const etiquetas = prev.etiquetas || [];
      return {
        ...prev,
        etiquetas: etiquetas.includes(etiqueta)
          ? etiquetas.filter((e) => e !== etiqueta)
          : [...etiquetas, etiqueta],
      };
    });
  };

  const guardarCambios = async () => {
    if (!editandoId) return;
    try {
      // Parsear y validar test cases
      const parsed = JSON.parse(testCasesRaw);
      if (!Array.isArray(parsed))
        throw new Error("Los test cases deben ser un array");

      // Preparar datos de actualización
      const updateData = {
        titulo: form.titulo!,
        descripcion: form.descripcion!,
        lenguaje: form.lenguaje!,
        nivel: form.nivel!,
        etiquetas: form.etiquetas!,
        codigo_base: form.codigo_base!,
        test_cases: parsed,
      };

      console.log("🔧 updateData:", updateData);
      const { error } = await supabase
        .from("challenges")
        .update(updateData)
        .eq("id", editandoId);

      if (error) {
        console.error("Error al guardar reto:", error);
        alert("❌ Error al guardar reto: " + error.message);
        return;
      }

      // Actualizar estado local y cancelar edición
      setRetos(
        retos.map((r) =>
          r.id === editandoId ? ({ ...r, ...updateData } as Challenge) : r
        )
      );
      cancelarEdicion();
    } catch (e) {
      console.error("Excepción al guardar reto:", e);
      alert("❌ Error al guardar reto: " + (e as Error).message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🛠 Editar retos existentes</h1>

      {retos.map((reto) => (
        <div key={reto.id} className="border p-4 rounded mb-4 bg-white">
          {editandoId === reto.id ? (
            <>
              <input
                value={form.titulo || ""}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full p-2 border rounded mb-2"
                placeholder="Título"
              />
              <textarea
                value={form.descripcion || ""}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                className="w-full p-2 border rounded mb-2"
                placeholder="Descripción del reto"
              />
              <select
                value={form.lenguaje || "javascript"}
                onChange={(e) => setForm({ ...form, lenguaje: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
              </select>
              <select
                value={form.nivel || "Fácil"}
                onChange={(e) => setForm({ ...form, nivel: e.target.value })}
                className="w-full p-2 border rounded mb-2"
              >
                <option value="Fácil">Fácil</option>
                <option value="Media">Media</option>
                <option value="Difícil">Difícil</option>
              </select>
              <div className="flex flex-wrap gap-2 mb-2">
                {etiquetasDisponibles.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleEtiqueta(tag)}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      form.etiquetas?.includes(tag)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
              <textarea
                value={form.codigo_base || ""}
                onChange={(e) =>
                  setForm({ ...form, codigo_base: e.target.value })
                }
                className="w-full p-2 border rounded font-mono h-32 mb-2"
                placeholder="Código base"
              />
              <textarea
                value={testCasesRaw}
                onChange={(e) => setTestCasesRaw(e.target.value)}
                className="w-full p-2 border rounded font-mono h-32 mb-2"
                placeholder="Test cases en formato JSON"
              />
              <button
                onClick={guardarCambios}
                className="bg-blue-600 text-white px-4 py-1 rounded mr-2"
              >
                Guardar
              </button>
              <button
                onClick={cancelarEdicion}
                className="text-red-600 hover:underline"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{reto.titulo}</h2>
              <p className="text-sm text-gray-600">{reto.descripcion}</p>
              <p className="text-sm text-gray-600">
                Lenguaje: {reto.lenguaje} | Nivel: {reto.nivel}
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {reto.etiquetas.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <pre className="bg-gray-100 p-2 mt-2 rounded text-sm text-gray-800 overflow-x-auto">
                {reto.codigo_base}
              </pre>
              <pre className="bg-gray-50 p-2 mt-2 rounded text-sm text-gray-800 overflow-x-auto">
                {JSON.stringify(reto.test_cases, null, 2)}
              </pre>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => empezarEdicion(reto)}
                  className="text-blue-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminarReto(reto.id)}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
