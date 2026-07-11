import { describe, it, expect } from "vitest";
import { resolveInstitution } from "../src/auth/resolveInstitution";

describe("resolveInstitution", () => {
  it("resolves a known IIT domain correctly", () => {
    const result = resolveInstitution("someone@iitb.ac.in");
    expect(result).toEqual({ name: "IIT Bombay", category: "student", tier: "IIT" });
  });

  it("resolves a known IIIT domain correctly", () => {
    const result = resolveInstitution("someone@iiitnr.ac.in");
    expect(result).toEqual({ name: "IIIT Naya Raipur", category: "student", tier: "IIIT" });
  });

  it("treats an unrecognized non-blocked domain as professional", () => {
    const result = resolveInstitution("someone@google.com");
    expect(result?.category).toBe("professional");
    expect(result?.name).toBe("Google");
  });

  it("resolves the sandbox gmail domain for testing", () => {
    const result = resolveInstitution("someone@gmail.com");
    expect(result).toEqual({ name: "Resend Sandbox (Gmail)", category: "student", tier: "SANDBOX" });
  });

  it("rejects free email providers for professional category", () => {
    expect(resolveInstitution("someone@yahoo.com")).toBeNull();
    expect(resolveInstitution("someone@outlook.com")).toBeNull();
    expect(resolveInstitution("someone@hotmail.com")).toBeNull();
  });

  it("is case-insensitive on domain matching", () => {
    const result = resolveInstitution("Someone@IITB.AC.IN");
    expect(result?.name).toBe("IIT Bombay");
  });

  it("handles malformed email input without throwing", () => {
    expect(() => resolveInstitution("not-an-email")).not.toThrow();
    expect(resolveInstitution("not-an-email")).toBeNull();
  });

  it("returns null for empty string input", () => {
    expect(resolveInstitution("")).toBeNull();
  });
});
