# OpenFDA API Limitations Audit

**Date**: 2026-03-29
**Objective**: Document the operational constraints of using the public OpenFDA API (`api.fda.gov`) for production use.

---

## Rate Limits

| Tier | Limit | Notes |
|---|---|---|
| No API key | 240 requests/minute | Per IP address |
| With API key | 120,000 requests/day | Free key from api.fda.gov |

**Implication**: For a multi-user app, we'd burn through the daily limit fast. The local Elasticsearch instance (via this repo's Docker Compose) has no rate limits.

---

## Pagination Limits

**Query Attempted**:
```
/drug/event.json?search=patient.reaction.reactionmeddrapt:rash&limit=100&skip=25001
```
**Parsing**: Attempt to paginate past 25,000 results.

**Result**: OpenFDA caps `skip` at **25,000**. Combined with `limit` (max 1000), you can access at most **26,000 results** per query. Datasets with millions of records (FAERS has 20M+) cannot be fully traversed via the API.

---

## Count Query Limits

- `count` parameter returns a maximum of **1,000 unique terms**
- No sum, average, percentile, or histogram aggregations — only term frequency counts
- Cannot count on nested fields in some endpoints

---

## Search Syntax Constraints

The `search` parameter uses Elasticsearch **query_string** syntax, NOT the full Elasticsearch DSL. This means:

| Supported | Not Supported |
|---|---|
| Field-level search (`field:value`) | Nested bool queries |
| Wildcards (`penic*`) | Script fields / computed values |
| Boolean operators (`AND`, `OR`, `NOT`) | Aggregation pipelines |
| Exact match with quotes (`"exact phrase"`) | Fuzzy with edit distance control |
| Range queries (`field:[min+TO+max]`) | Geo queries |
| Grouping with parentheses | Join/lookup across indices |

---

## Cross-Endpoint Limitations

- **No joins**: Cannot query across endpoints in a single call (e.g., "find drug labels for substances with >100 adverse events")
- Each endpoint maps to a single Elasticsearch index
- Cross-referencing requires multiple API calls and client-side joining

---

## Data Freshness

| Endpoint | Typical Update Frequency |
|---|---|
| `/drug/event.json` (FAERS) | Quarterly |
| `/drug/label.json` (SPL) | Weekly-ish |
| `/drug/ndc.json` | Monthly |
| `/food/event.json` (CAERS) | Quarterly |
| `/device/event.json` (MAUDE) | Monthly |

Data is not real-time. There's a lag between FDA receiving reports and them appearing in the API.

---

## Response Size Limits

- Maximum `limit` per request: **1,000 results**
- No streaming or cursor-based pagination
- Large result sets require multiple sequential requests

---

## Mitigation: Local Instance

Running the OpenFDA Elasticsearch locally via `docker-compose.yml` in this repo removes:
- Rate limits (no throttling)
- Pagination caps (direct ES queries)
- Search syntax constraints (full Elasticsearch DSL available)
- Cross-endpoint limitations (can write custom queries spanning indices)

Trade-off: must run and maintain the data pipelines to keep data current.
