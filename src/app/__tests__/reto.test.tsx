// src/app/__tests__/reto.test.tsx
/** @jest-environment jsdom */

import React, { FC } from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { supabase } from "@/lib/supabase"; // usado en el segundo test

/* -------------------------------------------------------------------------- */
/*                               GLOBAL MOCKS                                 */
/* -------------------------------------------------------------------------- */

jest.mock("prismjs", () => ({
  highlight: (c: string) => c,
  languages: { javascript: {} },
}));
jest.mock("prismjs/components/prism-javascript", () => ({}), { virtual: true });
jest.mock("prismjs/themes/prism.css", () => ({}), { virtual: true });

jest.mock("next/navigation", () => ({ useParams: () => ({ id: "1" }) }));

// Editor simplificado
interface EditorProps {
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
}
const EditorMock: FC<EditorProps> = ({ value, onValueChange, disabled }) => (
  <textarea
    data-testid="editor"
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    disabled={disabled}
  />
);
EditorMock.displayName = "MockCodeEditor";
jest.mock("react-simple-code-editor", () => EditorMock);

/* -------------------------------------------------------------------------- */
/*                                TIPOS MOCK                                  */
/* -------------------------------------------------------------------------- */

type TestCase = { input: unknown[]; output: unknown };
interface Challenge {
  id: string;
  titulo: string;
  descripcion: string;
  lenguaje: string;
  codigo_base: string;
  test_cases: TestCase[];
}
interface Submission {
  user_id?: string;
  challenge_id?: string;
  codigo: string;
  resultado: string[];
}

interface MockBuilder<T> {
  select: jest.Mock<MockBuilder<T>, []>;
  eq: jest.Mock<MockBuilder<T>, []>;
  single: jest.Mock<Promise<{ data: T | null; error: null }>, []>;
  order: jest.Mock<Promise<{ data: T }>, []>;
  insert: jest.Mock<Promise<{ error: null }>, []>;
}

function createBuilder<T>(payload: T): MockBuilder<T> {
  const builder = {} as MockBuilder<T>;
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.single = jest.fn().mockResolvedValue({ data: payload, error: null });
  builder.order = jest.fn().mockResolvedValue({ data: payload });
  builder.insert = jest.fn().mockResolvedValue({ error: null });
  return builder;
}

/* -------------------------------------------------------------------------- */
/*                       SUPABASE MOCK (config. por defecto)                  */
/* -------------------------------------------------------------------------- */

jest.mock("@/lib/supabase", () => {
  const reto: Challenge = {
    id: "1",
    titulo: "Prueba Suma",
    descripcion: "Suma dos números",
    lenguaje: "JavaScript",
    codigo_base: "(a, b) => a + b",
    test_cases: [
      { input: [1, 2], output: 3 },
      { input: [5, 7], output: 12 },
    ],
  };
  const submissions: Submission[] = [
    { codigo: "(a, b) => a + b", resultado: ["Caso 1: ✅", "Caso 2: ✅"] },
  ];
  return {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: jest.fn((table: string) => {
        if (table === "challenges") return createBuilder<Challenge>(reto);
        if (table === "submissions")
          return createBuilder<Submission[]>(submissions);
        return createBuilder<null>(null);
      }),
    },
  };
});

/* -------------------------------------------------------------------------- */
/*                              COMPONENTE SUT                                */
/* -------------------------------------------------------------------------- */

import RetoPage from "../retos/[id]/page";

/* -------------------------------------------------------------------------- */
/*                                   TESTS                                    */
/* -------------------------------------------------------------------------- */

