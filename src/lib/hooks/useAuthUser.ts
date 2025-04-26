// filepath: src/lib/hooks/useAuthUser.ts
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // Optional: Add error handling

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    supabase.auth
      .getUser()
      .then(({ data: { user: currentUser }, error: getUserError }) => {
        if (isMounted) {
          if (getUserError) {
            console.error("useAuthUser - getUser error:", getUserError);
            setError("Error al obtener el usuario."); // Set error state
          }
          setUser(currentUser);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("useAuthUser - getUser catch:", err);
          setError("Error inesperado al obtener el usuario.");
          setLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
          // Optionally reset loading/error when auth state changes if needed
          // setLoading(false);
          // setError(null);
        }
      }
    );

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, error }; // Return error state as well
}
