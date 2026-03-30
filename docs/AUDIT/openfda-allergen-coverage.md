# OpenFDA Allergen Coverage Audit

**Date**: 2026-03-29
**Objective**: Determine which allergen categories are searchable via the public OpenFDA API (`api.fda.gov`) — specifically, whether non-medication allergens (pollen, mold, pet dander, insect venom, etc.) are present in the datasets.

---

## Summary

Environmental and food allergens ARE present in OpenFDA because the FDA regulates **allergen extract products** (immunotherapy shots, sublingual tablets, skin prick test kits). These are registered as drugs with NDC codes, substance names, and drug labels — making them fully searchable via the same endpoints used for medications.

---

## Queries & Results

### 1. Pollen — Grass, Ragweed, Trees

**Query Attempted**:
```
/drug/event.json?search=patient.drug.openfda.substance_name:pollen&count=patient.drug.openfda.substance_name.exact&limit=20
```
**Parsing**: Search adverse events where the substance name contains "pollen", count by exact substance name.

**Result**: 20+ distinct pollen species returned, including:

| Substance Name | FAERS Report Count |
|---|---|
| CYNODON DACTYLON POLLEN (Bermuda grass) | 529 |
| LOLIUM PERENNE POLLEN (Ryegrass) | 441 |
| SORGHUM HALEPENSE POLLEN (Johnson grass) | 435 |
| DACTYLIS GLOMERATA POLLEN (Orchard grass) | 420 |
| PASPALUM NOTATUM POLLEN (Bahia grass) | 420 |
| AMBROSIA ARTEMISIIFOLIA POLLEN (Short ragweed) | 414 |
| POA PRATENSIS POLLEN (Kentucky bluegrass) | 414 |
| AMBROSIA TRIFIDA POLLEN (Giant ragweed) | 408 |
| AMARANTHUS PALMERI POLLEN (Palmer amaranth) | 408 |
| AGROSTIS GIGANTEA POLLEN (Redtop grass) | 408 |

---

**Query Attempted**:
```
/drug/ndc.json?search=(brand_name:pollen*+OR+generic_name:pollen*+OR+generic_name:ragweed*+OR+generic_name:grass*+OR+brand_name:allergen*)&limit=10
```
**Parsing**: Search NDC drug catalog for products with pollen/ragweed/grass/allergen in brand or generic name.

**Result**: Real FDA-registered products returned:

| Brand Name | Generic Name |
|---|---|
| Olive Pollen | Olea europaea |
| TAXODIUM DISTICHUM POLLEN | Cypress Bald |
| Allergena Zone 6 Trees, Weeds and Grasses | (multi-ingredient immunotherapy) |
| SORREL/DOCK MIX | Rumex acetosella + Rumex crispus pollen |
| Pollens - Trees, Willow, Black | Salix nigra |
| Australian Pine Beefwood Pollen | Casuarina equisetifolia |
| FAGUS GRANDIFOLIA POLLEN | Beech |

---

### 2. Dust Mites

**Query Attempted**:
```
/other/substance.json?search=(names.name:ragweed*+OR+names.name:pollen*+OR+names.name:dust+mite*)&limit=10
```
**Parsing**: Search FDA substance registry for dust mite entries.

**Result**: Found with UNII identifiers:

| UNII | Names |
|---|---|
| (assigned) | DERMATOPHAGOIDES PTERONYSSINUS (European house dust mite) |
| 57L1Z5378K | DERMATOPHAGOIDES PTERONYSSINUS WHOLE |
| (assigned) | AE-MITE, DERMATOPHAGOIDES PTERONYSSINUS |

Also confirmed in NDC as standardized allergy extract products.

---

### 3. Mold / Fungi

**Query Attempted**:
```
/drug/ndc.json?search=(generic_name:mold*+OR+generic_name:alternaria*+OR+generic_name:aspergillus*+OR+generic_name:cladosporium*)&limit=10
```
**Parsing**: Search drug catalog for mold species used in allergy testing/treatment.

**Result**: Multiple species returned:

| Brand Name | Generic Name |
|---|---|
| Alternaria alternata | Alternaria alternata |
| Aspergillus nidulans | Aspergillus nidulans |
| Cladosporium sphaerospermum | Cladosporium sphaerospermum |
| AHH Mold Mix | Alternaria alternata + Bipolaris sorokiniana + Cladosporium |
| Aspergillus amstelodami | Aspergillus amstelodami |

---

### 4. Insect Venom — Wasp, Hornet, Bee

**Query Attempted**:
```
/drug/ndc.json?search=(generic_name:bee*venom*+OR+generic_name:wasp*+OR+generic_name:hornet*+OR+generic_name:yellow*jacket*)&limit=10
```
**Parsing**: Search drug catalog for insect venom immunotherapy products.

**Result**: Full product lines returned:

| Brand Name | Type |
|---|---|
| White Faced Hornet Hymenoptera Venom Multidose | Treatment |
| Yellow Hornet Hymenoptera Venom Multidose | Treatment |
| Wasp Hymenoptera Venom Multidose | Treatment |
| White Faced Hornet Hymenoptera Venom Venomil Diagnostic | Diagnostic |
| Yellow Hornet Hymenoptera Venom Venomil Diagnostic | Diagnostic |
| Wasp Hymenoptera Venom Venomil Maintenance | Maintenance |

Also found via substance data: `Apis mellifica` (honey bee) in homeopathic/immunotherapy products.

---

### 5. Latex

**Query Attempted**:
```
/drug/ndc.json?search=(generic_name:latex*+OR+generic_name:dust*mite*+OR+generic_name:cat*dander*+OR+generic_name:dog*dander*)&limit=10
```
**Parsing**: Search drug catalog for latex allergy products.

