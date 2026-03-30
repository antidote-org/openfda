"use client";

import { useEffect, useRef, useState } from "react";
import type { CountResult, LabelWarningData } from "../types";
import { getAllergenInsights } from "../openfda-queries";

export function useFdaInsights(substanceName: string | undefined) {
  const [reactions, setReactions] = useState<CountResult[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [labelWarnings, setLabelWarnings] = useState<LabelWarningData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!substanceName) {
      setReactions([]);
      setTotalEvents(0);
      setLabelWarnings(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    getAllergenInsights(substanceName, controller.signal)
      .then((insights) => {
        if (controller.signal.aborted) return;
        setReactions(insights.reactions);
        setTotalEvents(insights.totalEvents);
        setLabelWarnings(insights.labelWarnings);
        setIsLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setReactions([]);
          setTotalEvents(0);
          setLabelWarnings(null);
          setIsLoading(false);
        }
      });

    return () => {
      abortRef.current?.abort();
    };
  }, [substanceName]);

  return { reactions, totalEvents, labelWarnings, isLoading };
}
