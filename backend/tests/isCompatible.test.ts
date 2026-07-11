import { describe, it, expect } from "vitest";
import { isCompatible } from "../src/signaling/matchmaker";
import { UserSession } from "../src/types";

// Helper to build a minimal UserSession for tests
function mockUser(overrides: Partial<UserSession>): UserSession {
  return {
    socketId: "sock-1",
    userId: "uuid-1",
    institutionName: "Test U",
    category: "student",
    filterPreference: "anyone",
    allowGuests: false,
    state: "QUEUED",
    roomId: null,
    queuedAt: Date.now(),
    ...overrides,
  };
}

describe("isCompatible", () => {
  it("matches two students with 'anyone' filters", () => {
    const a = mockUser({ socketId: "sock-a", userId: "uuid-a", category: "student", filterPreference: "anyone" });
    const b = mockUser({ socketId: "sock-b", userId: "uuid-b", category: "student", filterPreference: "anyone" });
    expect(isCompatible(a, b)).toBe(true);
  });

  it("does NOT match a professional-only filter user with a student", () => {
    const a = mockUser({ socketId: "sock-a", userId: "uuid-a", category: "professional", filterPreference: "professionals_only" });
    const b = mockUser({ socketId: "sock-b", userId: "uuid-b", category: "student", filterPreference: "anyone" });
    expect(isCompatible(a, b)).toBe(false);
  });

  it("requires BOTH sides' filters to accept each other (asymmetric case)", () => {
    // a wants students only; b (a professional) is open to anyone.
    // b's category doesn't satisfy a's filter -> must be incompatible regardless of b's own filter.
    const a = mockUser({ socketId: "sock-a", userId: "uuid-a", category: "student", filterPreference: "students_only" });
    const b = mockUser({ socketId: "sock-b", userId: "uuid-b", category: "professional", filterPreference: "anyone" });
    expect(isCompatible(a, b)).toBe(false);
  });

  it("matches guest with guest", () => {
    const a = mockUser({ socketId: "sock-a", userId: "uuid-a", category: "guest", filterPreference: "anyone" });
    const b = mockUser({ socketId: "sock-b", userId: "uuid-b", category: "guest", filterPreference: "anyone" });
    expect(isCompatible(a, b)).toBe(true);
  });

  it("does NOT match guest with a verified user who has allowGuests: false", () => {
    const a = mockUser({ socketId: "sock-a", userId: "uuid-a", category: "guest", filterPreference: "anyone" });
    const b = mockUser({ socketId: "sock-b", userId: "uuid-b", category: "student", filterPreference: "anyone", allowGuests: false });
    expect(isCompatible(a, b)).toBe(false);
  });

  it("matches guest with a verified user who has allowGuests: true", () => {
    const a = mockUser({ socketId: "sock-a", userId: "uuid-a", category: "guest", filterPreference: "anyone" });
    const b = mockUser({ socketId: "sock-b", userId: "uuid-b", category: "student", filterPreference: "anyone", allowGuests: true });
    expect(isCompatible(a, b)).toBe(true);
  });

  it("does NOT match guest with verified user if verified user filter is students_only", () => {
    // Verified student allows guests, but wants "students_only".
    // A guest is category "guest", not "student", so it shouldn't match.
    const a = mockUser({ socketId: "sock-a", userId: "uuid-a", category: "guest", filterPreference: "anyone" });
    const b = mockUser({ socketId: "sock-b", userId: "uuid-b", category: "student", filterPreference: "students_only", allowGuests: true });
    expect(isCompatible(a, b)).toBe(false);
  });
});
