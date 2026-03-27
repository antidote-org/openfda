"use client";

import { useCallback, useEffect, useState } from "react";
import type { Allergy } from "../types";
import { getAllergies, saveAllergies } from "../storage";

export function useAllergies() {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAllergies(getAllergies());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Allergy[]) => {
    setAllergies(next);
    saveAllergies(next);
  }, []);

  const addAllergy = useCallback(
    (allergy: Omit<Allergy, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newAllergy: Allergy = {
        ...allergy,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      persist([...getAllergies(), newAllergy]);
      return newAllergy;
    },
    [persist]
  );

  const updateAllergy = useCallback(
    (id: string, patch: Partial<Omit<Allergy, "id" | "createdAt">>) => {
      const current = getAllergies();
      persist(
        current.map((a) =>
          a.id === id
            ? { ...a, ...patch, updatedAt: new Date().toISOString() }
            : a
        )
      );
    },
    [persist]
  );

  const removeAllergy = useCallback(
    (id: string) => {
      persist(getAllergies().filter((a) => a.id !== id));
    },
    [persist]
  );

  return { allergies, loaded, addAllergy, updateAllergy, removeAllergy };
}
