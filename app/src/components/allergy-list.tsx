"use client";

import type { Allergy } from "@/lib/types";
import { AllergyCard } from "./allergy-card";

interface AllergyListProps {
  allergies: Allergy[];
  onEdit: (allergy: Allergy) => void;
  onRemove: (id: string) => void;
}

export function AllergyList({ allergies, onEdit, onRemove }: AllergyListProps) {
  if (allergies.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="text-4xl mb-3">No allergies added yet</div>
        <p className="text-sm">
          Tap &quot;+ Add Allergy&quot; to search for drug or food allergens.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {allergies.map((a) => (
        <AllergyCard
          key={a.id}
          allergy={a}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
