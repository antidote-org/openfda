"use client";

import { useState } from "react";
import { COMMON_REACTIONS } from "@/constants/severity";
import { useFdaInsights } from "@/lib/hooks/use-fda-insights";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface ReactionCheckboxesProps {
  substanceName?: string;
  selected: string[];
  onChange: (reactions: string[]) => void;
}

export function ReactionCheckboxes({
  substanceName,
  selected,
  onChange,
}: ReactionCheckboxesProps) {
  const { reactions: fdaReactions, isLoading } =
    useFdaInsights(substanceName);
  const [customReaction, setCustomReaction] = useState("");

  // Merge FDA-reported reactions with common ones, deduped
  const topFda = fdaReactions.slice(0, 8).map((r) => r.term);
  const allOptions = [
    ...new Set([...topFda, ...COMMON_REACTIONS]),
  ];

  const toggle = (reaction: string) => {
    onChange(
      selected.includes(reaction)
        ? selected.filter((r) => r !== reaction)
        : [...selected, reaction]
    );
  };

  const addCustom = () => {
    const trimmed = customReaction.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setCustomReaction("");
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Reactions (select all that apply)
      </Label>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-48 overflow-y-auto">
          {allOptions.map((reaction) => (
            <Label
              key={reaction}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(reaction)}
                onCheckedChange={() => toggle(reaction)}
              />
              <span className="truncate">{reaction}</span>
            </Label>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <Input
          placeholder="Other reaction..."
          value={customReaction}
          onChange={(e) => setCustomReaction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}
