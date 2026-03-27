"use client";

import { useEffect, useState } from "react";
import { getPharmClass, getDrugsInClass } from "@/lib/openfda-queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AllergyCategory } from "@/lib/types";

interface CrossReactivityNudgeProps {
  substanceName: string;
  existingSubstances: string[];
  onAdd: (
    allergens: { name: string; substanceName: string; category: AllergyCategory }[]
  ) => void;
  onDismiss: () => void;
}

export function CrossReactivityNudge({
  substanceName,
  existingSubstances,
  onAdd,
  onDismiss,
}: CrossReactivityNudgeProps) {
  const [relatedDrugs, setRelatedDrugs] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const classes = await getPharmClass(substanceName);
        if (cancelled || classes.length === 0) {
          setLoading(false);
          return;
        }

        const drugs = await getDrugsInClass(classes[0], substanceName);
        if (cancelled) return;

        const existingSet = new Set(
          existingSubstances.map((s) => s.toUpperCase())
        );
        const filtered = drugs.filter(
          (d) => !existingSet.has(d.toUpperCase())
        );
        setRelatedDrugs(filtered.slice(0, 5));
      } catch {
        // Silently fail — this is a nice-to-have feature
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [substanceName, existingSubstances]);

  if (loading || relatedDrugs.length === 0) return null;

  const toggle = (drug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(drug)) next.delete(drug);
      else next.add(drug);
      return next;
    });
  };

  return (
    <Card className="p-4 border-yellow-300 bg-yellow-50">
      <p className="text-sm font-medium mb-2">
        Cross-Reactivity Alert
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        {substanceName} shares a pharmacologic class with these substances.
        You may want to add them too:
      </p>
      <div className="space-y-2 mb-3">
        {relatedDrugs.map((drug) => (
          <Label
            key={drug}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selected.has(drug)}
              onCheckedChange={() => toggle(drug)}
            />
            {drug}
          </Label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDismiss}>
          Skip
        </Button>
        {selected.size > 0 && (
          <Button
            size="sm"
            onClick={() =>
              onAdd(
                Array.from(selected).map((name) => ({
                  name,
                  substanceName: name,
                  category: "drug" as const,
                }))
              )
            }
          >
            Add Selected ({selected.size})
          </Button>
        )}
      </div>
    </Card>
  );
}
