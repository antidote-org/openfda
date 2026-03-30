# Elasticsearch Search Capabilities via OpenFDA

**Date**: 2026-03-29
**Objective**: Document how Elasticsearch powers the OpenFDA API search layer, what it gives us for free, and how to leverage it properly. This is the engine behind every query in the Allergy Finder — understanding it is non-negotiable.

---

## How OpenFDA Exposes Elasticsearch

The OpenFDA API is a thin REST layer over **Elasticsearch 7.x**. Every endpoint (`/drug/ndc.json`, `/drug/event.json`, etc.) maps to an Elasticsearch index. The `search` query parameter is passed almost directly to Elasticsearch's [`query_string` query](https://www.elastic.co/guide/en/elasticsearch/reference/7.x/query-dsl-query-string-query.html).

This means we're not searching a dumb database — we're querying a full-text search engine with:
- Text analysis (tokenization, lowercasing, stemming)
- Inverted indices for sub-second lookups across millions of documents
- Wildcard and prefix matching
- Boolean logic
- Relevance scoring

---

## Text Analysis: Why Common Names Work

When a document like this NDC record gets indexed:

```json
{
  "brand_name": "Standardized Bermuda Grass",
  "generic_name": "Cynodon dactylon"
}
```

Elasticsearch's **standard analyzer** processes the text fields at index time:

1. **Tokenization** — splits on whitespace and punctuation:
   - `"Standardized Bermuda Grass"` → `["standardized", "bermuda", "grass"]`
   - `"Cynodon dactylon"` → `["cynodon", "dactylon"]`

2. **Lowercasing** — all tokens stored lowercase:
   - `"Bermuda"` → `"bermuda"`

3. **Inverted index** — each token maps to the documents containing it:
   ```
   "grass"     → [doc_1, doc_47, doc_203, ...]
   "bermuda"   → [doc_1, doc_88, ...]
   "cynodon"   → [doc_1, doc_12, ...]
   ```

**Result**: Searching `brand_name:grass*` matches `"Standardized Bermuda Grass"` because the token `"grass"` is in the inverted index. The user doesn't need to know the product's full name, its latin name, or the exact field structure.

---

## `.exact` vs Analyzed Fields

Every text field in OpenFDA exists in **two forms**:

| Field | Type | Behavior |
|---|---|---|
| `brand_name` | `text` (analyzed) | Tokenized, lowercased. `brand_name:grass` matches "Standardized Bermuda Grass" |
| `brand_name.exact` | `keyword` (not analyzed) | Stored as-is. `brand_name.exact:"Standardized Bermuda Grass"` must match the full string exactly |

### When to use which

| Use Case | Field | Why |
|---|---|---|
| **Typeahead / search** | `brand_name:term*` | Leverages tokenization — partial input matches |
| **Count / aggregate** | `brand_name.exact` | Groups by full value, not individual tokens |
| **Exact lookup** | `brand_name.exact:"Full Name"` | Avoids false positives from token overlap |

### Verified Example

**Query Attempted**:
```
/drug/event.json?search=patient.drug.openfda.substance_name:penicillin&count=patient.reaction.reactionmeddrapt.exact
```
**Parsing**: Search uses the analyzed `substance_name` field (tokenized match). Count uses `.exact` (full reaction term, not individual words).

**Result**: Search finds all penicillin-related events. Count returns `"RASH"`, `"URTICARIA"`, `"ANAPHYLACTIC REACTION"` — not broken into `"rash"`, `"anaphylactic"`, `"reaction"` as separate terms.

---

## Query Syntax Reference

OpenFDA passes the `search` parameter to Elasticsearch's `query_string` parser. Here's what that gives us:

### Basic Field Search
```
brand_name:penicillin
```
Matches any document where the `brand_name` field contains the token "penicillin".

### Wildcards (Prefix Matching)
```
brand_name:penic*
```
Matches tokens starting with "penic" — essential for typeahead.

**Limitation**: Wildcard only works at the END of a term. `*cillin` does NOT work via the public API.

### Boolean Operators
```
brand_name:penicillin AND generic_name:potassium
brand_name:penicillin OR brand_name:amoxicillin
NOT brand_name:aspirin
```

In URL form, `+` acts as the separator (like a space):
```
search=brand_name:penicillin+AND+generic_name:potassium
```

### Grouping with Parentheses
```
(brand_name:penic*+OR+generic_name:penic*)
```
Groups sub-expressions. Critical for multi-field typeahead.

### Exact Phrases (Quoted)
```
brand_name:"Penicillin V Potassium"
```
Matches the exact phrase as a sequence of tokens. NOT a substring — all tokens must appear in order.

