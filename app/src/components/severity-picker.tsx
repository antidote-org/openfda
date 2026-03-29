"use client";

import type { Severity } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/constants/severity";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const LEVELS: Severity[] = ["unknown", "mild", "moderate", "severe", "life_threatening"];

interface SeverityPickerProps {
  value: Severity;
  onChange: (value: Severity) => void;
}

export function SeverityPicker({ value, onChange }: SeverityPickerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Severity</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as Severity)}
        className="flex flex-wrap gap-3"
      >
        {LEVELS.map((level) => {
          const config = SEVERITY_CONFIG[level];
          return (
            <Label
              key={level}
              className={`flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors ${
                value === level
                  ? `${config.bg} ${config.border} border-l-4`
                  : "border-border hover:bg-accent"
              }`}
            >
              <RadioGroupItem value={level} className="sr-only" />
              <span className={value === level ? config.color : ""}>
                {config.label}
              </span>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
