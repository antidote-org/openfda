const BASE_URL =
  process.env.NEXT_PUBLIC_OPENFDA_BASE_URL ?? "https://api.fda.gov";

interface OpenFDAParams {
  search?: string;
  count?: string;
  limit?: number;
  skip?: number;
}

export async function fdaFetch<T>(
  endpoint: string,
  params: OpenFDAParams,
  signal?: AbortSignal
): Promise<T | null> {
  // Build query string manually — OpenFDA expects raw `+` as space separators
  // and URLSearchParams encodes them as %2B which breaks queries.
  const parts: string[] = [];
  if (params.search) parts.push(`search=${params.search}`);
  if (params.count) parts.push(`count=${params.count}`);
  if (params.limit) parts.push(`limit=${params.limit}`);
  if (params.skip) parts.push(`skip=${params.skip}`);

  const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
  const url = `${BASE_URL}${endpoint}${qs}`;

  const res = await fetch(url, { signal });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`OpenFDA API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
