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

/** Detect if query looks like an NDC code (digits with optional dash) */
const NDC_PATTERN = /^\d{4,5}(-\d{1,4})?$/;

/** Build an NDC search clause from a code like "70518" or "70518-2758" */
function ndcSearchClause(query: string): string | null {
  const clean = query.trim();
  if (!NDC_PATTERN.test(clean)) return null;
  const parts = clean.split("-");
  if (parts.length === 2) {
    // Full or partial NDC: both segments must match
    return `(product_ndc:${parts[0]}+AND+product_ndc:${parts[1]})`;
  }
  // Just the labeler segment — prefix wildcard
  return `product_ndc:${parts[0]}*`;
}

// ---------------------------------------------------------------------------
// Client-side relevance scoring
// ---------------------------------------------------------------------------

/** Check if any query token appears in the text (case-insensitive) */
function tokensMatch(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.some((t) => lower.includes(t));
}

/** Check if text starts with any query token */
function tokenPrefix(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.some((t) => lower.startsWith(t));
}

/**
 * Score a result against the user's query.
 * Higher = more relevant. Returns -1 to signal "filter this out entirely."
 *
 * Philosophy: the user is searching for an ALLERGEN, not a treatment.
 * The substance name is the ground truth — a product whose substance
 * matches the query IS the allergen. A product whose brand name matches
 * but substance doesn't is likely a remedy/treatment (e.g. "Pollen Distress"
 * with substance APIS MELLIFERA) and should rank much lower or be filtered.
 */
function scoreResult(
  item: AllergenSearchResult,
  queryTokens: string[]
): number {
  const nameMatch = tokensMatch(item.name, queryTokens);
  const substanceMatch = tokensMatch(item.substanceName, queryTokens);
  const genericMatch = item.genericName
    ? tokensMatch(item.genericName, queryTokens)
    : false;

  // NDC code match — user searched by product code, always relevant
  const ndcMatch = item.ndcCode
    ? queryTokens.some((t) => item.ndcCode!.replace(/-/g, "").includes(t) || item.ndcCode!.includes(t))
    : false;
  if (ndcMatch) return 200; // highest priority — exact product lookup

  // If the query doesn't appear in ANY user-visible field, drop entirely.
  if (!nameMatch && !substanceMatch && !genericMatch) return -1;

  // If ONLY the brand name matches but substance and generic don't,
  // this is likely a treatment product, not the allergen itself — drop it.
  // e.g. "Pollen Distress" (sub: APIS MELLIFERA), "Histastat Pollen" (sub: AMBROSIA WHOLE)
  if (nameMatch && !substanceMatch && !genericMatch) return -1;

  let score = 0;

  // Substance name is the strongest relevance signal — it IS the allergen
  if (substanceMatch) score += 80;
  if (tokenPrefix(item.substanceName, queryTokens)) score += 30;

  // Name match on top of substance match = very strong (user sees what they typed)
  if (nameMatch && substanceMatch) score += 40;
  else if (nameMatch) score += 20;

  // Name starts with query → user typed exactly this
  if (tokenPrefix(item.name, queryTokens)) score += 20;

  // Generic name match → useful signal
  if (genericMatch) score += 30;

  // Richer metadata = better-cataloged product → small boost
  if (item.ndcCode) score += 5;
  if (item.manufacturer) score += 3;
  if (item.route) score += 2;

  // Food: more reports = more commonly reported allergen
  if (item.reportCount) score += Math.min(item.reportCount / 100, 10);

  return score;
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

  // Check if query looks like an NDC code
  const ndcClause = ndcSearchClause(query);
  const ndcSearch = ndcClause
    ? `(brand_name:${wc}+OR+generic_name:${wc}+OR+active_ingredients.name:${wc}+OR+${ndcClause})`
    : `(brand_name:${wc}+OR+generic_name:${wc}+OR+active_ingredients.name:${wc})`;

  const [ndcResult, labelResult, foodResult] = await Promise.allSettled([
    // Arm A — NDC: brand names, generic names, active ingredients, NDC code + product metadata
    fdaFetch<
      OpenFDAResponse<{
        brand_name?: string;
        generic_name?: string;
        product_ndc?: string;
        labeler_name?: string;
        route?: string[];
        dosage_form?: string;
        product_type?: string;
        openfda?: { substance_name?: string[] };
        active_ingredients?: { name: string; strength?: string }[];
      }>
    >(
      "/drug/ndc.json",
      {
        search: ndcSearch,
        limit: 20,
      },
      signal
    ),

    // Arm B — Labels: enriched openfda object with canonical substance names + metadata
    fdaFetch<
      OpenFDAResponse<{
        openfda?: {
          brand_name?: string[];
          generic_name?: string[];
          substance_name?: string[];
          product_ndc?: string[];
          manufacturer_name?: string[];
          route?: string[];
          dosage_form?: string[];
          product_type?: string[];
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
        ndcCode: r.product_ndc,
        manufacturer: r.labeler_name,
        route: r.route?.[0],
        dosageForm: r.dosage_form,
        productType: r.product_type,
        strength: r.active_ingredients?.[0]?.strength,
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
          ndcCode: existing?.ndcCode ?? r.openfda?.product_ndc?.[0],
          manufacturer:
            existing?.manufacturer ?? r.openfda?.manufacturer_name?.[0],
          route: existing?.route ?? r.openfda?.route?.[0],
          dosageForm: existing?.dosageForm ?? r.openfda?.dosage_form?.[0],
          productType: existing?.productType ?? r.openfda?.product_type?.[0],
          strength: existing?.strength,
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
        reportCount: r.count,
      });
    }
  }

  // Score, filter, and rank results by client-side relevance heuristic.
  // Tokenize the original query for matching against result fields.
  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  return Array.from(seen.values())
    .map((item) => ({ item, score: scoreResult(item, queryTokens) }))
    .filter((r) => r.score >= 0) // drop irrelevant noise
    .sort((a, b) => b.score - a.score) // best matches first
    .map((r) => r.item)
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
