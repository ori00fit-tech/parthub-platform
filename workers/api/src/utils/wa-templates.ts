// ============================================================
// WhatsApp template catalog — the one list of every template PartHub sends
//
// Each entry is tied to a real event in the code (`trigger`), one audience,
// and the exact variables the code sends, in order. The same list is used
// to send (utils/wa-notify.ts), to submit the templates to Meta and read
// their review status (Admin › WhatsApp › Templates), and for the docs.
//
// Meta's model: one template name, one version per language, all versions
// with the same variables. Rules followed here: Utility category (a message
// about the person's own order, request, claim, store or account), no body
// starting or ending with a variable, no two variables side by side, a
// footer that says how to stop (the webhook handles STOP).
//
// The first five were registered in French before this catalog: their
// names and variables stay, and their link stays in the body. The others
// put the link in a button ("https://parthub.autos/{{1}}"): shorter, and
// Meta checks the domain once.
// ============================================================

export const WA_LANGS = ["ar", "fr", "en"] as const;
export type WaLang = (typeof WA_LANGS)[number];
export type Texts = Record<WaLang, string>;

export type WaAudience = "buyer" | "seller" | "account";

export type WaTemplate = {
  name: string; // Meta template name
  audience: WaAudience;
  category: "UTILITY";
  trigger: string; // the event in the code that sends it
  params: Array<{ name: string; example: string }>;
  body: Texts;
  // Button to a page: base site + "/{{1}}", the code sends the path.
  button?: { site: "storefront" | "seller"; text: Texts; example: string };
  legacy?: boolean; // registered before the catalog (French): link in the body
};

export const WA_FOOTER: Texts = {
  ar: "أرسل STOP لإيقاف هذه الرسائل",
  fr: "Répondez STOP pour ne plus recevoir ces messages",
  en: "Reply STOP to stop these messages",
};

const TRACK: Texts = { ar: "تتبع الطلب", fr: "Suivre la commande", en: "Track the order" };
const SELLER_ORDER: Texts = { ar: "فتح الطلب", fr: "Ouvrir la commande", en: "Open the order" };
const SELLER_CLAIMS: Texts = { ar: "فتح المطالبات", fr: "Voir les réclamations", en: "Open claims" };

