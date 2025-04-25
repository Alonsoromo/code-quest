import { render, screen } from "@testing-library/react";
import Navbar from "@/components/Navbar";

describe("Navbar", () => {
  it("muestra el logo CodeQuest", async () => {
    render(<Navbar />);
    // findBy* ya envuelve en act y espera hasta que aparezca el nodo
    const logo = await screen.findByText("CodeQuest");
    expect(logo).toBeInTheDocument();
  });
});
