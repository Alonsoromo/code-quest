import "@testing-library/jest-dom"; // agrega matchers como toBeInTheDocument()

// Hace que cada `import '@/lib/supabase'` use el mock por defecto
jest.mock("@/lib/supabase");

// Mock de App Router para tests
jest.mock("next/navigation", () => ({
  // Router mínimo: solo lo que uses
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/", // ruta “/” por defecto
}));
