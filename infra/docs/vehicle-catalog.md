# Vehicle catalog and fitment

## Catalog
`vehicle_makes → vehicle_models → vehicle_generations → vehicle_engines`
(migrations 0016–0018). Initial Morocco data: `infra/d1/catalog/vehicles-morocco.txt`,
built into `0017_seed_vehicle_catalog.sql` by `infra/d1/catalog/build-seed.mjs`.

### Data quality (migration 0018)
| Column | Values |
|---|---|
| `source` | `seed` (initial lists), `seed_parthub` (Morocco list), `admin`, `seller_suggestion`, `imported` |
| `verification` | `unverified` (default), `admin_approved` (added or approved by an admin), `verified` (checked against a reliable source) |
| `vehicle_engines.specs_inferred` | `1` when fuel / cc / hp were read from the engine name ("1.5 dCi 90"); `0` once an admin marks the engine verified |

The initial list was compiled by PartHub, not taken from a licensed source: it
starts `unverified`. Admins mark generations and engines verified from the
admin "Vehicle catalog" page.

## Fitment rows (`part_compatibility`)
Make, model, years and engine are kept as text (search, older rows);
`generation_id` / `engine_id` link the row to the catalog when picked there.

`engine_scope` — a row without an engine is **not** "fits every engine":
| Value | Meaning |
|---|---|
| `specific` | only the engine on the row |
| `all` | the seller confirmed it fits every engine |
| `unspecified` | the engine was not given |

### Matching a buyer's car (search `/api/v1/search`, part page)
Same make, model and year, then:
| Row | Buyer chose an engine | Buyer did not |
|---|---|---|
| `all` | fits | fits |
| `specific`, same engine | fits | check the engine |
| `specific`, other engine | does not fit (hidden with fit=only) | check the engine |
| `unspecified` | check the engine | check the engine |
