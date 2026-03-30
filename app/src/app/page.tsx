"use client";

import { useState } from "react";
import type { Allergy, AllergenSearchResult, AllergyCategory } from "@/lib/types";
import { useAllergies } from "@/lib/hooks/use-allergies";
import { AllergyList } from "@/components/allergy-list";
import { AddAllergyPopover } from "@/components/add-allergy-popover";
import { DetailForm } from "@/components/detail-form";
import { CrossReactivityNudge } from "@/components/cross-reactivity-nudge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { allergies, loaded, addAllergy, updateAllergy, removeAllergy } =
    useAllergies();

  // Detail form state
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState<Allergy | undefined>();
  const [selectedAllergen, setSelectedAllergen] = useState<
    AllergenSearchResult | undefined
  >();

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const allergyToDelete = allergies.find((a) => a.id === deleteId);

  // Cross-reactivity nudge
  const [nudgeSubstance, setNudgeSubstance] = useState<string | null>(null);

  const handleSelect = (allergen: AllergenSearchResult) => {
    setEditingAllergy(undefined);
    setSelectedAllergen(allergen);
    setDetailOpen(true);
  };

  const handleCustom = () => {
    setEditingAllergy(undefined);
    setSelectedAllergen(undefined);
    setDetailOpen(true);
  };

  const handleEdit = (allergy: Allergy) => {
    setSelectedAllergen(undefined);
    setEditingAllergy(allergy);
    setDetailOpen(true);
  };

  const handleSave = (
    data: Omit<Allergy, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingAllergy) {
      updateAllergy(editingAllergy.id, data);
    } else {
      const saved = addAllergy(data);
      // Show cross-reactivity nudge for drug allergies
      if (saved.category === "drug" && saved.substanceName) {
        setNudgeSubstance(saved.substanceName);
      }
    }
    setEditingAllergy(undefined);
    setSelectedAllergen(undefined);
  };

  const handleCrossReactivityAdd = (
    allergens: { name: string; substanceName: string; category: AllergyCategory }[]
  ) => {
    for (const a of allergens) {
      addAllergy({
        ...a,
        severity: "moderate",
        reactions: [],
        onsetTiming: "unknown",
      });
    }
    setNudgeSubstance(null);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Allergy Finder
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your drug and food allergies with FDA data insights
            </p>
          </div>
          <AddAllergyPopover onSelect={handleSelect} onCustom={handleCustom} />
        </div>

        {/* Cross-reactivity nudge */}
        {nudgeSubstance && (
          <div className="mb-6">
            <CrossReactivityNudge
              substanceName={nudgeSubstance}
              existingSubstances={allergies
                .filter((a) => a.substanceName)
                .map((a) => a.substanceName!)}
              onAdd={handleCrossReactivityAdd}
              onDismiss={() => setNudgeSubstance(null)}
            />
          </div>
        )}

        {/* Allergy list */}
        <AllergyList
          allergies={allergies}
          onEdit={handleEdit}
          onRemove={setDeleteId}
        />

        {/* Detail form dialog */}
        <DetailForm
          open={detailOpen}
          onOpenChange={setDetailOpen}
          initialData={editingAllergy}
          selectedAllergen={selectedAllergen}
          onSave={handleSave}
        />

        {/* Delete confirmation dialog */}
        <Dialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Allergy</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <strong>{allergyToDelete?.name}</strong> from your allergy
                list? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteId) removeAllergy(deleteId);
                  setDeleteId(null);
                }}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* FDA Disclaimer */}
        <p className="text-[11px] text-muted-foreground text-center mt-12 max-w-xl mx-auto">
          Disclaimer: This tool uses data from the FDA Adverse Event Reporting
          System (FAERS) and other openFDA datasets. Adverse event reports do not
          establish causation. Do not rely on openFDA to make decisions regarding
          medical care. Always consult a healthcare professional.
        </p>
      </div>
    </main>
  );
}
