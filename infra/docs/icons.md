# PartHub icons

One icon set for the storefront, seller portal and admin: [Lucide](https://lucide.dev) line icons (ISC licence, no attribution needed) plus three drawn in the same style (exhaust, gear-shift, tyre). Defined in `packages/shared/src/icons/index.jsx`.

```jsx
import { Icon, categoryIcon } from "@parthub/shared/icons";

<Icon name="brakes" />                         // decorative (aria-hidden)
<Icon name="whatsapp" label="WhatsApp" />       // announced to screen readers
<Icon name={categoryIcon(category.name)} />     // category name in AR/FR/EN → icon
```

Rules:

- Use a name from the table, not a Lucide component directly, so the set stays consistent.
- Size with Tailwind (`h-5 w-5` default); colour follows the text colour.
- Arrows and chevrons (`arrow-forward`, `chevron-back`, …) flip automatically in Arabic.
- Don't use emoji for UI icons: they look different on every phone.
- Need a new icon? Add it to `ICONS` with a semantic name and list it here.

## Categories

| Name | Lucide icon |
|---|---|
| `all-categories` | LayoutGrid |
| `brakes` | Disc |
| `engine` | Cog |
| `electrical` | Zap |
| `lighting` | Lightbulb |
| `battery` | Battery |
| `filters` | Filter |
| `fluids` | Droplets |
| `suspension` | Wrench |
| `transmission` | GearShift |
| `exhaust` | Exhaust |
| `tires` | Tire |
| `body` | CarFront |
| `cooling` | Fan |
| `interior` | Armchair |
| `tools` | Hammer |
| `lowest-prices` | Tag |

## Functions

| Name | Lucide icon |
|---|---|
| `vehicle` | Car |
| `oem` | Hash |
| `request-part` | MessageSquarePlus |
| `send` | Send |
| `garage` | Warehouse |
| `compare` | Columns2 |
| `cart` | ShoppingCart |
| `whatsapp` | MessageCircle |
| `delivery` | Truck |
| `search` | Search |
| `no-results` | SearchX |
| `filter` | SlidersHorizontal |
| `bookmark` | Bookmark |
| `bell` | Bell |
| `location` | MapPin |
| `camera` | Camera |
| `add-photo` | ImagePlus |
| `add-part` | PackagePlus |
| `add` | Plus |
| `suggestion` | Sparkles |
| `celebrate` | PartyPopper |
| `menu` | Menu |
| `compass` | Compass |
| `part` | Package |
| `part-search` | PackageSearch |
| `arrow-forward` | ArrowRight |
| `arrow-back` | ArrowLeft |
| `chevron-forward` | ChevronRight |
| `chevron-back` | ChevronLeft |

## Status

| Name | Lucide icon |
|---|---|
| `in-stock` | CircleCheck |
| `low-stock` | CircleAlert |
| `out-of-stock` | CircleX |
| `oem_origin` | ShieldCheck |
| `aftermarket` | RefreshCw |
| `used` | Recycle |
| `verified` | BadgeCheck |
| `featured` | Star |
| `pending` | Clock |
| `waiting` | Hourglass |
| `warning` | TriangleAlert |
| `ok` | Check |
| `close` | X |

## Portals

| Name | Lucide icon |
|---|---|
| `dashboard` | LayoutDashboard |
| `inventory` | Package |
| `orders` | ShoppingBag |
| `requests` | Inbox |
| `reviews` | Star |
| `insights` | ChartColumn |
| `store` | Store |
| `sellers` | Users |
| `parts` | Wrench |
| `categories` | FolderTree |
| `vehicles` | Car |
| `messages` | MessageSquare |
| `approve` | Check |
| `reject` | X |
| `archive` | Archive |
| `box` | Box |
