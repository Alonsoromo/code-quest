"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1️⃣ Verificar OTP al cargar la página
  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");
    const type = params.get("type");

    if (!token || !email) {
      setMsg("Token inválido o faltan parámetros.");
      return;
    }

    setMsg("Validando enlace…");
    supabase.auth
      .verifyOtp({ token, email, type: type as "recovery" })
      .then(({ error }) => {
        if (error) setMsg("Error al validar token: " + error.message);
        else {
          setOk(true);
          setMsg("Enlace verificado. Ingresa tu nueva contraseña.");
        }
      });
  }, [params]);

  // 2️⃣ Actualizar contraseña
  const handleReset = async () => {
    if (pwd !== pwd2) {
      setMsg("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);

    if (error) {
      setMsg("Error: " + error.message);
    } else {
      setMsg("✅ Contraseña actualizada. Redirigiendo...");
      setTimeout(() => {
        router.push("/login?success=1");
      }, 2000);
    }
  };

  return (
    <main className="max-w-md mx-auto mt-20 p-6 border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Restablecer contraseña
      </h1>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        disabled={!ok}
        className="w-full mb-3 p-2 border rounded"
      />
      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={pwd2}
        onChange={(e) => setPwd2(e.target.value)}
        disabled={!ok}
        className="w-full mb-4 p-2 border rounded"
      />

      <button
        onClick={handleReset}
        disabled={!ok || loading}
        className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? "Actualizando…" : "Restablecer contraseña"}
      </button>

      {msg && <p className="mt-4 text-center text-sm text-gray-700">{msg}</p>}
    </main>
  );
}