export const WA_TEMPLATES: WaTemplate[] = [
  // ── Requests and offers (registered in French first) ─────────────────
  {
    name: "parthub_new_request",
    audience: "seller",
    category: "UTILITY",
    trigger: "A buyer posts a part request that matches the store (make or category)",
    legacy: true,
    params: [
      { name: "part", example: "Plaquettes de frein avant" },
      { name: "vehicle", example: "Dacia Logan 2016" },
      { name: "city", example: "Tanger" },
      { name: "link", example: "https://seller.parthub.autos/requests/12" },
    ],
    body: {
      ar: "طلب قطعة جديد على PartHub: *{{1}}* لسيارة *{{2}}* في {{3}}.\nأرسل عرضك من هنا: {{4}}\nأول عرض جيد يربح الزبون غالباً.",
      fr: "Nouvelle demande de pièce sur PartHub : *{{1}}* pour *{{2}}* à {{3}}.\nEnvoyez votre offre ici : {{4}}\nLa première bonne offre gagne souvent le client.",
      en: "New part request on PartHub: *{{1}}* for a *{{2}}* in {{3}}.\nSend your offer here: {{4}}\nThe first good offer often wins the buyer.",
    },
  },
  {
    name: "parthub_new_offer",
    audience: "buyer",
    category: "UTILITY",
    trigger: "A seller sends the first offer on the buyer's part request",
    legacy: true,
    params: [
      { name: "part", example: "Plaquettes de frein avant" },
      { name: "seller", example: "Chafik Auto Parts" },
      { name: "price", example: "350.00 MAD" },
      { name: "link", example: "https://parthub.autos/requests/12" },
    ],
    body: {
      ar: "خبر سار! يقترح عليك *{{2}}* القطعة *{{1}}* بسعر *{{3}}*.\nقارن العروض واختر الأفضل: {{4}}\nلا تدفع إلا عند الاستلام.",
      fr: "Bonne nouvelle ! *{{2}}* vous propose *{{1}}* à *{{3}}*.\nComparez les offres et choisissez la meilleure : {{4}}\nVous payez seulement à la réception.",
      en: "Good news! *{{2}}* offers you *{{1}}* for *{{3}}*.\nCompare the offers and pick the best: {{4}}\nYou only pay on receipt.",
    },
  },
  {
    name: "parthub_offer_accepted",
    audience: "seller",
    category: "UTILITY",
    trigger: "The buyer accepts the seller's offer",
    legacy: true,
    params: [
      { name: "part", example: "Plaquettes de frein avant" },
      { name: "buyer", example: "Youssef" },
      { name: "link", example: "https://seller.parthub.autos/requests/12" },
    ],
    body: {
      ar: "قبل {{2}} عرضك على *{{1}}* 🎉\nمعلومات التواصل معه هنا: {{3}}\nتواصل معه اليوم لتأكيد التسليم.",
      fr: "Bonne nouvelle : {{2}} a accepté votre offre pour *{{1}}* 🎉\nSes coordonnées sont disponibles ici : {{3}}\nContactez-le aujourd'hui pour organiser la livraison.",
      en: "Good news: {{2}} accepted your offer for *{{1}}* 🎉\nTheir contact details are here: {{3}}\nContact them today to arrange delivery.",
    },
  },
  {
    name: "parthub_back_in_stock",
    audience: "buyer",
    category: "UTILITY",
    trigger: "A part the buyer asked to be told about is back in stock",
    legacy: true,
    params: [
      { name: "part", example: "Filtre à huile Peugeot 206" },
      { name: "price", example: "85.00 MAD" },
      { name: "link", example: "https://parthub.autos/parts/filtre-a-huile-peugeot-206" },
    ],
    body: {
      ar: "خبر سار! القطعة *{{1}}* متوفرة من جديد بسعر *{{2}}* على PartHub.\nاطلبها من هنا: {{3}}\nالكمية محدودة.",
      fr: "Bonne nouvelle ! *{{1}}* est de nouveau disponible à *{{2}}* sur PartHub.\nCommandez-la ici : {{3}}\nLe stock est limité.",
      en: "Good news! *{{1}}* is back in stock at *{{2}}* on PartHub.\nOrder it here: {{3}}\nStock is limited.",
    },
  },

  // ── Orders: seller side ───────────────────────────────────────────────
  {
    name: "parthub_new_order",
    audience: "seller",
    category: "UTILITY",
    trigger: "A buyer places an order with the store's parts",
    legacy: true,
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "items", example: "2 × Plaquettes Logan" },
      { name: "amount", example: "520.00 MAD" },
      { name: "city", example: "Fès" },
      { name: "link", example: "https://seller.parthub.autos/orders/42" },
    ],
    body: {
      ar: "طلب جديد على PartHub رقم *{{1}}*: {{2}}.\nالمبلغ الذي ستحصّله: *{{3}}* (مع التوصيل) — الزبون في {{4}}.\nأكّد الطلب من هنا: {{5}}\nالزبون ينتظر تأكيدك.",
      fr: "Nouvelle commande PartHub *{{1}}* : {{2}}.\nÀ encaisser : *{{3}}* (livraison comprise) — client à {{4}}.\nConfirmez-la ici : {{5}}\nLe client attend votre confirmation.",
      en: "New PartHub order *{{1}}*: {{2}}.\nTo collect: *{{3}}* (delivery included) — buyer in {{4}}.\nConfirm it here: {{5}}\nThe buyer is waiting for your confirmation.",
    },
  },

  // ── Orders: buyer side ────────────────────────────────────────────────
  {
    name: "parthub_order_received",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The buyer places an order",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "total", example: "520.00 MAD" },
    ],
    body: {
      ar: "شكراً! وصلنا طلبك *{{1}}* على PartHub.\nالمبلغ الذي ستدفعه عند الاستلام: *{{2}}*.\nسيؤكد البائع الطلب، وسنراسلك عند كل مرحلة.",
      fr: "Merci ! Votre commande *{{1}}* est bien reçue sur PartHub.\nMontant à payer à la réception : *{{2}}*.\nLe vendeur va la confirmer ; nous vous écrirons à chaque étape.",
      en: "Thank you! Your order *{{1}}* has been received on PartHub.\nAmount to pay on receipt: *{{2}}*.\nThe seller will confirm it; we will message you at each step.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_order_confirmed",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The seller confirms the order (delivery)",
    params: [
      { name: "seller", example: "Chafik Auto Parts" },
      { name: "reference", example: "PH-2026-00042" },
    ],
    body: {
      ar: "خبر سار: أكّد *{{1}}* طلبك *{{2}}*.\nالطلب قيد التجهيز، وسنراسلك عند الشحن.",
      fr: "Bonne nouvelle : *{{1}}* a confirmé votre commande *{{2}}*.\nElle est en préparation ; nous vous écrirons à l'expédition.",
      en: "Good news: *{{1}}* confirmed your order *{{2}}*.\nIt is being prepared; we will message you when it ships.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_pickup_ready",
    audience: "buyer",
    category: "UTILITY",
    // No pickup code in the message: Meta classes any message carrying a
    // code as Authentication (rejected as INCORRECT_CATEGORY). The code is
    // on the order page, behind the button.
    trigger: "The seller confirms a pickup order: the part is kept for the buyer",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "seller", example: "Chafik Auto Parts" },
      { name: "until", example: "15/11/2026" },
      { name: "address", example: "12 Rue Ibn Batouta, Tanger" },
    ],
    body: {
      ar: "طلبك *{{1}}* جاهز للاستلام عند *{{2}}*.\nالقطعة محجوزة لك حتى {{3}}.\nالعنوان: {{4}}.\nعند الوصول، اعرض صفحة طلبك على البائع (الزر أدناه)، وتدفع عند الاستلام.",
      fr: "Votre commande *{{1}}* est prête à retirer chez *{{2}}*.\nLa pièce vous est réservée jusqu'au {{3}}.\nAdresse : {{4}}.\nSur place, montrez la page de votre commande au vendeur (bouton ci-dessous) ; vous payez au retrait.",
      en: "Your order *{{1}}* is ready for pickup at *{{2}}*.\nThe part is kept for you until {{3}}.\nAddress: {{4}}.\nWhen you get there, show your order page to the seller (button below); you pay at pickup.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_order_shipped",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The seller marks the order shipped (carrier and tracking number if given)",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "seller", example: "Chafik Auto Parts" },
      { name: "carrier", example: "Amana" },
      { name: "tracking", example: "AM123456789MA" },
    ],
    body: {
      ar: "طلبك *{{1}}* في الطريق: شحنه *{{2}}*.\nشركة الشحن: {{3}} — رقم التتبع: {{4}}.\nجهّز المبلغ للدفع عند الاستلام.",
      fr: "Votre commande *{{1}}* est en route : *{{2}}* l'a expédiée.\nTransporteur : {{3}} — numéro de suivi : {{4}}.\nPréparez le montant à payer à la livraison.",
      en: "Your order *{{1}}* is on its way: *{{2}}* shipped it.\nCarrier: {{3}} — tracking number: {{4}}.\nHave the amount ready to pay on delivery.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_out_for_delivery",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The carrier reports the parcel out for delivery",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "amount", example: "520.00 MAD" },
    ],
    body: {
      ar: "طلبك *{{1}}* مع الموزع وسيصلك اليوم.\nجهّز *{{2}}* نقداً، وأبقِ هاتفك قريباً منك.",
      fr: "Votre commande *{{1}}* est en cours de livraison aujourd'hui.\nPréparez *{{2}}* en espèces et gardez votre téléphone à portée de main.",
      en: "Your order *{{1}}* is out for delivery today.\nHave *{{2}}* in cash ready and keep your phone nearby.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_delivery_attempt_failed",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The carrier reports a failed delivery attempt",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "carrier", example: "Amana" },
      { name: "reason", example: "Client injoignable" },
    ],
    body: {
      ar: "لم يتمكن الموزع من تسليم طلبك *{{1}}*.\nشركة الشحن: {{2}} — السبب: {{3}}.\nردّ على هذه الرسالة لنتفق على موعد جديد.",
      fr: "Le livreur n'a pas pu vous remettre votre commande *{{1}}*.\nTransporteur : {{2}} — motif : {{3}}.\nRépondez à ce message pour convenir d'un nouveau passage.",
      en: "The courier could not deliver your order *{{1}}*.\nCarrier: {{2}} — reason: {{3}}.\nReply to this message to arrange a new delivery.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_order_delivered",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The order is delivered or collected (seller, carrier or pickup code)",
    params: [{ name: "reference", example: "PH-2026-00042" }],
    body: {
      ar: "تم تسليم طلبك *{{1}}*. شكراً لثقتك في PartHub!\nإذا كانت هناك مشكلة في قطعة، أبلغ عنها من صفحة الطلب خلال 7 أيام.",
      fr: "Votre commande *{{1}}* est livrée. Merci de votre confiance !\nUn problème avec une pièce ? Signalez-le depuis la page de la commande sous 7 jours.",
      en: "Your order *{{1}}* has been delivered. Thank you for using PartHub!\nA problem with a part? Report it from the order page within 7 days.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_order_cancelled",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The seller (or PartHub) cancels the buyer's order, with a reason",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "seller", example: "Chafik Auto Parts" },
      { name: "reason", example: "Pièce plus disponible" },
    ],
    body: {
      ar: "للأسف، أُلغي طلبك *{{1}}* لدى *{{2}}*.\nالسبب: {{3}}.\nلن تدفع شيئاً. ابحث عن القطعة عند بائع آخر على PartHub.",
      fr: "Désolé, votre commande *{{1}}* chez *{{2}}* est annulée.\nMotif : {{3}}.\nVous n'avez rien à payer. Cherchez la pièce chez un autre vendeur PartHub.",
      en: "Sorry, your order *{{1}}* from *{{2}}* was cancelled.\nReason: {{3}}.\nYou have nothing to pay. Look for the part from another PartHub seller.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },

  // ── Shipping and cash on delivery: seller side ───────────────────────
  {
    name: "parthub_carrier_delivered",
    audience: "seller",
    category: "UTILITY",
    trigger: "The carrier reports the parcel delivered (and the cash collected)",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "carrier", example: "Amana" },
      { name: "cod", example: "520.00 MAD" },
    ],
    body: {
      ar: "سلّمت شركة الشحن طلبك *{{1}}*.\nشركة الشحن: {{2}} — المبلغ المحصّل: *{{3}}*.\nتابع تحويل المبلغ مع شركة الشحن.",
      fr: "La commande *{{1}}* est livrée par le transporteur.\nTransporteur : {{2}} — montant encaissé : *{{3}}*.\nSuivez le reversement avec le transporteur.",
      en: "Order *{{1}}* has been delivered by the carrier.\nCarrier: {{2}} — cash collected: *{{3}}*.\nFollow up the payout with the carrier.",
    },
    button: { site: "seller", text: SELLER_ORDER, example: "orders/42" },
  },
  {
    name: "parthub_delivery_returned",
    audience: "seller",
    category: "UTILITY",
    trigger: "The carrier reports the parcel returned (delivery failed)",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "carrier", example: "Amana" },
      { name: "reason", example: "Client absent" },
    ],
    body: {
      ar: "لم يتم تسليم الطلب *{{1}}* وهو في طريق العودة إليك.\nشركة الشحن: {{2}} — السبب: {{3}}.\nالكمية رجعت إلى مخزونك على PartHub.",
      fr: "La commande *{{1}}* n'a pas été livrée et revient chez vous.\nTransporteur : {{2}} — motif : {{3}}.\nLa quantité est remise dans votre stock PartHub.",
      en: "Order *{{1}}* was not delivered and is coming back to you.\nCarrier: {{2}} — reason: {{3}}.\nThe quantity is back in your PartHub stock.",
    },
    button: { site: "seller", text: SELLER_ORDER, example: "orders/42" },
  },

  {
    name: "parthub_delivery_returning",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The carrier (or the seller) reports the parcel going back to the seller",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "reason", example: "Client injoignable" },
    ],
    body: {
      ar: "لم يتم تسليم طلبك *{{1}}* وهو في طريق العودة إلى البائع.\nالسبب: {{2}}.\nإذا كنت ما زلت تريد القطعة، ردّ على هذه الرسالة اليوم.",
      fr: "Votre commande *{{1}}* n'a pas pu être livrée et repart chez le vendeur.\nMotif : {{2}}.\nSi vous voulez toujours la pièce, répondez à ce message aujourd'hui.",
      en: "Your order *{{1}}* could not be delivered and is going back to the seller.\nReason: {{2}}.\nIf you still want the part, reply to this message today.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_shipping_delayed",
    audience: "buyer",
    category: "UTILITY",
    trigger: "A shipped order has had no carrier update for several days (daily check)",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "days", example: "4" },
    ],
    body: {
      ar: "طلبك *{{1}}* يتأخر: لا جديد من شركة الشحن منذ {{2}} أيام.\nنتابع الأمر مع البائع وشركة الشحن، وسنراسلك عند أي جديد.",
      fr: "Votre commande *{{1}}* prend du retard : pas de nouvelles du transporteur depuis {{2}} jours.\nNous suivons cela avec le vendeur et le transporteur, et vous écrivons dès qu'il y a du nouveau.",
      en: "Your order *{{1}}* is late: no news from the carrier for {{2}} days.\nWe are following it up with the seller and the carrier, and will message you as soon as there is news.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_seller_shipping_delayed",
    audience: "seller",
    category: "UTILITY",
    trigger: "One of the store's shipped orders has had no carrier update for several days (daily check)",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "days", example: "4" },
      { name: "carrier", example: "Amana" },
    ],
    body: {
      ar: "الطلب *{{1}}* بلا جديد منذ {{2}} أيام (شركة الشحن: {{3}}).\nتحقق من الطرد مع شركة الشحن، ثم سجّل حالته في صفحة الطلب ليعرف الزبون.",
      fr: "La commande *{{1}}* n'a pas bougé depuis {{2}} jours (transporteur : {{3}}).\nVérifiez le colis auprès du transporteur, puis indiquez son statut sur la page de la commande pour informer le client.",
      en: "Order *{{1}}* has had no update for {{2}} days (carrier: {{3}}).\nCheck the parcel with the carrier, then record its status on the order page so the buyer knows.",
    },
    button: { site: "seller", text: SELLER_ORDER, example: "orders/42" },
  },

  // ── Returns and claims ────────────────────────────────────────────────
  {
    name: "parthub_claim_opened",
    audience: "seller",
    category: "UTILITY",
    trigger: "A buyer reports a problem with a delivered part (return claim)",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "part", example: "Alternateur Clio 3" },
      { name: "reason", example: "Pièce non compatible" },
    ],
    body: {
      ar: "أبلغ زبون عن مشكلة في الطلب *{{1}}*.\nالقطعة: {{2}} — السبب: {{3}}.\nردّ خلال 3 أيام بالقبول أو الرفض، وإلا تراجعها PartHub.",
      fr: "Un client signale un problème sur la commande *{{1}}*.\nPièce : {{2}} — motif : {{3}}.\nRépondez sous 3 jours (accepter ou refuser), sinon PartHub tranche.",
      en: "A buyer reported a problem with order *{{1}}*.\nPart: {{2}} — reason: {{3}}.\nAnswer within 3 days (accept or refuse), or PartHub decides.",
    },
    button: { site: "seller", text: SELLER_CLAIMS, example: "issues" },
  },
  {
    name: "parthub_claim_update",
    audience: "buyer",
    category: "UTILITY",
    trigger: "The buyer's claim changes: the seller answers, or PartHub decides",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "part", example: "Alternateur Clio 3" },
      { name: "status", example: "le vendeur accepte le retour" },
    ],
    body: {
      ar: "تحديث بخصوص مطالبتك على الطلب *{{1}}*.\nالقطعة: {{2}} — الحالة: *{{3}}*.\nالتفاصيل في صفحة الطلب.",
      fr: "Du nouveau sur votre réclamation pour la commande *{{1}}*.\nPièce : {{2}} — statut : *{{3}}*.\nLes détails sont sur la page de la commande.",
      en: "An update on your claim for order *{{1}}*.\nPart: {{2}} — status: *{{3}}*.\nThe details are on the order page.",
    },
    button: { site: "storefront", text: TRACK, example: "orders/PH-2026-00042/tracking" },
  },
  {
    name: "parthub_seller_claim_update",
    audience: "seller",
    category: "UTILITY",
    trigger: "A claim on the store changes: the buyer escalates or withdraws, or PartHub decides",
    params: [
      { name: "reference", example: "PH-2026-00042" },
      { name: "part", example: "Alternateur Clio 3" },
      { name: "status", example: "PartHub examine le dossier" },
    ],
    body: {
      ar: "تحديث بخصوص المطالبة على الطلب *{{1}}*.\nالقطعة: {{2}} — الحالة: *{{3}}*.\nالتفاصيل في بوابة البائع.",
      fr: "Du nouveau sur la réclamation de la commande *{{1}}*.\nPièce : {{2}} — statut : *{{3}}*.\nLes détails sont dans votre espace vendeur.",
      en: "An update on the claim for order *{{1}}*.\nPart: {{2}} — status: *{{3}}*.\nThe details are in your seller portal.",
    },
    button: { site: "seller", text: SELLER_CLAIMS, example: "issues" },
  },

  // ── Store and catalog ─────────────────────────────────────────────────
  {
    name: "parthub_store_approved",
    audience: "seller",
    category: "UTILITY",
    trigger: "PartHub approves (or re-activates) the store",
    params: [{ name: "store", example: "Chafik Auto Parts" }],
    body: {
      ar: "مرحباً! متجرك *{{1}}* أصبح مفعّلاً على PartHub.\nأضف قطعك مع صورة حقيقية لكل قطعة لتظهر للزبائن.",
      fr: "Bienvenue ! Votre boutique *{{1}}* est active sur PartHub.\nAjoutez vos pièces avec une vraie photo chacune pour qu'elles soient visibles.",
      en: "Welcome! Your store *{{1}}* is now active on PartHub.\nAdd your parts, each with a real photo, so buyers can see them.",
    },
    button: { site: "seller", text: { ar: "فتح المتجر", fr: "Ouvrir mon espace", en: "Open my store" }, example: "parts" },
  },
  {
    name: "parthub_store_blocked",
    audience: "seller",
    category: "UTILITY",
    trigger: "PartHub rejects or suspends the store, with a reason",
    params: [
      { name: "store", example: "Chafik Auto Parts" },
      { name: "reason", example: "Numéro de téléphone à vérifier" },
    ],
    body: {
      ar: "متجرك *{{1}}* غير منشور حالياً على PartHub.\nالسبب: {{2}}.\nردّ على هذه الرسالة إذا كانت لديك أسئلة.",
      fr: "Votre boutique *{{1}}* n'est pas publiée sur PartHub pour le moment.\nMotif : {{2}}.\nRépondez à ce message si vous avez des questions.",
      en: "Your store *{{1}}* is not published on PartHub for now.\nReason: {{2}}.\nReply to this message if you have questions.",
    },
  },
  {
    name: "parthub_parts_reviewed",
    audience: "seller",
    category: "UTILITY",
    trigger: "PartHub reviews the store's parts (one message per review batch)",
    params: [
      { name: "approved", example: "54" },
      { name: "rejected", example: "2" },
    ],
    body: {
      ar: "راجعت PartHub قطعك: *{{1}}* منشورة الآن، و{{2}} مرفوضة.\nسبب كل رفض مكتوب في المخزون.",
      fr: "PartHub a vérifié vos pièces : *{{1}}* sont en ligne, {{2}} refusées.\nLe motif de chaque refus est dans votre inventaire.",
      en: "PartHub reviewed your parts: *{{1}}* are now online, {{2}} rejected.\nEach rejection reason is in your inventory.",
    },
    button: { site: "seller", text: { ar: "فتح المخزون", fr: "Voir l'inventaire", en: "Open inventory" }, example: "parts" },
  },

  // ── Account security ──────────────────────────────────────────────────
  {
    name: "parthub_password_changed",
    audience: "account",
    category: "UTILITY",
    trigger: "The account password is changed (all other sessions are signed out)",
    params: [
      { name: "name", example: "Youssef" },
      { name: "when", example: "12/11/2026 14:05" },
    ],
    body: {
      // Without the word "password": Meta classed it as Authentication.
      ar: "مرحباً {{1}}، تم تعديل معلومات الدخول إلى حسابك على PartHub يوم {{2}}، وأُغلقت الجلسات على الأجهزة الأخرى.\nإذا لم تقم بذلك، ردّ على هذه الرسالة فوراً لنحمي حسابك.",
      fr: "Bonjour {{1}}, les informations de connexion de votre compte PartHub ont été modifiées le {{2}}, et les autres appareils ont été déconnectés.\nSi ce n'est pas vous, répondez tout de suite à ce message pour que nous protégions votre compte.",
      en: "Hello {{1}}, the sign-in details of your PartHub account were changed on {{2}}, and other devices were signed out.\nIf this was not you, reply to this message right away so we can protect your account.",
    },
  },
];

