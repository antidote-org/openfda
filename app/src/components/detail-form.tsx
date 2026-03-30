"use client";

import { useState } from "react";
import type { Allergy, AllergyCategory, Severity } from "@/lib/types";
import { SeverityPicker } from "./severity-picker";
import { ReactionCheckboxes } from "./reaction-checkboxes";
import { FdaInsightsPanel } from "./fda-insights-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DetailFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Allergy;
  selectedAllergen?: {
    name: string;
    substanceName?: string;
    category: AllergyCategory;
  };
  onSave: (data: Omit<Allergy, "id" | "createdAt" | "updatedAt">) => void;
}

export function DetailForm({
  open,
  onOpenChange,
  initialData,
  selectedAllergen,
  onSave,
}: DetailFormProps) {
  const source = initialData ?? selectedAllergen;

  const [name, setName] = useState(source?.name ?? "");
  const [substanceName] = useState(
    initialData?.substanceName ?? selectedAllergen?.substanceName ?? ""
  );
  const [category, setCategory] = useState<AllergyCategory>(
    source?.category ?? "drug"
  );
  const [severity, setSeverity] = useState<Severity>(
    initialData?.severity ?? "moderate"
  );
  const [reactions, setReactions] = useState<string[]>(
    initialData?.reactions ?? []
  );
  const [remedy, setRemedy] = useState(initialData?.remedy ?? "");
  const [onset, setOnset] = useState<string>(
    initialData?.onsetTiming ?? "unknown"
  );
  const [staffOnly, setStaffOnly] = useState(initialData?.staffOnly ?? false);
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const handleSave = () => {
    onSave({
      name: name || "Unknown Allergen",
      substanceName: substanceName || undefined,
      category,
      severity,
      reactions,
      remedy: remedy || undefined,
      onsetTiming: onset as Allergy["onsetTiming"],
      staffOnly,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Allergy" : "Add Allergy"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Allergen</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Allergen name"
            />
            {substanceName && substanceName !== name && (
              <p className="text-xs text-muted-foreground">
                Substance: {substanceName}
              </p>
            )}
          </div>

          {/* Staff Only */}
          <Label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={staffOnly}
              onCheckedChange={(v) => setStaffOnly(v === true)}
            />
            Medical Staff Only
          </Label>

          {/* Category */}
          {!selectedAllergen && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">Category</Label>
              <RadioGroup
                value={category}
                onValueChange={(v) => setCategory(v as AllergyCategory)}
                className="flex gap-4"
              >
                {(["drug", "food", "environmental", "custom"] as const).map(
                  (cat) => (
                    <Label
                      key={cat}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <RadioGroupItem value={cat} />
                      {cat === "drug"
                        ? "Drug"
                        : cat === "food"
                          ? "Food"
                          : cat === "environmental"
                            ? "Environmental"
                            : "Other"}
                    </Label>
                  )
                )}
              </RadioGroup>
            </div>
          )}

          {/* Severity */}
          <SeverityPicker value={severity} onChange={setSeverity} />

          {/* Reactions */}
          <ReactionCheckboxes
            substanceName={
              category === "drug" || category === "environmental"
                ? substanceName || undefined
                : undefined
            }
            selected={reactions}
            onChange={setReactions}
          />

          {/* Remedy */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Remedy</Label>
            <Textarea
              value={remedy}
              onChange={(e) => setRemedy(e.target.value)}
              placeholder="e.g., Epipen, Benadryl 50mg, avoid exposure..."
              rows={2}
            />
          </div>

          {/* Onset */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Onset Timing</Label>
            <RadioGroup
              value={onset}
              onValueChange={setOnset}
              className="flex flex-wrap gap-3"
            >
              {[
                { value: "immediate", label: "Immediate (<1hr)" },
                { value: "delayed", label: "Delayed (1-72hr)" },
                { value: "unknown", label: "Unknown" },
              ].map((opt) => (
                <Label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Diagnosed at age 12, confirmed by allergist..."
              rows={2}
            />
          </div>

          {/* FDA Insights */}
          {(category === "drug" || category === "environmental") && (
            <FdaInsightsPanel substanceName={substanceName || undefined} />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {initialData ? "Update" : "Save Allergy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