describe("Página de reto individual", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza reto ya resuelto y botón deshabilitado", async () => {
    render(<RetoPage />);
    await screen.findByText("Prueba Suma");

    expect(
      screen.getByRole("button", { name: /ejecutar código/i })
    ).toBeDisabled();
    expect(
      screen.getByText("✅ ¡Ya resolviste este reto con éxito!")
    ).toBeInTheDocument();
  });

  it("ejecuta código cuando el reto aún no está resuelto", async () => {
    let submissionsBuilder: MockBuilder<Submission[]>;

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "challenges") {
        const retoNo: Challenge = {
          id: "1",
          titulo: "Prueba Suma",
          descripcion: "Suma",
          lenguaje: "JS",
          codigo_base: "(a,b)=>a+b",
          test_cases: [{ input: [2, 3], output: 5 }],
        };
        return createBuilder<Challenge>(retoNo);
      }
      if (table === "submissions") {
        submissionsBuilder = createBuilder<Submission[]>([]);
        return submissionsBuilder;
      }
      return createBuilder<null>(null);
    });

    render(<RetoPage />);
    await screen.findByText("Prueba Suma");

    const btn = screen.getByRole("button", { name: /ejecutar código/i });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);

    expect(await screen.findByText("Caso 1: ✅")).toBeInTheDocument();
    expect(
      await screen.findByText("✅ ¡Ya resolviste este reto con éxito!")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(submissionsBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          codigo: "(a,b)=>a+b",
          resultado: ["Caso 1: ✅"],
        }),
      ]);
    });
    expect(btn).toBeDisabled();
  });

  it("muestra ❌ y mantiene botón habilitado si los tests fallan", async () => {
    let submissionsBuilder: MockBuilder<Submission[]>;

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "challenges") {
        const retoErr: Challenge = {
          id: "1",
          titulo: "Reto Falla",
          descripcion: "Suma",
          lenguaje: "JS",
          codigo_base: "(a,b)=>a-b",
          test_cases: [{ input: [3, 1], output: 4 }],
        };
        return createBuilder<Challenge>(retoErr);
      }
      if (table === "submissions") {
        submissionsBuilder = createBuilder<Submission[]>([]);
        return submissionsBuilder;
      }
      return createBuilder<null>(null);
    });

    render(<RetoPage />);
    await screen.findByText("Reto Falla");

    const btn = screen.getByRole("button", { name: /ejecutar código/i });
    fireEvent.click(btn);

    // El resultado debe mostrar ❌ y no el banner de éxito
    expect(await screen.findByTestId("resultado-0")).toHaveTextContent(/❌/);
    expect(
      screen.queryByText("✅ ¡Ya resolviste este reto con éxito!")
    ).not.toBeInTheDocument();

    // El botón debe seguir habilitado para permitir nuevos intentos
    expect(btn).toBeEnabled();

    // Se insertó submission con resultado de falla
    await waitFor(() => {
      expect(submissionsBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({ resultado: [expect.stringContaining("❌")] }),
      ]);
    });
  });
});
describe("Página de reto individual", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza reto ya resuelto y botón deshabilitado", async () => {
    render(<RetoPage />);
    await screen.findByText("Prueba Suma");

    expect(
      screen.getByRole("button", { name: /ejecutar código/i })
    ).toBeDisabled();
    expect(
      screen.getByText("✅ ¡Ya resolviste este reto con éxito!")
    ).toBeInTheDocument();
  });

  it("ejecuta código cuando el reto aún no está resuelto", async () => {
    // Sobrescribir comportamiento de supabase.from para este test
    let submissionsBuilder: MockBuilder<Submission[]>;

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "challenges") {
        const retoNo: Challenge = {
          id: "1",
          titulo: "Prueba Suma",
          descripcion: "Suma",
          lenguaje: "JS",
          codigo_base: "(a,b)=>a+b",
          test_cases: [{ input: [2, 3], output: 5 }],
        };
        return createBuilder<Challenge>(retoNo);
      }
      if (table === "submissions") {
        submissionsBuilder = createBuilder<Submission[]>([]);
        return submissionsBuilder;
      }
      return createBuilder<null>(null);
    });

    render(<RetoPage />);
    await screen.findByText("Prueba Suma");

    const btn = screen.getByRole("button", { name: /ejecutar código/i });
    expect(btn).toBeEnabled();

    fireEvent.click(btn);

    expect(await screen.findByText("Caso 1: ✅")).toBeInTheDocument();
    expect(
      await screen.findByText("✅ ¡Ya resolviste este reto con éxito!")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(submissionsBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          codigo: "(a,b)=>a+b",
          resultado: ["Caso 1: ✅"],
        }),
      ]);
    });
  });
});
