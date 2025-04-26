// filepath: src/lib/hooks/useUserSubmissions.ts
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "./useAuthUser"; // Import the auth hook
import { Submission } from "@/types"; // Assuming Submission type is defined

// Define the structure of the submission data you want to fetch
type FetchedSubmission = Pick<Submission, "challenge_id" | "resultado">;

export function useUserSubmissions() {
  const { user, loading: authLoading } = useAuthUser();
  const [submissions, setSubmissions] = useState<FetchedSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      // Wait for authentication check to complete
      setLoading(true);
      return;
    }

    if (!user) {
      // No user logged in, clear submissions and stop loading
      setSubmissions([]);
      setLoading(false);
      setError(null); // No error if user is simply not logged in
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchSubmissions() {
      try {
        const { data, error: fetchError } = await supabase
          .from("submissions")
          .select("challenge_id, resultado") // Select only needed fields
          .eq("user_id", user!.id);

        if (isMounted) {
          if (fetchError) {
            throw fetchError;
          }
          setSubmissions((data as FetchedSubmission[]) ?? []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("useUserSubmissions error:", err);
          let message = "Error al cargar los envíos.";
          if (err instanceof Error) message = err.message;
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSubmissions();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]); // Re-run when user or authLoading state changes

  return { submissions, loading: loading || authLoading, error };
}
