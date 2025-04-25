// Define shared interfaces for the application

export interface Challenge {
  // Assuming 'id' is consistently a number from the database sequence.
  // If your admin page uses a different ID (like a string UUID), adjust accordingly.
  id: number;
  titulo: string;
  descripcion: string;
  nivel?: string; // Add 'nivel' if it's a separate field, maybe make it optional?
  lenguaje: string; // Make required if every challenge must have a language
  etiquetas?: string[]; // Add etiquetas, make optional if not always present
  codigo_base?: string; // Renamed from codigo_inicial, make optional
  // Define a more specific type for test cases if possible
  test_cases?: { input: unknown[]; output: unknown }[]; // Add test_cases, make optional
  created_at: string; // Or Date
}

export interface Submission {
  id: number | string; // Use consistent type (number or string)
  challenge_id: number | string; // Should match Challenge['id'] type
  user_id: string; // Typically UUID from auth.users
  codigo: string;
  resultado: string[] | null;
  created_at: string; // Or Date
  challenge?: Pick<Challenge, "id" | "titulo" | "lenguaje">; // Example from previous pages
  user?: { email: string }; // <-- Add optional user email field for admin page
}

export interface LeaderboardItem {
  user_id: string;
  email: string;
  completados: number;
  ultimo_envio: string;
}

export interface TestCase {
  input: unknown[]; // Use a more specific type if possible, e.g., (string | number)[]
  output: unknown; // Use a more specific type if possible, e.g., string | number | boolean
}
