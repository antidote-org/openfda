"use client";

import { useEffect, useRef, useState } from "react";
import type { DrugSearchResult, FoodSearchResult } from "../types";
import { searchDrugs, searchFoods } from "../openfda-queries";

export function useAllergenSearch(query: string) {
  const [drugResults, setDrugResults] = useState<DrugSearchResult[]>([]);
  const [foodResults, setFoodResults] = useState<FoodSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setDrugResults([]);
      setFoodResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      Promise.allSettled([
        searchDrugs(trimmed, controller.signal),
        searchFoods(trimmed, controller.signal),
      ]).then(([drugs, foods]) => {
        if (controller.signal.aborted) return;
        setDrugResults(
          drugs.status === "fulfilled" ? drugs.value : []
        );
        setFoodResults(
          foods.status === "fulfilled" ? foods.value : []
        );
        setIsLoading(false);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query]);

  return { drugResults, foodResults, isLoading };
}
