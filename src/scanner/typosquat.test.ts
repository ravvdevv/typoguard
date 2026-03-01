import { expect, test, describe } from "bun:test";
import { detectTyposquats } from "./typosquat";

describe("Typosquat Detection", () => {
  test("should detect simple typos", () => {
    const deps = ["experss", "axois"];
    const results = detectTyposquats(deps);
    
    expect(results).toHaveLength(2);
    expect(results[0].potentialMatch).toBe("express");
    expect(results[1].potentialMatch).toBe("axios");
  });

  test("should ignore legitimate top packages", () => {
    const deps = ["react", "express"];
    const results = detectTyposquats(deps);
    
    expect(results).toHaveLength(0);
  });

  test("should ignore completely different names", () => {
    const deps = ["my-cool-package-123", "something-unique"];
    const results = detectTyposquats(deps);
    
    expect(results).toHaveLength(0);
  });
});
