"use client";

import type { Allergy } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/constants/severity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AllergyCardProps {
  allergy: Allergy;
  onEdit: (allergy: Allergy) => void;
  onRemove: (id: string) => void;
}

export function AllergyCard({ allergy, onEdit, onRemove }: AllergyCardProps) {
  const severity = SEVERITY_CONFIG[allergy.severity];
  const categoryLabel =
    allergy.category === "drug"
      ? "Drug"
      : allergy.category === "food"
        ? "Food"
        : allergy.category === "environmental"
          ? "Environmental"
          : "Other";

  return (
    <Card
      className={`relative border-l-4 ${severity.border} p-4 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base truncate">
              {allergy.name}
            </h3>
            <Badge variant="secondary" className="text-xs shrink-0">
              {categoryLabel}
            </Badge>
            {allergy.staffOnly && (
              <Badge variant="outline" className="text-xs shrink-0">
                Staff Only
              </Badge>
            )}
          </div>

          {allergy.reactions.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {allergy.reactions.slice(0, 3).join(", ")}
              {allergy.reactions.length > 3 && " ..."}
            </p>
          )}

          {allergy.remedy && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Remedy: {allergy.remedy}
            </p>
          )}
        </div>

        <div
          className={`text-xs font-medium px-2 py-1 rounded ${severity.bg} ${severity.color} shrink-0`}
        >
          {severity.label}
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onEdit(allergy)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive hover:text-destructive"
          onClick={() => onRemove(allergy.id)}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}
