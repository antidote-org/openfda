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
  const { drugResults, foodResults, environmentalResults, isLoading } =
    useAllergenSearch(query);

  const hasResults =
    drugResults.length > 0 ||
    foodResults.length > 0 ||
    environmentalResults.length > 0;

  const handleSelect = (
    name: string,
    substanceName: string,
    category: AllergyCategory
  ) => {
    onSelect({ name, substanceName, category });
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
                {drugResults.map((item) => (
                  <CommandItem
                    key={`drug-${item.substanceName}`}
                    onSelect={() =>
                      handleSelect(item.name, item.substanceName, "drug")
                    }
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{item.name}</span>
                      {item.genericName && item.genericName !== item.name && (
                        <span className="text-xs text-muted-foreground">
                          {item.genericName}
                        </span>
                      )}
                    </div>
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
                      onSelect={() =>
                        handleSelect(
                          item.name,
                          item.substanceName,
                          "environmental"
                        )
                      }
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{item.name}</span>
                        {item.genericName &&
                          item.genericName !== item.name && (
                            <span className="text-xs text-muted-foreground">
                              {item.genericName}
                            </span>
                          )}
                      </div>
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
                      onSelect={() =>
                        handleSelect(item.name, item.substanceName, "food")
                      }
                    >
                      <span className="text-sm">{item.name}</span>
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
