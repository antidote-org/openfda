# OpenFDA Search Syntax Findings

**Date**: 2026-03-29
**Objective**: Document what works and what breaks when constructing search queries against the OpenFDA API, based on actual testing.

---

## The `+` Operator

In OpenFDA's search syntax, `+` is the **field/term separator** (acts like AND or space). It is NOT a literal plus sign.

**Query Attempted**:
```
/drug/ndc.json?search=brand_name:"penicillin"+generic_name:"penicillin"&limit=5
```
**Parsing**: `+` joins two field:value clauses as implicit AND.

**Result**: Works — returns results where BOTH brand_name and generic_name match. But this is overly restrictive for typeahead search.

---

## Quoted vs Unquoted Values

| Syntax | Behavior | Example |
|---|---|---|
| `field:"value"` | **Exact phrase match** — must match the full token | `brand_name:"penicillin"` matches "Penicillin" but NOT "Penicillin V Potassium" as a prefix |
| `field:value` | **Term match** — matches the analyzed token | `brand_name:penicillin` matches any record where the brand_name field contains the token "penicillin" |
| `field:value*` | **Prefix/wildcard match** — matches any token starting with value | `brand_name:penic*` matches "penicillin", "penicillin v potassium", etc. |

### Critical Finding

**Query Attempted**:
```
/drug/ndc.json?search=brand_name:"penic"&limit=5
```
**Parsing**: Exact phrase match for "penic".

**Result**: **Zero results.** "penic" is not a complete token in any brand name. Quoted searches require the exact analyzed phrase.

---

**Query Attempted**:
```
/drug/ndc.json?search=brand_name:penic*&limit=5
```
**Parsing**: Wildcard prefix match for anything starting with "penic".

**Result**: **205 results.** All penicillin products found.

**Takeaway for typeahead**: Always use `field:term*` (unquoted + wildcard) for autocomplete. Never quote partial input.

---

## OR Syntax

**Query Attempted**:
```
/drug/ndc.json?search=brand_name:penic*+generic_name:penic*&limit=5
```
**Parsing**: `+` acts as AND — requires "penic*" in BOTH fields.

**Result**: Works but overly restrictive. A drug with brand_name "Amoxil" and generic_name "amoxicillin" would NOT match a search for "amox*" since "amox" isn't in the brand_name.

---

**Query Attempted**:
```
/drug/ndc.json?search=(brand_name:penic*+OR+generic_name:penic*)&limit=5
```
**Parsing**: Explicit OR — matches in either field. Parentheses group the clause.

**Result**: **205 results.** Correct behavior — matches any product where EITHER field starts with "penic".

**Takeaway**: Use `(field1:term*+OR+field2:term*)` for multi-field typeahead search.

---

## URLSearchParams Encoding Issue

### The Bug

When using JavaScript's `URLSearchParams` to construct the query:

```typescript
url.searchParams.set("search", "(brand_name:penic*+OR+generic_name:penic*)");
```

`URLSearchParams` encodes `+` as `%2B` (literal plus sign), producing:
```
?search=(brand_name:penic*%2BOR%2Bgeneric_name:penic*)
```

OpenFDA does NOT interpret `%2B` as a separator — the query is treated as a single malformed term and returns zero results.

### The Fix

Build the query string manually:

```typescript
const qs = `search=(brand_name:penic*+OR+generic_name:penic*)`;
const url = `${BASE_URL}/drug/ndc.json?${qs}`;
```

This preserves the raw `+` signs that OpenFDA requires.

**Takeaway**: Never use `URLSearchParams` for OpenFDA search queries. Construct the URL string directly.

---

## Wildcard Limitations

- Wildcards (`*`) only work at the **end** of a term (prefix match): `penic*` works, `*cillin` does NOT
- Cannot combine wildcards with quotes: `"penic*"` searches for the literal string "penic*"
- Wildcards on very short terms (1-2 chars) may be slow or return too many results
- Our app uses a minimum of 2 characters before firing a search

---

## Field Path Syntax for Nested Objects

Nested fields use dot notation:

```
patient.drug.openfda.substance_name.exact:"PENICILLIN V POTASSIUM"
```

The `.exact` suffix is required for exact-match on keyword fields (used in `count` queries and precise filtering). Without `.exact`, the field is searched as analyzed text.

| Suffix | Behavior |
|---|---|
| `field:value` | Analyzed/tokenized match |
| `field.exact:"value"` | Exact keyword match (case-sensitive) |

---

## Practical Query Patterns for Allergy Finder

### Typeahead (partial input)
```
/drug/ndc.json?search=(brand_name:{input}*+OR+generic_name:{input}*)&limit=20
/food/event.json?search=products.industry_name:{input}*&count=products.industry_name.exact&limit=10
```

### Reaction statistics (after selection)
```
/drug/event.json?search=patient.drug.openfda.substance_name.exact:"{substance}"&count=patient.reaction.reactionmeddrapt.exact&limit=20
```

### Total event count (for insights panel)
```
/drug/event.json?search=patient.drug.openfda.substance_name.exact:"{substance}"&limit=1
→ read meta.results.total
```

### Cross-reactivity (pharmacologic class lookup)
```
/drug/ndc.json?search=openfda.substance_name.exact:"{substance}"&limit=1
→ read openfda.pharm_class_epc

/drug/ndc.json?search=openfda.pharm_class_epc.exact:"{class}"&count=openfda.substance_name.exact&limit=10
```
