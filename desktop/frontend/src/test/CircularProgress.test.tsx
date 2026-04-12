import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CircularProgress } from "../components/Timer/CircularProgress";

describe("CircularProgress", () => {
  it("renders SVG with two circles", () => {
    const { container } = render(<CircularProgress progress={0.5} />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
  });

  it("renders children inside the ring", () => {
    render(<CircularProgress progress={0.3}><span>Timer text</span></CircularProgress>);
    expect(screen.getByText("Timer text")).toBeInTheDocument();
  });

  it("applies custom color to progress arc", () => {
    const { container } = render(<CircularProgress progress={0.7} color="#FF0000" />);
    const arcs = container.querySelectorAll("circle");
    // Second circle is the progress arc
    expect(arcs[1].getAttribute("stroke")).toBe("#FF0000");
  });

  it("sets strokeDashoffset based on progress=0 (full offset = full circle empty)", () => {
    const { container } = render(<CircularProgress progress={0} size={100} strokeWidth={10} />);
    const arc = container.querySelectorAll("circle")[1];
    const offset = parseFloat(arc.getAttribute("stroke-dashoffset") ?? "0");
    const radius = (100 - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    // At progress=0 offset should equal full circumference
    expect(offset).toBeCloseTo(circumference, 1);
  });

  it("sets strokeDashoffset=0 at progress=1 (full circle filled)", () => {
    const { container } = render(<CircularProgress progress={1} size={100} strokeWidth={10} />);
    const arc = container.querySelectorAll("circle")[1];
    const offset = parseFloat(arc.getAttribute("stroke-dashoffset") ?? "1");
    expect(offset).toBeCloseTo(0, 1);
  });

  it("clamps progress above 1 to 1", () => {
    const { container } = render(<CircularProgress progress={2} size={100} strokeWidth={10} />);
    const arc = container.querySelectorAll("circle")[1];
    const offset = parseFloat(arc.getAttribute("stroke-dashoffset") ?? "1");
    expect(offset).toBeCloseTo(0, 1);
  });
});
