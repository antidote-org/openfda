"use client";

import { useState } from "react";
import type { AllergyCategory } from "@/lib/types";
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

interface AddAllergyPopoverProps {
  onSelect: (allergen: {
    name: string;
    substanceName?: string;
    category: AllergyCategory;
  }) => void;
  onCustom: () => void;
}

export function AddAllergyPopover({
  onSelect,
  onCustom,
}: AddAllergyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { drugResults, foodResults, isLoading } = useAllergenSearch(query);

  const hasResults = drugResults.length > 0 || foodResults.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button size="lg" className="gap-2" />}
      >
        <span className="text-lg leading-none">+</span> Add Allergy
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search for an allergen..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isLoading && (
              <div className="p-2 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            )}

            {!isLoading && query.length >= 2 && !hasResults && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {drugResults.length > 0 && (
              <CommandGroup heading="Drugs">
                {drugResults.map((drug) => (
                  <CommandItem
                    key={`drug-${drug.substanceName}`}
                    onSelect={() => {
                      onSelect({
                        name: drug.name,
                        substanceName: drug.substanceName,
                        category: "drug",
                      });
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{drug.name}</span>
                      {drug.genericName &&
                        drug.genericName !== drug.name && (
                          <span className="text-xs text-muted-foreground">
                            {drug.genericName}
                          </span>
                        )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {drugResults.length > 0 && foodResults.length > 0 && (
              <CommandSeparator />
            )}

            {foodResults.length > 0 && (
              <CommandGroup heading="Foods">
                {foodResults.map((food) => (
                  <CommandItem
                    key={`food-${food.name}`}
                    onSelect={() => {
                      onSelect({
                        name: food.name,
                        category: "food",
                      });
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="text-sm">{food.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
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