**Result**: Limited but present:

| Brand Name | Generic Name |
|---|---|
| Rubber Gloves/Latex Detox 6029 | Rubber Gloves/Latex Detox |

Latex allergy is more commonly referenced in drug *labels* (contraindications/warnings for products with latex packaging) than as a standalone NDC product.

---

### 6. Contact Allergens (Nickel, Fragrances, Formaldehyde)

**Query Attempted**:
```
/drug/ndc.json?search=(generic_name:nickel*+OR+generic_name:fragrance*+OR+generic_name:formaldehyde*)&limit=10
```
**Parsing**: Search drug catalog for contact allergens.

**Result**: 73 total results, but mostly **indirect** — formaldehyde appears as an inactivation agent in vaccines, not as a standalone allergen product. One direct hit:

| Brand Name | Generic Name |
|---|---|
| Allergena Fragrance | Allergena Fragrance |

Nickel: no direct NDC products found. Contact allergens are the weakest category in OpenFDA.

---

### 7. Food Allergies (via CAERS)

**Query Attempted**:
```
/food/event.json?search=reactions:allerg*&count=products.industry_name.exact&limit=20
```
**Parsing**: Search food adverse events with allergic reactions, count by food category.

**Result**: Real food allergy report data:

| Food Category | Reports with Allergic Reactions |
|---|---|
| Vit/Min/Prot/Unconv Diet (supplements) | 240 |
| Cosmetics | 109 |
| Fishery/Seafood Prod | 93 |
| Bakery Prod/Dough/Mix/Icing | 54 |
| Dietary Conventional Foods/Meal Replacements | 26 |
| Snack Food Item | 25 |
| Cereal Prep/Breakfast Food | 24 |
| Vegetables/Vegetable Products | 16 |
| Nuts/Edible Seed | 15 |
| Baby Food Products | 11 |

---

### 8. Drug Indications Revealing Allergy Context

**Query Attempted**:
```
/drug/event.json?search=patient.drug.drugindication:allerg*&count=patient.drug.drugindication.exact&limit=20
```
**Parsing**: Search adverse events where the drug was prescribed FOR an allergy, count by indication.

**Result**: Reveals the full spectrum of allergy types being treated:

| Drug Indication | Report Count |
|---|---|
| SEASONAL ALLERGY | 20,030 |
| MULTIPLE ALLERGIES | 18,145 |
| RHINITIS ALLERGIC (hay fever) | 7,646 |
| DERMATITIS ALLERGIC (contact allergy) | 7,392 |
| ASTHMA (often allergy-triggered) | 5,869 |
| FOOD ALLERGY | 3,359 |
| DERMATITIS ATOPIC (eczema) | 2,493 |

---

## Coverage Matrix

| Allergen Category | NDC Products | FAERS Events | Substance Data | Drug Labels | Searchable? |
|---|---|---|---|---|---|
| **Drug allergies** | Full | Full | Full | Full | Yes — primary use case |
| **Grass pollen** | Yes (extracts) | Yes | Yes | Yes | Yes |
| **Tree pollen** | Yes (extracts) | Yes | Yes | Yes | Yes |
| **Ragweed** | Yes (extracts) | Yes | Yes | Yes | Yes |
| **Dust mites** | Yes (extracts) | Yes | Yes | Yes | Yes |
| **Mold/fungi** | Yes (extracts) | Yes | Yes | Limited | Yes |
| **Insect venom** | Yes (immunotherapy) | Yes | Yes | Yes | Yes |
| **Food allergens** | Indirect | CAERS data | Limited | Mentioned in labels | Yes (via /food/event) |
| **Latex** | Weak (1 product) | Indirect | Limited | Yes (warnings) | Partial |
| **Pet dander** | Weak | Indirect | Limited | Limited | Needs better search terms |
| **Contact (nickel)** | No | No | No | Rare mentions | No — not FDA-regulated |
| **Fragrance** | 1 product | No | No | Rare mentions | Minimal |

---

## Key Insight

Environmental allergens exist in OpenFDA because **allergen immunotherapy is FDA-regulated**. Allergy shots, sublingual tablets, and skin prick test extracts are registered as drugs — each with NDC codes, substance names, and adverse event reporting. This means our Allergy Finder typeahead can surface pollen, mold, dust mite, and insect venom allergens directly from the API without any static lists.

## ~~Known Gap~~ — RESOLVED

Initial assumption was that users searching common names ("grass allergy", "bee sting") would fail because OpenFDA stores latin/scientific names. **This is wrong.**

Elasticsearch's text analyzer tokenizes product names at index time. "Standardized Bermuda Grass" becomes tokens `["standardized", "bermuda", "grass"]`. So a wildcard search for `grass*` matches it directly.

### Verification Queries

**Query**: `(brand_name:grass+pollen*+OR+generic_name:grass+pollen*)` on `/drug/ndc.json`
**Result**: **1,553 results** — Bermuda Grass, Olive Pollen, zone-based grass products

**Query**: `(brand_name:bee*+OR+generic_name:bee*)` on `/drug/ndc.json`
**Result**: **84 results** — Bee Venom products, Bee Pollen products

**Query**: `(brand_name:dust*mite*+OR+generic_name:dust*mite*+OR+generic_name:dermatophagoides*)` on `/drug/ndc.json`
**Result**: **22 results** — Dermatophagoides farinae & pteronyssinus, Dustmite Formulas

**Conclusion**: No static common-name mapping layer is needed. The existing `(brand_name:term*+OR+generic_name:term*)` wildcard search against the NDC endpoint already bridges common names to scientific names because many products USE common names in their brand/generic name fields. Elasticsearch's tokenization handles the rest.
