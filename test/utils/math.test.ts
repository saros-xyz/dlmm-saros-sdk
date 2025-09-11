import { describe, expect, it } from "vitest";
import { mulDiv } from "../../utils/math";

describe("Math Utils - Basic Test", () => {
  it("should multiply and divide correctly", () => {
    // Basic sanity check
    const result = mulDiv(100, 50, 10, "down");
    expect(result).toBe(500);
  });

  it("should handle zero multiplication", () => {
    const result = mulDiv(0, 50, 10, "down");
    expect(result).toBe(0);
  });

  it("should throw on division by zero", () => {
    expect(() => mulDiv(100, 50, 0, "down")).toThrow();
  });
});
