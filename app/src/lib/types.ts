export type Severity = "unknown" | "mild" | "moderate" | "severe" | "life_threatening";
export type AllergyCategory = "drug" | "food" | "custom";

export interface Allergy {
  id: string;
  name: string;
  substanceName?: string;
  category: AllergyCategory;
  severity: Severity;
  reactions: string[];
  remedy?: string;
  onsetTiming?: "immediate" | "delayed" | "unknown";
  staffOnly?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CountResult {
  term: string;
  count: number;
}

export interface DrugSearchResult {
  name: string;
  genericName?: string;
  substanceName: string;
  source: "ndc" | "label";
}

export interface FoodSearchResult {
  name: string;
  industryName?: string;
}

export interface OpenFDAResponse<T> {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
    results?: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: T[];
}
