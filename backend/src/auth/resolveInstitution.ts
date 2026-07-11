import * as fs from "fs";
import * as path from "path";

interface Institution {
  domain: string;
  name: string;
  category: "student" | "professional";
  tier: string;
}

// Load configurations synchronously at module load
let institutions: Institution[] = [];
let blockedDomains: string[] = [];

try {
  const instPath = path.join(__dirname, "../config/institutions.json");
  const blockPath = path.join(__dirname, "../config/blockedProfessionalDomains.json");

  institutions = JSON.parse(fs.readFileSync(instPath, "utf-8"));
  blockedDomains = JSON.parse(fs.readFileSync(blockPath, "utf-8"));
} catch (error) {
  console.error("Failed to load institution configuration files:", error);
}

export function resolveInstitution(email: string): {
  name: string;
  category: "student" | "professional";
  tier?: string;
} | null {
  if (!email || typeof email !== "string") {
    return null;
  }

  // Basic email structure validation
  const parts = email.split("@");
  if (parts.length !== 2) {
    return null;
  }

  const domain = parts[1]?.trim().toLowerCase();
  if (!domain) {
    return null;
  }

  // 1. Check known institutions (students)
  const known = institutions.find(
    (inst) => inst.domain.toLowerCase() === domain
  );
  if (known) {
    return {
      name: known.name,
      category: "student",
      tier: known.tier,
    };
  }

  // 2. Check blocked consumer domains
  if (blockedDomains.includes(domain)) {
    return null;
  }

  // 3. Unrecognized non-blocked domain -> Professional
  // Derive name from domain (e.g. google.com -> Google)
  const mainPart = domain.split(".")[0];
  if (!mainPart) {
    return null;
  }

  const derivedName = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);

  return {
    name: derivedName,
    category: "professional",
    tier: "company",
  };
}
