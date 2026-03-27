import { Severity } from "@/lib/types";

export const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; border: string; bg: string }
> = {
  mild: {
    label: "Mild",
    color: "text-green-700",
    border: "border-l-green-500",
    bg: "bg-green-50",
  },
  moderate: {
    label: "Moderate",
    color: "text-yellow-700",
    border: "border-l-yellow-500",
    bg: "bg-yellow-50",
  },
  severe: {
    label: "Severe",
    color: "text-orange-700",
    border: "border-l-orange-500",
    bg: "bg-orange-50",
  },
  life_threatening: {
    label: "Life-threatening",
    color: "text-red-700",
    border: "border-l-red-500",
    bg: "bg-red-50",
  },
};

export const COMMON_REACTIONS = [
  "Anaphylaxis",
  "Hives / Urticaria",
  "Rash",
  "Swelling / Angioedema",
  "Difficulty Breathing",
  "Nausea / Vomiting",
  "Diarrhoea",
  "Itching / Pruritus",
  "Dizziness",
  "Abdominal Pain",
];
