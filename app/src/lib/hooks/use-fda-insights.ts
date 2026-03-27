"use client";

import { useEffect, useRef, useState } from "react";
import type { CountResult } from "../types";
import {
  getReactionsForDrug,
  getEventCountForDrug,
} from "../openfda-queries";

export function useFdaInsights(substanceName: string | undefined) {
  const [reactions, setReactions] = useState<CountResult[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!substanceName) {
      setReactions([]);
      setTotalEvents(0);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    Promise.allSettled([
      getReactionsForDrug(substanceName, controller.signal),
      getEventCountForDrug(substanceName, controller.signal),
    ]).then(([rxns, count]) => {
      if (controller.signal.aborted) return;
      setReactions(rxns.status === "fulfilled" ? rxns.value : []);
      setTotalEvents(count.status === "fulfilled" ? count.value : 0);
      setIsLoading(false);
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [substanceName]);

  return { reactions, totalEvents, isLoading };
}
