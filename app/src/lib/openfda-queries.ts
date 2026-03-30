import { fdaFetch } from "./openfda-client";
import type {
  AllergenInsights,
  AllergenSearchResult,
  AllergyCategory,
  CountResult,
  LabelWarningData,
  OpenFDAResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENVIRONMENTAL_PATTERNS = [
  "POLLEN",
  "DANDER",
  "MOLD",
  "DUST MITE",
  "VENOM",
  "GRASS",
  "RAGWEED",
  "WEED MIX",
  "TREE MIX",
  "MITE",
  "FEATHER",
];

function detectCategory(substanceName: string): AllergyCategory {
  const upper = substanceName.toUpperCase();
  if (ENVIRONMENTAL_PATTERNS.some((p) => upper.includes(p))) {
    return "environmental";
  }
  return "drug";
}

function prepareWildcard(query: string): string {
  return query.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ").trim() + "*";
}

// ---------------------------------------------------------------------------
// Typeahead Search — fans out to NDC + Labels + Food in parallel
// ---------------------------------------------------------------------------

export async function searchAllergens(
  query: string,
  signal?: AbortSignal
): Promise<AllergenSearchResult[]> {
  const wc = prepareWildcard(query);
  if (wc === "*") return [];

  const [ndcResult, labelResult, foodResult] = await Promise.allSettled([
    // Arm A — NDC: brand names, generic names, active ingredients
    fdaFetch<
      OpenFDAResponse<{
        brand_name?: string;
        generic_name?: string;
        openfda?: { substance_name?: string[] };
        active_ingredients?: { name: string }[];
      }>
    >(
      "/drug/ndc.json",
      {
        search: `(brand_name:${wc}+OR+generic_name:${wc}+OR+active_ingredients.name:${wc})`,
        limit: 20,
      },
      signal
    ),

    // Arm B — Labels: enriched openfda object with canonical substance names
    fdaFetch<
      OpenFDAResponse<{
        openfda?: {
          brand_name?: string[];
          generic_name?: string[];
          substance_name?: string[];
        };
      }>
    >(
      "/drug/label.json",
      {
        search: `(openfda.brand_name:${wc}+OR+openfda.generic_name:${wc}+OR+openfda.substance_name:${wc})`,
        limit: 20,
      },
      signal
    ),

    // Arm C — Food events: food allergen categories
    fdaFetch<OpenFDAResponse<CountResult>>(
      "/food/event.json",
      {
        search: `products.industry_name:${wc}`,
        count: "products.industry_name.exact",
        limit: 10,
      },
      signal
    ),
  ]);

  // Merge and dedupe
  const seen = new Map<string, AllergenSearchResult>();

  // Process NDC results
  if (ndcResult.status === "fulfilled" && ndcResult.value?.results) {
    for (const r of ndcResult.value.results) {
      const substance =
        r.openfda?.substance_name?.[0] ??
        r.active_ingredients?.[0]?.name ??
        r.generic_name;
      if (!substance) continue;

      const key = substance.toUpperCase().trim();
      if (seen.has(key)) continue;

      seen.set(key, {
        name: r.brand_name ?? r.generic_name ?? substance,
        genericName: r.generic_name,
        substanceName: substance,
        category: detectCategory(substance),
        source: "ndc",
      });
    }
  }

  // Process Label results — prefer over NDC (richer metadata)
  if (labelResult.status === "fulfilled" && labelResult.value?.results) {
    for (const r of labelResult.value.results) {
      const substance = r.openfda?.substance_name?.[0];
      if (!substance) continue;

      const key = substance.toUpperCase().trim();
      const existing = seen.get(key);

      // Replace NDC entry with label entry, or add new
      if (!existing || existing.source === "ndc") {
        seen.set(key, {
          name:
            r.openfda?.brand_name?.[0] ??
            r.openfda?.generic_name?.[0] ??
            substance,
          genericName: r.openfda?.generic_name?.[0],
          substanceName: substance,
          category: detectCategory(substance),
          source: "label",
        });
      }
    }
  }

  // Process Food results
  if (foodResult.status === "fulfilled" && foodResult.value?.results) {
    for (const r of foodResult.value.results) {
      const key = r.term.toUpperCase().trim();
      if (seen.has(key)) continue;

      seen.set(key, {
        name: r.term,
        substanceName: r.term,
        category: "food",
        source: "food_event",
      });
    }
  }

  // Sort: drugs first, then environmental, then food
  const order: Record<string, number> = {
    drug: 0,
    environmental: 1,
    food: 2,
    custom: 3,
  };

  return Array.from(seen.values())
    .sort(
      (a, b) =>
        (order[a.category] ?? 9) - (order[b.category] ?? 9) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 15);
}

// ---------------------------------------------------------------------------
// Allergen Insights — fans out to FAERS + Label in parallel
// ---------------------------------------------------------------------------

export async function getAllergenInsights(
  substanceName: string,
  signal?: AbortSignal
): Promise<AllergenInsights> {
  const [rxnResult, countResult, labelResult] = await Promise.allSettled([
    // FAERS reactions
    fdaFetch<OpenFDAResponse<CountResult>>(
      "/drug/event.json",
      {
        search: `patient.drug.openfda.substance_name.exact:"${substanceName}"`,
        count: "patient.reaction.reactionmeddrapt.exact",
        limit: 20,
      },
      signal
    ),

    // FAERS total count
    fdaFetch<OpenFDAResponse<unknown>>(
      "/drug/event.json",
      {
        search: `patient.drug.openfda.substance_name.exact:"${substanceName}"`,
        limit: 1,
      },
      signal
    ),

    // Label text (contraindications, warnings, adverse reactions)
    fdaFetch<
      OpenFDAResponse<{
        contraindications?: string[];
        warnings?: string[];
        adverse_reactions?: string[];
      }>
    >(
      "/drug/label.json",
      {
        search: `openfda.substance_name.exact:"${substanceName}"`,
        limit: 1,
      },
      signal
    ),
  ]);

  const reactions =
    rxnResult.status === "fulfilled"
      ? rxnResult.value?.results ?? []
      : [];

  const totalEvents =
    countResult.status === "fulfilled"
      ? countResult.value?.meta?.results?.total ?? 0
      : 0;

  let labelWarnings: LabelWarningData | null = null;
  if (labelResult.status === "fulfilled" && labelResult.value?.results?.[0]) {
    const label = labelResult.value.results[0];
    labelWarnings = {
      contraindications: label.contraindications?.[0]?.slice(0, 500),
      warnings: label.warnings?.[0]?.slice(0, 500),
      adverseReactions: label.adverse_reactions?.[0]?.slice(0, 500),
    };
  }

  return { reactions, totalEvents, labelWarnings };
}

// ---------------------------------------------------------------------------
// Cross-Reactivity — unchanged
// ---------------------------------------------------------------------------

export async function getPharmClass(
  substanceName: string,
  signal?: AbortSignal
): Promise<string[]> {
  const data = await fdaFetch<
    OpenFDAResponse<{
      openfda?: { pharm_class_epc?: string[] };
    }>
  >(
    "/drug/ndc.json",
    {
      search: `openfda.substance_name.exact:"${substanceName}"`,
      limit: 1,
    },
    signal
  );

  return data?.results?.[0]?.openfda?.pharm_class_epc ?? [];
}

export async function getDrugsInClass(
  pharmClass: string,
  excludeSubstance: string,
  signal?: AbortSignal
): Promise<string[]> {
  const data = await fdaFetch<OpenFDAResponse<CountResult>>(
    "/drug/ndc.json",
    {
      search: `openfda.pharm_class_epc.exact:"${pharmClass}"`,
      count: "openfda.substance_name.exact",
      limit: 10,
    },
    signal
  );

  if (!data?.results) return [];

  return data.results
    .map((r) => r.term)
    .filter((t) => t.toUpperCase() !== excludeSubstance.toUpperCase());
}
