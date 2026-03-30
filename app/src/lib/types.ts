export type Severity = "unknown" | "mild" | "moderate" | "severe" | "life_threatening";
export type AllergyCategory = "drug" | "food" | "environmental" | "custom";

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

export interface AllergenSearchResult {
  name: string;
  genericName?: string;
  substanceName: string;
  category: AllergyCategory;
  source: "ndc" | "label" | "food_event";
  // Rich metadata (populated when available)
  ndcCode?: string;
  manufacturer?: string;
  route?: string;
  dosageForm?: string;
  productType?: string;
  strength?: string;
  /** For food results — number of CAERS adverse event reports */
  reportCount?: number;
}

export interface LabelWarningData {
  contraindications?: string;
  warnings?: string;
  adverseReactions?: string;
}

export interface AllergenInsights {
  reactions: CountResult[];
  totalEvents: number;
  labelWarnings: LabelWarningData | null;
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