export const WA_TEMPLATE_BY_NAME: Record<string, WaTemplate> = Object.fromEntries(WA_TEMPLATES.map((t) => [t.name, t]));

// Short words sent inside a template ({{n}}), in the recipient's language.
export const WA_WORDS: Record<string, Texts> = {
  not_given: { ar: "غير محدد", fr: "non communiqué", en: "not given" },
  cancelled_by_parthub: { ar: "ألغتها PartHub", fr: "annulée par PartHub", en: "cancelled by PartHub" },
  claim_accepted: { ar: "البائع قبل الإرجاع", fr: "le vendeur accepte le retour", en: "the seller accepts the return" },
  claim_refused: { ar: "البائع رفض — يمكنك طلب تدخل PartHub", fr: "le vendeur refuse — vous pouvez demander l'arbitrage de PartHub", en: "the seller refused — you can ask PartHub to decide" },
  claim_escalated: { ar: "PartHub تراجع الملف", fr: "PartHub examine le dossier", en: "PartHub is reviewing the case" },
  claim_withdrawn: { ar: "الزبون سحب المطالبة", fr: "le client a retiré sa réclamation", en: "the buyer withdrew the claim" },
  claim_closed_buyer: { ar: "أُغلق الملف لصالح الزبون", fr: "dossier clos en faveur du client", en: "closed in the buyer's favour" },
  claim_closed_seller: { ar: "أُغلق الملف لصالح البائع", fr: "dossier clos en faveur du vendeur", en: "closed in the seller's favour" },
  claim_closed: { ar: "أُغلق الملف", fr: "dossier clos", en: "case closed" },
  claim_refunded: { ar: "البائع أكّد إرجاع المبلغ — أُغلق الملف", fr: "le vendeur confirme le remboursement — dossier clos", en: "the seller confirmed the refund — case closed" },
  claim_decided_buyer: { ar: "قررت PartHub لصالح الزبون: يسترجع البائع القطعة ويرد المبلغ", fr: "PartHub donne raison au client : le vendeur reprend la pièce et rembourse", en: "PartHub decided for the buyer: the seller takes the part back and refunds" },
  // Claim reasons (utils/issues.ts ISSUE_REASONS)
  reason_not_as_described: { ar: "غير مطابقة للوصف", fr: "non conforme à l'annonce", en: "not as described" },
  reason_damaged: { ar: "وصلت تالفة", fr: "arrivée endommagée", en: "arrived damaged" },
  reason_not_compatible: { ar: "غير متوافقة مع السيارة", fr: "non compatible avec le véhicule", en: "does not fit the vehicle" },
  reason_hidden_defect: { ar: "عيب خفي", fr: "défaut caché", en: "hidden defect" },
  reason_not_received: { ar: "لم يستلمها الزبون", fr: "non reçue par le client", en: "not received" },
  reason_wrong_part_ordered: { ar: "الزبون طلب قطعة خاطئة", fr: "le client s'est trompé de pièce", en: "the buyer ordered the wrong part" },
  reason_changed_mind: { ar: "الزبون غيّر رأيه", fr: "le client a changé d'avis", en: "the buyer changed their mind" },
  reason_other: { ar: "سبب آخر", fr: "autre motif", en: "other reason" },
};

