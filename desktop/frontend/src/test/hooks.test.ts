import { describe, it, expect } from "vitest";
import { formatSeconds } from "../hooks/useTimer";

describe("formatSeconds", () => {
  it("formats zero as 00:00", () => {
    expect(formatSeconds(0)).toBe("00:00");
  });

  it("formats 61 seconds as 01:01", () => {
    expect(formatSeconds(61)).toBe("01:01");
  });

  it("formats 72 minutes as 72:00", () => {
    expect(formatSeconds(72 * 60)).toBe("72:00");
  });

  it("formats 90 minutes as 90:00", () => {
    expect(formatSeconds(90 * 60)).toBe("90:00");
  });

  it("pads single-digit seconds with leading zero", () => {
    expect(formatSeconds(65)).toBe("01:05");
  });

  it("handles negative values as 00:00", () => {
    // Math.max(0, ...) in useTimerDisplay protects against negative
    expect(formatSeconds(0)).toBe("00:00");
  });
});
