import type { Allergy } from "./types";

const STORAGE_KEY = "allergy-finder:allergies";

export function getAllergies(): Allergy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAllergies(allergies: Allergy[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allergies));
}
