"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Challenge, TestCase } from "@/types";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useRouter } from "next/navigation";

const etiquetasDisponibles = [
  "arrays",
  "strings",
  "bucles",
  "condicionales",
  "objetos",
  "recursividad",
];

const initialFormState: Partial<Challenge> = {
  titulo: "",
  descripcion: "",
  lenguaje: "javascript",
  nivel: "Fácil",
  etiquetas: [],
  codigo_base: "",
  test_cases: [],
};

export default function CrearRetoPage() {
  const { user, loading: authLoading, error: authError } = useAuthUser();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(true);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Challenge>>(initialFormState);
  const [testCasesRaw, setTestCasesRaw] = useState<string>("");
  const [mensaje, setMensaje] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const pageLoading = authLoading || checkingAdmin;
  const pageError = authError || adminCheckError;

  useEffect(() => {
    setIsAdmin(false);
    setCheckingAdmin(true);
    setAdminCheckError(null);

    if (authLoading) {
      return;
    }

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

        if (profileError) {
          if (profileError.code === "42501") {
            throw new Error("No tienes permisos para verificar el rol (RLS).");
          }
          throw profileError;
        }

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
    if (!checkingAdmin && !isAdmin) {
      setForm(initialFormState);
      setTestCasesRaw("");
      setMensaje("");
    }
  }, [isAdmin, checkingAdmin]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name === "dificultad" ? "nivel" : name;
    setForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  const toggleEtiqueta = (etiqueta: string) => {
    setForm((prev) => {
      const etiquetas = prev.etiquetas || [];
      const newEtiquetas = etiquetas.includes(etiqueta)
        ? etiquetas.filter((e) => e !== etiqueta)
        : [...etiquetas, etiqueta];
      return { ...prev, etiquetas: newEtiquetas };
    });
  };

  const handleTestCasesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTestCasesRaw(e.target.value);
  };

  const guardarReto = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setMensaje("❌ Error: No tienes permisos para crear retos.");
      return;
    }
    setMensaje("");
    setActionLoading(true);

    let parsedTestCases: TestCase[] = [];
    try {
      try {
        parsedTestCases = testCasesRaw.trim() ? JSON.parse(testCasesRaw) : [];
        if (!Array.isArray(parsedTestCases)) {
          throw new Error("Los test cases deben ser un array JSON válido.");
        }
      } catch (parseError) {
        throw new Error(
          "Error en el formato JSON de los test cases: " +
            (parseError as Error).message
        );
      }
      const challengeData: Omit<Challenge, "id" | "created_at"> = {
        titulo: form.titulo || "",
        descripcion: form.descripcion || "",
        lenguaje: form.lenguaje || "javascript",
        nivel: form.nivel || "Fácil",
        etiquetas: form.etiquetas || [],
        codigo_base: form.codigo_base || "",
        test_cases: parsedTestCases,
      };
      if (
        !challengeData.titulo ||
        !challengeData.descripcion ||
        !challengeData.lenguaje ||
        !challengeData.nivel
      ) {
        throw new Error(
          "Por favor, completa todos los campos requeridos (Título, Descripción, Lenguaje, Dificultad)."
        );
      }
      const { error: insertError } = await supabase
        .from("challenges")
        .insert(challengeData);
      if (insertError) {
        if (insertError.code === "42501") {
          throw new Error("No tienes permisos para crear retos (RLS).");
        }
        throw insertError;
      }
      setMensaje("✅ Reto creado exitosamente!");
      setForm(initialFormState);
      setTestCasesRaw("");
    } catch (err: unknown) {
      console.error("Error al guardar reto:", err);
      let errorMessage = "Ocurrió un error inesperado.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setMensaje("❌ Error: " + errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <p className="text-center mt-10 text-gray-600">Verificando permisos...</p>
    );
  }
  if (pageError) {
    return <p className="text-center mt-10 text-red-600">{pageError}</p>;
  }
  if (!isAdmin) {
    return <p className="text-center mt-10 text-red-600">Acceso denegado.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Crear Nuevo Reto</h1>
      <form onSubmit={guardarReto} className="space-y-4">
        <div>
          <label htmlFor="titulo" className="block mb-1 font-semibold">
            Título
          </label>
          <input
            id="titulo"
            name="titulo"
            type="text"
            value={form.titulo || ""}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="block mb-1 font-semibold">
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={form.descripcion || ""}
            onChange={handleInputChange}
            className="w-full border p-2 rounded h-24"
            required
          />
        </div>

        <div>
          <label htmlFor="lenguaje" className="block mb-1 font-semibold">
            Lenguaje
          </label>
          <select
            id="lenguaje"
            name="lenguaje"
            value={form.lenguaje || "javascript"}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>

        <div>
          <label htmlFor="dificultad" className="block mb-1 font-semibold">
            Dificultad
          </label>
          <select
            id="dificultad"
            name="dificultad"
            value={form.nivel || "Fácil"}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="Fácil">Fácil</option>
            <option value="Medio">Medio</option>
            <option value="Difícil">Difícil</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">Etiquetas</label>
          <div className="flex flex-wrap gap-2">
            {etiquetasDisponibles.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleEtiqueta(tag)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  form.etiquetas?.includes(tag)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="codigo_base" className="block mb-1 font-semibold">
            Código Base (Opcional)
          </label>
          <textarea
            id="codigo_base"
            name="codigo_base"
            value={form.codigo_base || ""}
            onChange={handleInputChange}
            className="w-full border p-2 rounded h-40 font-mono"
          />
        </div>

        <div>
          <label htmlFor="testCasesRaw" className="block mb-1 font-semibold">
            Test Cases (en formato JSON)
          </label>
          <textarea
            id="testCasesRaw"
            value={testCasesRaw}
            onChange={handleTestCasesChange}
            placeholder={`[
  { "input": [2, 3], "output": 5 },
  { "input": [-1, 1], "output": 0 }
]`}
            className="w-full border p-2 rounded h-40 font-mono"
            required
          />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={actionLoading}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? "Guardando..." : "Guardar Reto"}
          </button>
          {mensaje && (
            <p
              className={`font-semibold ${
                mensaje.startsWith("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {mensaje}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
