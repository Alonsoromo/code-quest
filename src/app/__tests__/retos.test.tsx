import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RetosPage from "../retos/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/supabase", () => {
  const mockRetos = [
    {
      id: "1",
      titulo: "FizzBuzz",
      lenguaje: "JavaScript",
      nivel: "Fácil",
      etiquetas: ["básico", "lógica"],
    },
    {
      id: "2",
      titulo: "Palíndromos",
      lenguaje: "Python",
      nivel: "Media",
      etiquetas: ["strings", "recursión"],
    },
  ];
  const mockSubmissions = [{ challenge_id: "2", resultado: ["✅ Todo bien"] }];
  return {
    supabase: {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "user123" } } }),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
      },
      from: jest.fn((table: string) => {
        if (table === "challenges") {
          return {
            select: jest.fn(() => Promise.resolve({ data: mockRetos })),
          };
        }
        if (table === "submissions") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: mockSubmissions })),
            })),
          };
        }
        return { select: jest.fn(() => Promise.resolve({ data: [] })) };
      }),
    },
  };
});

describe("Página de Retos", () => {
  it("muestra retos disponibles para un usuario autenticado", async () => {
    render(<RetosPage />);
    expect(await screen.findByText("FizzBuzz")).toBeInTheDocument();
    expect(await screen.findByText("Palíndromos")).toBeInTheDocument();
    expect(await screen.findAllByText("#básico")).toHaveLength(2);
    expect(await screen.findByText("👀 Ver solución")).toBeInTheDocument();
    expect(await screen.findByText("🚀 Intentar")).toBeInTheDocument();
  });

  it("filtra por título correctamente", async () => {
    render(<RetosPage />);
    await screen.findByText("FizzBuzz");
    const input = screen.getByPlaceholderText(/ej\./i);
    fireEvent.change(input, { target: { value: "Fizz" } });
    await waitFor(() => {
      expect(screen.getByText("FizzBuzz")).toBeInTheDocument();
      expect(screen.queryByText("Palíndromos")).toBeNull();
    });
  });

  it("filtra por lenguaje correctamente", async () => {
    render(<RetosPage />);
    await screen.findByText("Palíndromos");
    const select = screen.getByDisplayValue("Todos");
    fireEvent.change(select, { target: { value: "Python" } });
    await waitFor(() => {
      expect(screen.getByText("Palíndromos")).toBeInTheDocument();
      expect(screen.queryByText("FizzBuzz")).toBeNull();
    });
  });

  it("filtra por etiqueta correctamente", async () => {
    render(<RetosPage />);
    await screen.findByText("FizzBuzz");
    const boton = await screen.findByRole("button", { name: "#recursión" });
    fireEvent.click(boton);
    await waitFor(() => {
      expect(screen.getByText("Palíndromos")).toBeInTheDocument();
      expect(screen.queryByText("FizzBuzz")).toBeNull();
    });
  });

  it("ordena retos por dificultad descendente", async () => {
    render(<RetosPage />);
    await screen.findByText("FizzBuzz");
    const select = screen.getByDisplayValue("Fácil → Difícil");
    fireEvent.change(select, { target: { value: "desc" } });
    await waitFor(() => {
      const titulos = screen.getAllByRole("heading", { level: 2 });
      expect(titulos[0]).toHaveTextContent("Palíndromos");
      expect(titulos[1]).toHaveTextContent("FizzBuzz");
    });
  });
});
