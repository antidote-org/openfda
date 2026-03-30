"use client";

import { useState } from "react";
import type { AllergenSearchResult } from "@/lib/types";
import { useAllergenSearch } from "@/lib/hooks/use-allergen-search";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface AddAllergyPopoverProps {
  onSelect: (allergen: AllergenSearchResult) => void;
  onCustom: () => void;
}

/** Compact metadata line — joins non-empty parts with · */
function metaLine(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

/** Renders a single allergen result as a structured preview card */
function AllergenResultItem({ item }: { item: AllergenSearchResult }) {
  const isFda = item.source === "ndc" || item.source === "label";

  // Subtitle: substance/generic name if different from display name
  const subtitle =
    item.genericName && item.genericName !== item.name
      ? item.genericName
      : item.substanceName !== item.name
        ? item.substanceName
        : undefined;

  // Meta: route · dosage form · strength (drugs/environmental)
  const meta = isFda
    ? metaLine([item.dosageForm, item.route, item.strength])
    : undefined;

  // Bottom: manufacturer + NDC (drugs/environmental) or report count (food)
  const bottom = isFda
    ? metaLine([
        item.manufacturer,
        item.ndcCode ? `NDC ${item.ndcCode}` : undefined,
      ])
    : item.reportCount
      ? `${item.reportCount.toLocaleString()} adverse event reports`
      : undefined;

  return (
    <div className="flex flex-col gap-0.5 py-0.5">
      <span className="text-sm font-medium leading-tight">{item.name}</span>
      {subtitle && (
        <span className="text-xs text-muted-foreground leading-tight">
          {subtitle}
        </span>
      )}
      {meta && (
        <span className="text-[11px] text-muted-foreground/70 leading-tight">
          {meta}
        </span>
      )}
      {bottom && (
        <span className="text-[11px] text-muted-foreground/60 leading-tight">
          {bottom}
        </span>
      )}
    </div>
  );
}

export function AddAllergyPopover({
  onSelect,
  onCustom,
}: AddAllergyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { drugResults, foodResults, environmentalResults, isLoading } =
    useAllergenSearch(query);

  const hasResults =
    drugResults.length > 0 ||
    foodResults.length > 0 ||
    environmentalResults.length > 0;

  const handleSelect = (item: AllergenSearchResult) => {
    onSelect(item);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button size="lg" className="gap-2" />}
      >
        <span className="text-lg leading-none">+</span> Add Allergy
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              placeholder="Search for an allergen..."
              value={query}
              onValueChange={setQuery}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <CommandList>
            {isLoading && !hasResults && (
              <div className="p-2 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            )}

            {!isLoading && query.length >= 2 && !hasResults && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {drugResults.length > 0 && (
              <CommandGroup heading="Drugs">
                {drugResults.map((item) => (
                  <CommandItem
                    key={`drug-${item.substanceName}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <AllergenResultItem item={item} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {environmentalResults.length > 0 && (
              <>
                {drugResults.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Environmental">
                  {environmentalResults.map((item) => (
                    <CommandItem
                      key={`env-${item.substanceName}`}
                      onSelect={() => handleSelect(item)}
                    >
                      <AllergenResultItem item={item} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {foodResults.length > 0 && (
              <>
                {(drugResults.length > 0 ||
                  environmentalResults.length > 0) && <CommandSeparator />}
                <CommandGroup heading="Foods">
                  {foodResults.map((item) => (
                    <CommandItem
                      key={`food-${item.substanceName}`}
                      onSelect={() => handleSelect(item)}
                    >
                      <AllergenResultItem item={item} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onCustom();
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="text-sm text-muted-foreground">
                  Can&apos;t find it? Add custom allergen
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
