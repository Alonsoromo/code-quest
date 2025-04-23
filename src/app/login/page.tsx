"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mostrar mensaje de éxito desde parámetro en URL
  useEffect(() => {
    const success = searchParams.get("success");
    if (success) {
      setSuccessMessage(success);
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  }, [searchParams]);

  // Validación básica del formato de correo
  const isEmailValid = /^\S+@\S+\.\S+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRecoveryMessage("");

    let resError = null;
    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      resError = signInError;
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      resError = signUpError;
    }

    if (resError) {
      setError(resError.message);
    } else {
      router.push("/");
    }
  };

  const handlePasswordReset = async () => {
    setRecoveryError("");
    setRecoveryMessage("");

    if (!isEmailValid) {
      setRecoveryError("Por favor ingresa un correo con formato válido.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/reset` }
    );
    setLoading(false);

    if (resetError) {
      setRecoveryError(resetError.message);
    } else {
      setRecoveryMessage(
        "✅ Correo de recuperación enviado. Revisa tu bandeja de entrada."
      );
    }
  };

  return (
    <main className="max-w-md mx-auto mt-20 p-6 border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">
        {isLogin ? "Iniciar sesión" : "Crear cuenta"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {isLogin ? "Entrar" : "Registrarse"}
        </button>
      </form>

      {isLogin && (
        <div className="mt-4 text-center">
          <button
            onClick={handlePasswordReset}
            disabled={loading || !isEmailValid}
            className="text-sm text-blue-500 hover:underline disabled:opacity-50"
          >
            {loading ? "Enviando correo..." : "¿Olvidaste tu contraseña?"}
          </button>
          {recoveryMessage && (
            <p className="text-green-600 mt-2">{recoveryMessage}</p>
          )}
          {recoveryError && (
            <p className="text-red-600 mt-2">{recoveryError}</p>
          )}
        </div>
      )}

      <p className="mt-4 text-center">
        {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <button
          className="text-blue-500 underline"
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
            setRecoveryMessage("");
            setRecoveryError("");
            setSuccessMessage("");
          }}
        >
          {isLogin ? "Regístrate" : "Inicia sesión"}
        </button>
      </p>

      {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
      {successMessage && (
        <p className="text-green-600 mt-2 text-center">{successMessage}</p>
      )}
    </main>
  );
}