export function waWord(key: string, lang: WaLang): string {
  return WA_WORDS[key]?.[lang] ?? WA_WORDS[key]?.fr ?? key;
}

// What PartHub sends to Meta to create one language of a template.
export function metaTemplatePayload(t: WaTemplate, lang: WaLang, urls: { storefront: string; seller: string }) {
  const components: Array<Record<string, unknown>> = [
    { type: "BODY", text: t.body[lang], example: { body_text: [t.params.map((p) => p.example)] } },
    { type: "FOOTER", text: WA_FOOTER[lang] },
  ];
  if (t.button) {
    components.push({
      type: "BUTTONS",
      buttons: [{ type: "URL", text: t.button.text[lang], url: `${urls[t.button.site]}/{{1}}`, example: [t.button.example] }],
    });
  }
  return { name: t.name, language: lang, category: t.category, components };
}

// Checks the catalog against Meta's rules (used by the tests).
export function templateProblems(t: WaTemplate): string[] {
  const out: string[] = [];
  if (!/^[a-z0-9_]{1,512}$/.test(t.name)) out.push(`${t.name}: name must be lowercase letters, digits and _`);
  for (const lang of WA_LANGS) {
    const body = t.body[lang];
    if (!body) {
      out.push(`${t.name}/${lang}: no text`);
      continue;
    }
    const vars = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    const expected = t.params.map((_, i) => i + 1);
    const unique = [...new Set(vars)].sort((a, b) => a - b);
    if (unique.join(",") !== expected.join(",")) out.push(`${t.name}/${lang}: variables ${unique.join(",")} instead of ${expected.join(",")}`);
    const trimmed = body.trim().replace(/[*_~]/g, "");
    if (/^\{\{\d+\}\}/.test(trimmed)) out.push(`${t.name}/${lang}: starts with a variable`);
    if (/\{\{\d+\}\}[.!?]?$/.test(trimmed)) out.push(`${t.name}/${lang}: ends with a variable`);
    if (/\{\{\d+\}\}\s*\{\{\d+\}\}/.test(body)) out.push(`${t.name}/${lang}: two variables side by side`);
    if (body.length > 1024) out.push(`${t.name}/${lang}: body over 1024 characters`);
    if (WA_FOOTER[lang].length > 60) out.push(`footer/${lang}: over 60 characters`);
    if (t.button && t.button.text[lang].length > 25) out.push(`${t.name}/${lang}: button text over 25 characters`);
  }
  return out;
}
