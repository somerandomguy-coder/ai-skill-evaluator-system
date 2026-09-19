import { describe, expect, it, vi } from "vitest";

describe("debouncing and multi-click guard", () => {
  it("drops rapid multi-clicks within the lockout interval", async () => {
    let callCount = 0;
    let lastCalled = 0;
    const cooldownMs = 500;

    const guardedHandler = () => {
      const now = Date.now();
      if (now - lastCalled < cooldownMs) {
        return false;
      }
      lastCalled = now;
      callCount++;
      return true;
    };

    // First click succeeds immediately
    expect(guardedHandler()).toBe(true);
    expect(callCount).toBe(1);

    // Rapid successive clicks are dropped
    expect(guardedHandler()).toBe(false);
    expect(guardedHandler()).toBe(false);
    expect(callCount).toBe(1);
  });

  it("locks in-flight async actions from running concurrently", async () => {
    let activeRuns = 0;
    let completedRuns = 0;
    let inFlight = false;

    const asyncAction = async () => {
      if (inFlight) return null;
      inFlight = true;
      activeRuns++;
      // simulate network request
      await new Promise((resolve) => setTimeout(resolve, 50));
      completedRuns++;
      inFlight = false;
      return "done";
    };

    // Start two concurrent calls simultaneously
    const p1 = asyncAction();
    const p2 = asyncAction();

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe("done");
    expect(r2).toBe(null); // Second call was locked out
    expect(completedRuns).toBe(1);
  });
});
