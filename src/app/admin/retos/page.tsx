"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Challenge, TestCase } from "@/types"; // Import TestCase if defined
import { useAuthUser } from "@/lib/hooks/useAuthUser"; // Use the existing hook
import { useRouter } from "next/navigation";

const etiquetasDisponibles = [
  "arrays",
  "strings",
  "bucles",
  "condicionales",
  "objetos",
  "recursividad",
];

export default function RetosAdminPage() {
  const { user, loading: authLoading, error: authError } = useAuthUser();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(true);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);

  const [retos, setRetos] = useState<Challenge[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Challenge>>({});
  const [testCasesRaw, setTestCasesRaw] = useState<string>("");
  const [fetchLoading, setFetchLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const pageLoading = authLoading || checkingAdmin || fetchLoading;
  const pageError = authError || adminCheckError || fetchError;

  useEffect(() => {
    setIsAdmin(false);
    setCheckingAdmin(true);
    setAdminCheckError(null);
    console.log("Admin Check Effect: Running. Auth Loading:", authLoading);

    if (authLoading) return;

    console.log("Admin Check Effect: Auth loaded. User:", user);

    if (!user) {
      setCheckingAdmin(false);
      console.log("Admin Check Effect: No user found, redirecting to login.");
      router.push("/login?error=Acceso denegado.");
      return;
    }

    async function checkAdminStatus() {
      if (!user) {
        // Add this check
        console.log("Admin Check Effect: User became null before check.");
        setCheckingAdmin(false);
        router.push("/login?error=Acceso denegado.");
        return;
      }
      console.log("Admin Check Effect: Checking profile for user ID:", user.id);
      try {
        const { data: profile, error: profileError } = await supabase
          .from("public_user_profiles")
          .select("is_admin")
          .eq("id", user!.id)
          .single();

        console.log("Admin Check Effect: Profile query result:", {
          profile,
          profileError,
        });

        if (profileError) throw profileError;

        if (profile && profile.is_admin) {
          console.log("Admin Check Effect: User IS admin.");
          setIsAdmin(true);
        } else {
          console.log(
            "Admin Check Effect: User is NOT admin or profile not found."
          );
          setIsAdmin(false);
          router.push("/?error=Acceso denegado.");
        }
      } catch (err: unknown) {
        console.error("Admin Check Effect: Error checking admin status:", err);
        let message = "Error al verificar permisos.";
        if (err instanceof Error) message = err.message;
        setAdminCheckError(message);
        setIsAdmin(false);
      } finally {
        console.log("Admin Check Effect: Finished checking admin status.");
        setCheckingAdmin(false);
      }
    }
    checkAdminStatus();
  }, [user, authLoading, router]);

  useEffect(() => {
    const cargarRetos = async () => {
      setFetchLoading(true);
      setFetchError(null);
      const { data, error: fetchError } = await supabase
        .from("challenges")
        .select(
          "id, titulo, descripcion, nivel, lenguaje, etiquetas, codigo_base, test_cases, created_at"
        )
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error al cargar retos:", fetchError);
        setFetchError("No se pudieron cargar los retos: " + fetchError.message);
        setRetos([]);
      } else {
        setRetos((data as Challenge[]) || []);
      }
      setFetchLoading(false);
    };
    cargarRetos();
  }, []);

  const eliminarReto = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este reto?")) return;
    setActionLoading(true);
    const { error: deleteError } = await supabase
      .from("challenges")
      .delete()
      .eq("id", id);
    setActionLoading(false);
    if (deleteError) {
      console.error("Error al eliminar reto:", deleteError);
      alert("Error al eliminar: " + deleteError.message);
    } else {
      setRetos(retos.filter((r) => r.id !== id));
    }
  };

  const empezarEdicion = (reto: Challenge) => {
    setEditandoId(reto.id);
    setForm({ ...reto });
    setTestCasesRaw(JSON.stringify(reto.test_cases ?? [], null, 2));
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm({});
    setTestCasesRaw("");
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

  const guardarCambios = async (e: FormEvent) => {
    e.preventDefault();
    if (!editandoId) return;

    let parsedTestCases: TestCase[] = [];
    try {
      parsedTestCases = testCasesRaw ? JSON.parse(testCasesRaw) : [];
      if (!Array.isArray(parsedTestCases)) {
        throw new Error("Los test cases deben ser un array JSON válido.");
      }
    } catch (parseError) {
      console.error("Error parsing test cases:", parseError);
      alert(
        "Error en el formato JSON de los test cases: " +
          (parseError as Error).message
      );
      return;
    }

    const updateData: Partial<Challenge> = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      lenguaje: form.lenguaje,
      nivel: form.nivel,
      etiquetas: form.etiquetas ?? [],
      codigo_base: form.codigo_base,
      test_cases: parsedTestCases,
    };

    Object.keys(updateData).forEach(
      (key) =>
        updateData[key as keyof Partial<Challenge>] === undefined &&
        delete updateData[key as keyof Partial<Challenge>]
    );

    setActionLoading(true);
    setFetchError(null);

    const { data: updatedData, error: updateError } = await supabase
      .from("challenges")
      .update(updateData)
      .eq("id", editandoId)
      .select()
      .single();

    setActionLoading(false);

    if (updateError) {
      console.error("Error al guardar reto:", updateError);
      setFetchError("Error al guardar reto: " + updateError.message);
      alert("❌ Error al guardar reto: " + updateError.message);
    } else if (updatedData) {
      setRetos(
        retos.map((r) => (r.id === editandoId ? (updatedData as Challenge) : r))
      );
      cancelarEdicion();
      alert("✅ Reto guardado exitosamente!");
    } else {
      setFetchError("No se recibió confirmación de la actualización.");
      alert("⚠️ No se pudo confirmar la actualización.");
    }
  };

  if (pageLoading) {
    return (
      <p className="text-center mt-10 text-gray-600 dark:text-gray-400">
        Cargando...
      </p>
    );
  }
  if (pageError) {
    return <p className="text-center mt-10 text-red-600">{pageError}</p>;
  }
  if (!isAdmin && !pageLoading && !pageError) {
    return <p className="text-center mt-10 text-red-600">Acceso denegado.</p>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 dark:text-gray-200">
      <h1 className="text-2xl font-bold mb-6">🛠 Editar retos existentes</h1>
      {fetchError && !fetchLoading && (
        <p className="text-red-600 mb-4">Error: {fetchError}</p>
      )}

      {retos.map((reto) => (
        <div
          key={reto.id}
          className="border p-4 rounded mb-4 bg-white shadow dark:bg-gray-800 dark:border-gray-700"
        >
          {editandoId === reto.id ? (
            <form onSubmit={guardarCambios} className="space-y-3">
              <input
                name="titulo"
                value={form.titulo || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="Título"
                required
              />
              <textarea
                name="descripcion"
                value={form.descripcion || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="Descripción del reto"
                rows={4}
                required
              />
              <select
                name="lenguaje"
                value={form.lenguaje || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              >
                <option value="" disabled>
                  Selecciona Lenguaje
                </option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
              </select>
              <select
                name="nivel"
                value={form.nivel || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              >
                <option value="" disabled>
                  Selecciona Dificultad
                </option>
                <option value="Fácil">Fácil</option>
                <option value="Medio">Medio</option>
                <option value="Difícil">Difícil</option>
              </select>
              <div className="border p-2 rounded dark:border-gray-600">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Etiquetas
                </label>
                <div className="flex flex-wrap gap-2">
                  {etiquetasDisponibles.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleEtiqueta(tag)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        form.etiquetas?.includes(tag)
                          ? "bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-500"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                name="codigo_base"
                value={form.codigo_base || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded font-mono h-32 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="Código base (opcional)"
              />
              <textarea
                value={testCasesRaw}
                onChange={(e) => setTestCasesRaw(e.target.value)}
                className="w-full p-2 border rounded font-mono h-40 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="Test cases en formato JSON (array de objetos: [{input: [...], output: ...}, ...])"
                required
              />
              <div className="flex gap-3 items-center">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:opacity-60"
                >
                  {actionLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="text-red-600 hover:underline dark:text-red-400 dark:hover:text-red-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-1">{reto.titulo}</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {reto.descripcion}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Lenguaje: <span className="font-medium">{reto.lenguaje}</span> |
                Dificultad: <span className="font-medium">{reto.nivel}</span>
              </p>
              {reto.etiquetas && reto.etiquetas.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {reto.etiquetas.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full dark:bg-gray-600 dark:text-gray-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {reto.codigo_base && (
                <>
                  <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-2">
                    Código Base:
                  </h3>
                  <pre className="bg-gray-100 p-2 mt-1 rounded text-sm text-gray-800 overflow-x-auto font-mono dark:bg-gray-900 dark:text-gray-300">
                    {reto.codigo_base}
                  </pre>
                </>
              )}
              {reto.test_cases && (
                <>
                  <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-2">
                    Test Cases:
                  </h3>
                  <pre className="bg-gray-50 p-2 mt-1 rounded text-sm text-gray-800 overflow-x-auto font-mono dark:bg-gray-900 dark:text-gray-300">
                    {JSON.stringify(reto.test_cases ?? [], null, 2)}
                  </pre>
                </>
              )}
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => empezarEdicion(reto)}
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminarReto(reto.id)}
                  className="text-sm text-red-600 hover:underline dark:text-red-400 dark:hover:text-red-300"
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
