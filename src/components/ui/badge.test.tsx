import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge, PriorityBadge } from "./badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>On hold</Badge>);
    expect(screen.getByText("On hold")).toBeInTheDocument();
  });
});

describe("PriorityBadge", () => {
  it("shows the human label for a priority", () => {
    render(<PriorityBadge priority="urgent" />);
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("applies the priority-specific styling", () => {
    render(<PriorityBadge priority="low" />);
    expect(screen.getByText("Low").className).toContain("bg-slate-100");
  });
});
