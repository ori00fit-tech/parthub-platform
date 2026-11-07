// PartHub icon set, shared by the storefront, seller portal and admin.
//
// One style everywhere: Lucide line icons (ISC licence, no attribution
// needed), 24px grid, round caps, 1.75 stroke, colour = currentColor.
// Three car-part icons Lucide lacks are drawn here in the same style.
//
//   <Icon name="brakes" />                      decorative (aria-hidden)
//   <Icon name="whatsapp" label="WhatsApp" />    announced to screen readers
//   <Icon name={categoryIcon(category.name)} />  category → icon
//
// Directional icons (arrows, chevrons) mirror automatically in RTL.
import {
  Archive, ArrowLeft, ArrowRight, Banknote, Receipt, BadgeCheck, Battery, Bell, Bookmark, Box, Camera, Car, CarFront,
  ChartColumn, Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleX, Clock, Cog, Columns2,
  Compass, Disc, Droplets, Fan, Filter, FolderTree, Hash, Hourglass, ImagePlus, Inbox, LayoutDashboard,
  LayoutGrid, Lightbulb, MapPin, Menu, MessageCircle, MessageSquare, MessageSquarePlus, Package,
  PackagePlus, PackageSearch, PartyPopper, Plus, Recycle, RefreshCw, Search, SearchX, Send, ShieldCheck,
  ShoppingBag, ShoppingCart, SlidersHorizontal, Sparkles, Star, Store, Tag, TriangleAlert, Truck, Users,
  Warehouse, Wrench, X, Zap, Armchair, Hammer, createLucideIcon,
} from "lucide-react";

// ---- drawn in Lucide's style (24×24, stroke only) ----
const Exhaust = createLucideIcon("Exhaust", [
  ["path", { d: "M3 15h9a3 3 0 0 0 3-3V9", key: "pipe" }],
  ["rect", { x: "13", y: "5", width: "6", height: "4", rx: "1", key: "muffler" }],
  ["path", { d: "M19 7h2", key: "tip" }],
  ["path", { d: "M5 19c1-1 2-1 3 0s2 1 3 0", key: "smoke" }],
]);
const GearShift = createLucideIcon("GearShift", [
  ["circle", { cx: "6", cy: "5", r: "2", key: "1" }],
  ["circle", { cx: "12", cy: "5", r: "2", key: "3" }],
  ["circle", { cx: "18", cy: "5", r: "2", key: "5" }],
  ["circle", { cx: "6", cy: "19", r: "2", key: "2" }],
  ["circle", { cx: "12", cy: "19", r: "2", key: "4" }],
  ["path", { d: "M6 7v10M12 7v10M18 7v5H6", key: "gate" }],
]);
const Tire = createLucideIcon("Tire", [
  ["circle", { cx: "12", cy: "12", r: "9", key: "outer" }],
  ["circle", { cx: "12", cy: "12", r: "4", key: "rim" }],
  ["path", { d: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4", key: "tread" }],
]);

export const ICONS = {
  // Categories
  "all-categories": LayoutGrid,
  brakes: Disc,
  engine: Cog,
  electrical: Zap,
  lighting: Lightbulb,
  battery: Battery,
  filters: Filter,
  fluids: Droplets,
  suspension: Wrench,
  transmission: GearShift,
  exhaust: Exhaust,
  tires: Tire,
  body: CarFront,
  cooling: Fan,
  interior: Armchair,
  tools: Hammer,
  "lowest-prices": Tag,
  // Functions
  vehicle: Car,
  oem: Hash,
  "request-part": MessageSquarePlus,
  send: Send,
  garage: Warehouse,
  compare: Columns2,
  cart: ShoppingCart,
  whatsapp: MessageCircle,
  delivery: Truck,
  search: Search,
  "no-results": SearchX,
  filter: SlidersHorizontal,
  bookmark: Bookmark,
  bell: Bell,
  location: MapPin,
  camera: Camera,
  "add-photo": ImagePlus,
  "add-part": PackagePlus,
  add: Plus,
  suggestion: Sparkles,
  celebrate: PartyPopper,
  menu: Menu,
  compass: Compass,
  part: Package,
  "part-search": PackageSearch,
  "arrow-forward": ArrowRight,
  "arrow-back": ArrowLeft,
  "chevron-forward": ChevronRight,
  "chevron-back": ChevronLeft,
  // Status
  "in-stock": CircleCheck,
  "low-stock": CircleAlert,
  "out-of-stock": CircleX,
  oem_origin: ShieldCheck,
  aftermarket: RefreshCw,
  used: Recycle,
  verified: BadgeCheck,
  featured: Star,
  pending: Clock,
  waiting: Hourglass,
  warning: TriangleAlert,
  ok: Check,
  close: X,
  // Portals
  dashboard: LayoutDashboard,
  inventory: Package,
  orders: ShoppingBag,
  requests: Inbox,
  reviews: Star,
  insights: ChartColumn,
  revenue: Banknote,
  statement: Receipt,
  store: Store,
  sellers: Users,
  parts: Wrench,
  categories: FolderTree,
  vehicles: Car,
  messages: MessageSquare,
  approve: Check,
  reject: X,
  archive: Archive,
  box: Box,
};

// Icons that point somewhere: flipped for right-to-left languages.
const DIRECTIONAL = new Set(["arrow-forward", "arrow-back", "chevron-forward", "chevron-back", "send"]);

export function Icon({ name, label, className = "h-5 w-5", strokeWidth = 1.75, ...rest }) {
  const Component = ICONS[name] || Box;
  const classes = [className, DIRECTIONAL.has(name) ? "rtl:-scale-x-100" : ""].filter(Boolean).join(" ");
  return label ? (
    <Component className={classes} strokeWidth={strokeWidth} role="img" aria-label={label} {...rest} />
  ) : (
    <Component className={classes} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" {...rest} />
  );
}

// Category name or slug (any of the three languages) → icon name.
const CATEGORY_RULES = [
  [/brake|frein|فرامل/i, "brakes"],
  [/batter|بطار/i, "battery"],
  [/light|éclair|eclair|إنارة|ضوء/i, "lighting"],
  [/electr|élec|كهرب/i, "electrical"],
  [/filter|filtre|فلتر/i, "filters"],
  [/fluid|oil|huile|liquide|زيت|سوائل/i, "fluids"],
  [/suspens|steer|direction|تعليق|مقود/i, "suspension"],
  [/transmis|gearbox|drivetrain|boîte|ناقل/i, "transmission"],
  [/exhaust|échapp|echapp|عادم/i, "exhaust"],
  [/tire|tyre|wheel|pneu|jante|إطار|عجل/i, "tires"],
  [/body|exterior|carross|هيكل/i, "body"],
  [/cool|refroid|تبريد/i, "cooling"],
  [/interior|accessor|intérieur|داخل/i, "interior"],
  [/tool|outil|أدوات/i, "tools"],
  [/engine|moteur|محرك/i, "engine"],
];
export function categoryIcon(nameOrSlug) {
  const text = String(nameOrSlug || "");
  for (const [re, icon] of CATEGORY_RULES) if (re.test(text)) return icon;
  return "part";
}
