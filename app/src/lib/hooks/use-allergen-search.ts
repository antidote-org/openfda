"use client";

import { useEffect, useRef, useState } from "react";
import type { AllergenSearchResult } from "../types";
import { searchAllergens } from "../openfda-queries";

export function useAllergenSearch(query: string) {
  const [results, setResults] = useState<AllergenSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      searchAllergens(trimmed, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setResults(data);
          setIsLoading(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResults([]);
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query]);

  const drugResults = results.filter((r) => r.category === "drug");
  const foodResults = results.filter((r) => r.category === "food");
  const environmentalResults = results.filter(
    (r) => r.category === "environmental"
  );

  return { drugResults, foodResults, environmentalResults, isLoading };
}