### Range Queries
```
effective_time:[20200101+TO+20261231]
```
Works on date and numeric fields.

### Field Existence
```
_exists_:openfda.substance_name
```
Matches documents where the field is present.

---

## Multi-Field Search Strategy

For the Allergy Finder typeahead, we search across multiple fields simultaneously:

```
(brand_name:{input}*+OR+generic_name:{input}*)
```

### Why this works across allergen types

| User Types | Tokens Matched | Products Found |
|---|---|---|
| `penic` | `penic*` → "penicillin" | Penicillin V Potassium, Pfizerpen, etc. |
| `grass` | `grass*` → "grass" | Standardized Bermuda Grass, Zone grasses |
| `dust mite` | `dust*` + `mite*` → "dust", "mite" | Pest and Dustmite Formula, D. farinae |
| `bee` | `bee*` → "bee" | Bee Venom products, Bee Pollen |
| `mold` | `mold*` → "mold" | AHH Mold Mix |
| `ragweed` | `ragweed*` → "ragweed" | Ragweed allergen extracts |
| `aspirin` | `aspirin*` → "aspirin" | Aspirin, Aspirin EC, Bayer, etc. |

Elasticsearch doesn't care if it's a drug, a pollen extract, or a venom kit — the tokenization and inverted index treat them all the same.

---

## Count Queries (Aggregations)

The `count` parameter maps to Elasticsearch's **terms aggregation**:

```
/drug/event.json?search=patient.drug.openfda.substance_name.exact:"PENICILLIN"&count=patient.reaction.reactionmeddrapt.exact
```

Returns the top terms by frequency:
```json
{
  "results": [
    { "term": "RASH", "count": 12847 },
    { "term": "URTICARIA", "count": 8203 },
    { "term": "ANAPHYLACTIC REACTION", "count": 3102 }
  ]
}
```

### Limits
- Max **1,000 unique terms** returned per count query
- Only **term frequency** — no avg, sum, percentile, cardinality, or histogram
- The `search` filter applies BEFORE the aggregation (acts as a filter context)

---

## Relevance Scoring

Elasticsearch returns results **ranked by relevance** (TF-IDF / BM25 scoring). This means:

- A document where "penicillin" appears in both `brand_name` AND `generic_name` scores higher than one where it appears in only one field
- Shorter fields with the match term score higher (field-length normalization)
- Rarer terms score higher than common ones (inverse document frequency)

We don't control scoring via the OpenFDA API, but it works in our favor — the most relevant products naturally appear first in typeahead results.

---

## What Elasticsearch Gives Us vs What the API Restricts

| Capability | Elasticsearch Has It | OpenFDA Exposes It |
|---|---|---|
| Full-text search | Yes | Yes (`search` param) |
| Tokenization / analysis | Yes | Yes (automatic) |
| Wildcard / prefix | Yes | Yes (trailing `*` only) |
| Boolean logic | Yes | Yes (`AND`, `OR`, `NOT`) |
| Phrase matching | Yes | Yes (quoted strings) |
| Terms aggregation | Yes | Yes (`count` param) |
| Relevance scoring | Yes | Yes (default ranking) |
| Fuzzy matching | Yes | **No** (not exposed) |
| Nested bool queries | Yes | **No** (query_string only) |
| Multi-field boosting | Yes | **No** |
| Scroll / deep pagination | Yes | **No** (skip capped at 25,000) |
| Full aggregation DSL | Yes | **No** (count only) |
| Geo queries | Yes | **No** |
| Highlighting | Yes | **No** |
| Suggesters / autocomplete | Yes | **No** |

### Running Locally Unlocks Everything

The OpenFDA repo's `docker-compose.yml` stands up a local Elasticsearch 7.14.1 instance. Hitting it directly (bypassing the API layer) gives access to the full Elasticsearch DSL — fuzzy matching, nested queries, complex aggregations, scroll pagination, suggesters, and highlighting.

---

## Practical Implications for Allergy Finder

1. **No static allergen lists needed** — Elasticsearch's tokenization bridges common names to scientific names automatically
2. **Typeahead is fast** — inverted index lookups are O(1), not table scans
3. **Multi-field OR search** is the right pattern for our use case — catches brand names, generic names, and product descriptions
4. **`.exact` suffix is mandatory for count queries** — otherwise aggregations break on individual tokens
5. **Wildcard at end only** — `penic*` works, `*cillin` doesn't. Design the UX around prefix typing
6. **Relevance ranking is free** — most relevant results surface first without any custom sorting
7. **Rate limits are the real bottleneck**, not search capability — local ES removes this entirely
