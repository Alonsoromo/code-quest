import { render, screen } from "@testing-library/react";
import Home from "../page";
import { supabase } from "@/lib/supabase";

// Mock navegación
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Activar el mock de lib/__mocks__/supabase.ts
jest.mock("@/lib/supabase");

describe("Página principal", () => {
  it("muestra mensaje para usuarios no autenticados", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
    });

    render(<Home />);

    expect(
      await screen.findByText(/Regístrate o inicia sesión/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Iniciar sesión/i)).toBeInTheDocument();
  });

  it("muestra retos para usuario autenticado sin completar ninguno", async () => {
    const retosMock = [
      { id: "1", titulo: "FizzBuzz", lenguaje: "JavaScript", nivel: "fácil" },
      {
        id: "2",
        titulo: "Palíndromos",
        lenguaje: "Python",
        nivel: "intermedio",
      },
    ];

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user123" } },
    });

    // Configura el chain de retos
    (supabase.from as jest.Mock).mockImplementation((tableName: string) => {
      if (tableName === "challenges") {
        return {
          select: () => ({
            order: () => ({
              limit: jest.fn().mockResolvedValue({ data: retosMock }),
            }),
          }),
        };
      }

      if (tableName === "submissions") {
        return {
          select: () => ({
            eq: jest.fn().mockResolvedValue({ data: [] }), // sin retos completados
          }),
        };
      }

      return {};
    });

    render(<Home />);

    for (const reto of retosMock) {
      expect(await screen.findByText(reto.titulo)).toBeInTheDocument();
    }

    const botones = await screen.findAllByRole("button", {
      name: /🚀 Intentar/i,
    });
    expect(botones).toHaveLength(retosMock.length);

    expect(
      screen.queryByText(/Regístrate o inicia sesión/i)
    ).not.toBeInTheDocument();
  });
  it("muestra 'Ver solución' para retos completados por el usuario", async () => {
    const retosMock = [
      { id: "1", titulo: "FizzBuzz", lenguaje: "JavaScript", nivel: "fácil" },
      {
        id: "2",
        titulo: "Palíndromos",
        lenguaje: "Python",
        nivel: "intermedio",
      },
    ];

    // Usuario autenticado
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user123" } },
    });

    // Mock dinámico según tabla
    (supabase.from as jest.Mock).mockImplementation((tableName: string) => {
      if (tableName === "challenges") {
        return {
          select: () => ({
            order: () => ({
              limit: jest.fn().mockResolvedValue({ data: retosMock }),
            }),
          }),
        };
      }

      if (tableName === "submissions") {
        return {
          select: () => ({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  challenge_id: "1",
                  resultado: ["✅ Passed test 1", "✅ Passed test 2"],
                },
              ],
            }),
          }),
        };
      }

      return {};
    });

    render(<Home />);

    // Ambos retos están presentes
    for (const reto of retosMock) {
      expect(await screen.findByText(reto.titulo)).toBeInTheDocument();
    }

    // Un botón debe decir "Ver solución", otro "Intentar"
    expect(
      await screen.findByRole("button", { name: /👀 Ver solución/i })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("button", { name: /🚀 Intentar/i })
    ).toBeInTheDocument();
  });
});
