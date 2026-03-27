import { fdaFetch } from "./openfda-client";
import type {
  CountResult,
  DrugSearchResult,
  FoodSearchResult,
  OpenFDAResponse,
} from "./types";

export async function searchDrugs(
  query: string,
  signal?: AbortSignal
): Promise<DrugSearchResult[]> {
  const escaped = query.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ").trim();
  if (!escaped) return [];

  // Use wildcard so partial input like "penic" matches "penicillin"
  const wildcard = `${escaped}*`;

  const data = await fdaFetch<
    OpenFDAResponse<{
      brand_name?: string;
      generic_name?: string;
      openfda?: { substance_name?: string[] };
      active_ingredients?: { name: string }[];
    }>
  >(
    "/drug/ndc.json",
    {
      search: `(brand_name:${wildcard}+OR+generic_name:${wildcard})`,
      limit: 20,
    },
    signal
  );

  if (!data?.results) return [];

  const seen = new Set<string>();
  const results: DrugSearchResult[] = [];

  for (const r of data.results) {
    const substance =
      r.openfda?.substance_name?.[0] ??
      r.active_ingredients?.[0]?.name ??
      r.generic_name;
    if (!substance) continue;

    const key = substance.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      name: r.brand_name ?? r.generic_name ?? substance,
      genericName: r.generic_name,
      substanceName: substance,
      source: "ndc",
    });
  }

  return results.slice(0, 10);
}

export async function searchFoods(
  query: string,
  signal?: AbortSignal
): Promise<FoodSearchResult[]> {
  const escaped = query.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ").trim();
  if (!escaped) return [];

  const data = await fdaFetch<OpenFDAResponse<CountResult>>(
    "/food/event.json",
    {
      search: `products.industry_name:${escaped}*`,
      count: "products.industry_name.exact",
      limit: 10,
    },
    signal
  );

  if (!data?.results) return [];

  return data.results.map((r) => ({
    name: r.term,
    industryName: r.term,
  }));
}

export async function getReactionsForDrug(
  substanceName: string,
  signal?: AbortSignal
): Promise<CountResult[]> {
  const data = await fdaFetch<OpenFDAResponse<CountResult>>(
    "/drug/event.json",
    {
      search: `patient.drug.openfda.substance_name.exact:"${substanceName}"`,
      count: "patient.reaction.reactionmeddrapt.exact",
      limit: 20,
    },
    signal
  );

  return data?.results ?? [];
}

export async function getEventCountForDrug(
  substanceName: string,
  signal?: AbortSignal
): Promise<number> {
  const data = await fdaFetch<OpenFDAResponse<unknown>>(
    "/drug/event.json",
    {
      search: `patient.drug.openfda.substance_name.exact:"${substanceName}"`,
      limit: 1,
    },
    signal
  );

  return data?.meta?.results?.total ?? 0;
}

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
