// PartHub legal texts: terms of use, seller agreement, returns policy and
// privacy policy, in English, Arabic and French. Shared by the storefront
// (public pages) and the seller portal (agreement to accept).
//
// LEGAL_VERSION must match workers/api/src/utils/legal.ts: it is stored with
// each acceptance. Change both when a text changes in substance.
//
// Section shape: { title, paragraphs?: string[], items?: string[],
// steps?: string[], table?: { head: string[], rows: string[][] }, after?: string[] }
// "{email}" is replaced with LEGAL_CONTACT_EMAIL when rendered.

export const LEGAL_VERSION = "2026-11-06";
export const LEGAL_CONTACT_EMAIL = "support@parthub.autos";

export const LEGAL_DOC_IDS = ["terms", "seller", "returns", "privacy"];

const terms = {
  en: {
    title: "Terms of use",
    summary: "The rules for using PartHub as a buyer or visitor.",
    sections: [
      {
        title: "What PartHub is",
        paragraphs: [
          "PartHub is an online marketplace that connects buyers with independent auto parts sellers in Morocco: shops, importers, distributors and dismantlers.",
          "PartHub does not own or sell the parts listed. Each listing is published by a seller, who is responsible for the part, its description, its price, the receipt or invoice and the delivery. PartHub reviews stores and listings before they are published, but this review does not replace the seller's responsibility.",
        ],
      },
      {
        title: "Your account",
        items: [
          "Give accurate information: name, phone number and email.",
          "Keep your password private. You are responsible for what is done with your account.",
          "PartHub may suspend an account used for fraud or abuse.",
        ],
      },
      {
        title: "Orders and payment",
        items: [
          "Your order is sent to the seller, who confirms availability and fitment, sometimes by phone or WhatsApp.",
          "Prices are shown in Moroccan dirhams (MAD). Shipping fees, if any, are shown before you confirm.",
          "For now, you pay the seller directly (for example cash on delivery), not PartHub.",
          "A seller can cancel an order it cannot fulfil. You see it on your order page.",
        ],
      },
      {
        title: "Fitment",
        paragraphs: [
          "Compatibility information comes from sellers. Before ordering, check it against your vehicle (make, model, year, engine) and, when you can, against the OEM part number or your VIN. Ask the seller if in doubt. A part ordered by mistake follows the returns policy.",
        ],
      },
      {
        title: "Returns and complaints",
        paragraphs: [
          "Returns follow the PartHub returns policy. In short: you can ask for a return within 7 days of delivery, and the seller pays when the part is faulty, damaged, different from its description or not compatible because of the seller's information.",
        ],
      },
      {
        title: "Reviews",
        paragraphs: [
          "Only buyers whose order was delivered can rate a part. Reviews must be honest and about the part and the seller. PartHub checks each review before publishing it and does not publish insults, advertising, personal data or off-topic content.",
        ],
      },
      {
        title: "What is not allowed",
        items: [
          "Fraudulent orders or false information.",
          "Offering or requesting stolen, counterfeit or dangerous parts.",
          "Harassing sellers or other users.",
          "Copying the site's content or data in bulk, or disrupting the service.",
        ],
      },
      {
        title: "Responsibility",
        paragraphs: [
          "PartHub provides the platform and works to keep it available and accurate, without guaranteeing uninterrupted service. PartHub is not the seller of the parts and is not a party to the sale between you and the seller.",
          "Nothing in these terms limits your rights as a consumer under Moroccan law, in particular law 31-08 on consumer protection.",
        ],
      },
      {
        title: "Changes and contact",
        paragraphs: [
          "PartHub may update these terms. The date at the top shows the current version, and important changes are announced on the site. Questions: {email}.",
        ],
      },
    ],
  },
  ar: {
    title: "شروط الاستخدام",
    summary: "قواعد استعمال PartHub كمشترٍ أو زائر.",
    sections: [
      {
        title: "ما هي PartHub",
        paragraphs: [
          "PartHub سوق إلكتروني يربط المشترين ببائعي قطع غيار السيارات المستقلين في المغرب: المحلات والمستوردين والموزعين ومحلات التفكيك (لاكاس).",
          "لا تملك PartHub القطع المعروضة ولا تبيعها. كل عرض ينشره بائع، وهو المسؤول عن القطعة ووصفها وثمنها والوصل أو الفاتورة والتوصيل. تراجع PartHub المتاجر والعروض قبل نشرها، لكن هذه المراجعة لا تُغني عن مسؤولية البائع.",
        ],
      },
      {
        title: "حسابك",
        items: [
          "أدخل معلومات صحيحة: الاسم ورقم الهاتف والبريد الإلكتروني.",
          "احتفظ بكلمة المرور لنفسك. أنت مسؤول عمّا يتم بحسابك.",
          "يمكن لـ PartHub إيقاف حساب يُستعمل في الاحتيال أو الإساءة.",
        ],
      },
      {
        title: "الطلبات والدفع",
        items: [
          "يُرسَل طلبك إلى البائع، فيؤكد التوفّر والتوافق، أحياناً بالهاتف أو واتساب.",
          "الأسعار معروضة بالدرهم المغربي (MAD). رسوم التوصيل، إن وُجدت، تظهر قبل التأكيد.",
          "حالياً تدفع للبائع مباشرة (مثلاً عند الاستلام)، وليس لـ PartHub.",
          "يمكن للبائع إلغاء طلب لا يستطيع تنفيذه، وتراه في صفحة طلبك.",
        ],
      },
      {
        title: "التوافق",
        paragraphs: [
          "معلومات التوافق يقدّمها البائعون. قبل الطلب، طابقها مع سيارتك (العلامة والطراز والسنة والمحرك)، ومع رقم القطعة الأصلي OEM أو رقم الهيكل VIN متى أمكن. اسأل البائع عند الشك. القطعة المطلوبة خطأً تخضع لسياسة الإرجاع.",
        ],
      },
      {
        title: "الإرجاع والشكايات",
        paragraphs: [
          "يخضع الإرجاع لسياسة الإرجاع في PartHub. باختصار: يمكنك طلب الإرجاع خلال 7 أيام من الاستلام، ويتحمّل البائع التكلفة إذا كانت القطعة معيبة أو تالفة أو مختلفة عن الوصف أو غير متوافقة بسبب معلومات البائع.",
        ],
      },
      {
        title: "التقييمات",
        paragraphs: [
          "لا يقيّم القطعة إلا مشترٍ تم توصيل طلبه. يجب أن يكون التقييم صادقاً ويخص القطعة والبائع. تراجع PartHub كل تقييم قبل نشره، ولا تنشر السب أو الإشهار أو المعطيات الشخصية أو ما لا علاقة له بالموضوع.",
        ],
      },
      {
        title: "ما هو ممنوع",
        items: [
          "الطلبات الاحتيالية أو المعلومات الكاذبة.",
          "عرض أو طلب قطع مسروقة أو مقلّدة أو خطيرة.",
          "مضايقة البائعين أو المستخدمين الآخرين.",
          "نسخ محتوى الموقع أو بياناته بكميات كبيرة، أو تعطيل الخدمة.",
        ],
      },
      {
        title: "المسؤولية",
        paragraphs: [
          "توفّر PartHub المنصة وتعمل على إبقائها متاحة ودقيقة، دون ضمان خدمة بلا انقطاع. PartHub ليست بائعة القطع وليست طرفاً في البيع بينك وبين البائع.",
          "لا شيء في هذه الشروط يحدّ من حقوقك كمستهلك وفق القانون المغربي، خصوصاً القانون 31-08 المتعلق بحماية المستهلك.",
        ],
      },
      {
        title: "التعديلات والتواصل",
        paragraphs: [
          "قد تحدّث PartHub هذه الشروط. التاريخ في الأعلى يبيّن النسخة الحالية، ويُعلَن عن التغييرات المهمة في الموقع. للأسئلة: {email}.",
        ],
      },
    ],
  },
  fr: {
    title: "Conditions d'utilisation",
    summary: "Les règles d'utilisation de PartHub pour les acheteurs et les visiteurs.",
    sections: [
      {
        title: "Qu'est-ce que PartHub",
        paragraphs: [
          "PartHub est une place de marché en ligne qui met en relation les acheteurs avec des vendeurs indépendants de pièces auto au Maroc : magasins, importateurs, distributeurs et casses.",
          "PartHub ne possède ni ne vend les pièces proposées. Chaque annonce est publiée par un vendeur, responsable de la pièce, de sa description, de son prix, du reçu ou de la facture et de la livraison. PartHub vérifie les boutiques et les annonces avant publication, mais cette vérification ne remplace pas la responsabilité du vendeur.",
        ],
      },
      {
        title: "Votre compte",
        items: [
          "Donnez des informations exactes : nom, numéro de téléphone et e-mail.",
          "Gardez votre mot de passe pour vous. Vous êtes responsable de l'utilisation de votre compte.",
          "PartHub peut suspendre un compte utilisé pour une fraude ou un abus.",
        ],
      },
      {
        title: "Commandes et paiement",
        items: [
          "Votre commande est transmise au vendeur, qui confirme la disponibilité et la compatibilité, parfois par téléphone ou WhatsApp.",
          "Les prix sont affichés en dirhams marocains (MAD). Les frais de livraison éventuels sont affichés avant la confirmation.",
          "Pour le moment, vous payez directement le vendeur (par exemple à la livraison), et non PartHub.",
          "Un vendeur peut annuler une commande qu'il ne peut pas honorer. Vous le voyez sur la page de votre commande.",
        ],
      },
      {
        title: "Compatibilité",
        paragraphs: [
          "Les informations de compatibilité viennent des vendeurs. Avant de commander, vérifiez-les avec votre véhicule (marque, modèle, année, moteur) et, si possible, avec la référence OEM ou votre numéro VIN. En cas de doute, demandez au vendeur. Une pièce commandée par erreur suit la politique de retour.",
        ],
      },
      {
        title: "Retours et réclamations",
        paragraphs: [
          "Les retours suivent la politique de retour de PartHub. En bref : vous pouvez demander un retour dans les 7 jours suivant la livraison, et le vendeur paie lorsque la pièce est défectueuse, endommagée, différente de sa description ou incompatible à cause des informations du vendeur.",
        ],
      },
      {
        title: "Avis",
        paragraphs: [
          "Seuls les acheteurs dont la commande a été livrée peuvent noter une pièce. Les avis doivent être sincères et porter sur la pièce et le vendeur. PartHub vérifie chaque avis avant publication et ne publie pas d'insultes, de publicité, de données personnelles ni de contenu hors sujet.",
        ],
      },
      {
        title: "Ce qui est interdit",
        items: [
          "Les commandes frauduleuses ou les fausses informations.",
          "Proposer ou demander des pièces volées, contrefaites ou dangereuses.",
          "Harceler les vendeurs ou d'autres utilisateurs.",
          "Copier massivement le contenu ou les données du site, ou perturber le service.",
        ],
      },
      {
        title: "Responsabilité",
        paragraphs: [
          "PartHub fournit la plateforme et veille à ce qu'elle reste disponible et exacte, sans garantir un service ininterrompu. PartHub n'est pas le vendeur des pièces et n'est pas partie à la vente entre vous et le vendeur.",
          "Rien dans ces conditions ne limite vos droits de consommateur selon le droit marocain, notamment la loi 31-08 sur la protection du consommateur.",
        ],
      },
      {
        title: "Modifications et contact",
        paragraphs: [
          "PartHub peut mettre à jour ces conditions. La date en haut indique la version en vigueur, et les changements importants sont annoncés sur le site. Questions : {email}.",
        ],
      },
    ],
  },
};

const seller = {
  en: {
    title: "Seller agreement",
    summary: "The rules for selling on PartHub. Accepting them is required to open a store.",
    sections: [
      {
        title: "Who can sell",
        paragraphs: [
          "Shops, importers, distributors, dismantlers and individuals selling auto parts in Morocco. The information about you and your store (name, phone number, city, business details) must be true.",
          "PartHub reviews each store before it goes live and may ask for documents, for example the ICE or trade register number of a business.",
        ],
      },
      {
        title: "Your listings",
        items: [
          "Describe each part honestly: title, condition (new, used, refurbished), origin (OEM, aftermarket, used), part number when known, and real photos of the part.",
          "Give accurate vehicle compatibility.",
          "Keep the price (in MAD) and stock up to date, and remove parts you no longer have.",
          "Do not list stolen, counterfeit, dangerous or prohibited parts.",
          "PartHub may refuse, hide or remove a listing that breaks these rules, and tells you why.",
        ],
      },
      {
        title: "Orders",
        items: [
          "Confirm or cancel each order within 2 working days.",
          "Contact the buyer when needed to confirm fitment before shipping.",
          "Ship the part described, well packed, with a receipt or invoice.",
          "Update the order status (shipped, delivered) in the seller portal.",
        ],
      },
      {
        title: "Returns and refunds",
        paragraphs: [
          "Follow the PartHub returns policy. You pay for the return when the part is faulty, damaged on arrival, different from its description, not compatible because of your information, or has a hidden defect (used parts). You cannot refuse a defect or non-conformity claim only because the part was fitted.",
          "Answer each claim in the seller portal (Returns) within 2 working days: accept it or explain why you refuse. Buyers pay you directly, so you refund them yourself, within 7 days of receiving the returned part (or of the decision when no return is needed), then mark the claim as refunded. When you and the buyer disagree, PartHub reviews the case and records its decision on the order.",
        ],
      },
      {
        title: "Reviews",
        paragraphs: [
          "Buyers rate parts after delivery. Do not review your own parts, offer rewards for reviews or pressure buyers.",
        ],
      },
      {
        title: "Buyer data",
        paragraphs: [
          "Use buyers' names, phone numbers and addresses only to handle their order. Do not share them or use them for unrelated marketing, in line with law 09-08 on the protection of personal data.",
        ],
      },
      {
        title: "Fees",
        paragraphs: [
          "Selling on PartHub is currently free. PartHub may introduce paid plans, paid visibility or commissions. You will be informed at least 30 days before any fee applies to you, and you can close your store if you do not accept it.",
        ],
      },
      {
        title: "Suspension",
        paragraphs: [
          "PartHub may suspend or close a store for false information, prohibited parts, repeated unresolved complaints, fraud or abuse. The reason is shown in your seller portal.",
        ],
      },
      {
        title: "Changes and contact",
        paragraphs: [
          "When this agreement changes, you may be asked to accept the new version in the seller portal. Questions: {email}.",
        ],
      },
    ],
  },
  ar: {
    title: "اتفاقية البائع",
    summary: "قواعد البيع على PartHub. قبولها شرط لفتح متجر.",
    sections: [
      {
        title: "من يمكنه البيع",
        paragraphs: [
          "المحلات والمستوردون والموزعون ومحلات التفكيك (لاكاس) والأفراد الذين يبيعون قطع غيار السيارات في المغرب. يجب أن تكون المعلومات عنك وعن متجرك (الاسم ورقم الهاتف والمدينة والمعلومات التجارية) صحيحة.",
          "تراجع PartHub كل متجر قبل تفعيله، وقد تطلب وثائق، مثل رقم التعريف الموحد ICE أو رقم السجل التجاري للشركات.",
        ],
      },
      {
        title: "عروضك",
        items: [
          "صِف كل قطعة بصدق: العنوان، والحالة (جديدة أو مستعملة أو مُجدّدة)، والمصدر (أصلية OEM أو بديلة أو مستعملة)، ورقم القطعة إن كان معروفاً، وصوراً حقيقية للقطعة.",
          "قدّم توافقاً دقيقاً مع السيارات.",
          "حدّث الثمن (بالدرهم) والمخزون باستمرار، واحذف القطع التي لم تعد عندك.",
          "لا تعرض قطعاً مسروقة أو مقلّدة أو خطيرة أو ممنوعة.",
          "يمكن لـ PartHub رفض عرض يخالف هذه القواعد أو إخفاؤه أو حذفه، مع إخبارك بالسبب.",
        ],
      },
      {
        title: "الطلبات",
        items: [
          "أكّد كل طلب أو ألغِه خلال يومي عمل.",
          "تواصل مع المشتري عند الحاجة لتأكيد التوافق قبل الشحن.",
          "اشحن القطعة الموصوفة، مغلّفة جيداً، مع وصل أو فاتورة.",
          "حدّث حالة الطلب (تم الشحن، تم التوصيل) في بوابة البائع.",
        ],
      },
      {
        title: "الإرجاع واسترجاع المبلغ",
        paragraphs: [
          "التزم بسياسة الإرجاع في PartHub. تتحمّل تكلفة الإرجاع إذا كانت القطعة معيبة، أو تالفة عند الوصول، أو مختلفة عن الوصف، أو غير متوافقة بسبب معلوماتك، أو بها عيب خفي (القطع المستعملة). لا يمكنك رفض شكوى عيب أو عدم مطابقة لمجرد أن القطعة رُكّبت.",
          "أجب عن كل شكوى في بوابة البائع (الإرجاع) خلال يومي عمل: اقبلها أو اشرح سبب الرفض. يدفع لك المشترون مباشرة، لذا تُرجع لهم المبلغ بنفسك خلال 7 أيام من استلام القطعة المُرجَعة (أو من القرار إن لم يلزم الإرجاع)، ثم تعلّم الشكوى على أنها مُسترجعة. عند الخلاف بينك وبين المشتري، تراجع PartHub الحالة وتسجّل قرارها في الطلب.",
        ],
      },
      {
        title: "التقييمات",
        paragraphs: [
          "يقيّم المشترون القطع بعد التوصيل. لا تقيّم قطعك بنفسك، ولا تقدّم مكافآت مقابل التقييمات، ولا تضغط على المشترين.",
        ],
      },
      {
        title: "معطيات المشترين",
        paragraphs: [
          "استعمل أسماء المشترين وأرقامهم وعناوينهم فقط لمعالجة طلباتهم. لا تشاركها ولا تستعملها لإشهار لا علاقة له بالطلب، وفق القانون 09-08 المتعلق بحماية المعطيات الشخصية.",
        ],
      },
      {
        title: "الرسوم",
        paragraphs: [
          "البيع على PartHub مجاني حالياً. قد تضيف PartHub باقات مدفوعة أو ظهوراً مدفوعاً أو عمولات. ستُبلَّغ قبل 30 يوماً على الأقل من تطبيق أي رسوم عليك، ويمكنك إغلاق متجرك إن لم تقبلها.",
        ],
      },
      {
        title: "الإيقاف",
        paragraphs: [
          "يمكن لـ PartHub إيقاف متجر أو إغلاقه بسبب معلومات كاذبة، أو قطع ممنوعة، أو شكايات متكررة دون حل، أو احتيال أو إساءة. يظهر السبب في بوابة البائع.",
        ],
      },
      {
        title: "التعديلات والتواصل",
        paragraphs: [
          "عند تعديل هذه الاتفاقية، قد يُطلب منك قبول النسخة الجديدة في بوابة البائع. للأسئلة: {email}.",
        ],
      },
    ],
  },
  fr: {
    title: "Contrat vendeur",
    summary: "Les règles pour vendre sur PartHub. Les accepter est obligatoire pour ouvrir une boutique.",
    sections: [
      {
        title: "Qui peut vendre",
        paragraphs: [
          "Les magasins, importateurs, distributeurs, casses et particuliers qui vendent des pièces auto au Maroc. Les informations sur vous et votre boutique (nom, téléphone, ville, informations commerciales) doivent être exactes.",
          "PartHub vérifie chaque boutique avant sa mise en ligne et peut demander des documents, par exemple l'ICE ou le numéro de registre de commerce d'une entreprise.",
        ],
      },
      {
        title: "Vos annonces",
        items: [
          "Décrivez chaque pièce honnêtement : titre, état (neuf, occasion, reconditionné), origine (OEM, adaptable, occasion), référence si connue, et de vraies photos de la pièce.",
          "Indiquez une compatibilité véhicule exacte.",
          "Tenez à jour le prix (en MAD) et le stock, et retirez les pièces que vous n'avez plus.",
          "Ne proposez pas de pièces volées, contrefaites, dangereuses ou interdites.",
          "PartHub peut refuser, masquer ou retirer une annonce qui enfreint ces règles, en vous indiquant pourquoi.",
        ],
      },
      {
        title: "Commandes",
        items: [
          "Confirmez ou annulez chaque commande sous 2 jours ouvrables.",
          "Contactez l'acheteur si nécessaire pour confirmer la compatibilité avant l'expédition.",
          "Expédiez la pièce décrite, bien emballée, avec un reçu ou une facture.",
          "Mettez à jour le statut de la commande (expédiée, livrée) dans l'espace vendeur.",
        ],
      },
      {
        title: "Retours et remboursements",
        paragraphs: [
          "Respectez la politique de retour de PartHub. Vous payez le retour lorsque la pièce est défectueuse, endommagée à l'arrivée, différente de sa description, incompatible à cause de vos informations, ou présente un vice caché (pièces d'occasion). Vous ne pouvez pas refuser une réclamation pour défaut ou non-conformité au seul motif que la pièce a été montée.",
          "Répondez à chaque réclamation dans l'espace vendeur (Retours) sous 2 jours ouvrables : acceptez-la ou expliquez votre refus. Les acheteurs vous paient directement : vous les remboursez vous-même, dans les 7 jours suivant la réception de la pièce retournée (ou la décision, si aucun retour n'est nécessaire), puis marquez la réclamation comme remboursée. En cas de désaccord avec l'acheteur, PartHub examine le dossier et inscrit sa décision sur la commande.",
        ],
      },
      {
        title: "Avis",
        paragraphs: [
          "Les acheteurs notent les pièces après la livraison. Ne notez pas vos propres pièces, n'offrez pas de récompense contre un avis et ne faites pas pression sur les acheteurs.",
        ],
      },
      {
        title: "Données des acheteurs",
        paragraphs: [
          "Utilisez les noms, téléphones et adresses des acheteurs uniquement pour traiter leur commande. Ne les partagez pas et ne les utilisez pas pour une prospection sans rapport, conformément à la loi 09-08 relative à la protection des données personnelles.",
        ],
      },
      {
        title: "Frais",
        paragraphs: [
          "Vendre sur PartHub est actuellement gratuit. PartHub pourra proposer des offres payantes, de la visibilité payante ou des commissions. Vous serez informé au moins 30 jours avant que des frais ne s'appliquent à vous, et vous pourrez fermer votre boutique si vous ne les acceptez pas.",
        ],
      },
      {
        title: "Suspension",
        paragraphs: [
          "PartHub peut suspendre ou fermer une boutique pour fausses informations, pièces interdites, réclamations répétées non résolues, fraude ou abus. Le motif est affiché dans votre espace vendeur.",
        ],
      },
      {
        title: "Modifications et contact",
        paragraphs: [
          "Lorsque ce contrat change, il peut vous être demandé d'accepter la nouvelle version dans l'espace vendeur. Questions : {email}.",
        ],
      },
    ],
  },
};

const returns = {
  en: {
    title: "Returns policy",
    summary: "How to return a part, and who pays.",
    sections: [
      {
        title: "Time limit",
        paragraphs: ["Ask for a return within 7 days of delivery."],
      },
      {
        title: "Who pays for the return",
        table: {
          head: ["Situation", "Who pays"],
          rows: [
            ["The part is different from its description", "Seller"],
            ["The part was damaged on arrival", "Seller"],
            ["Not compatible because of wrong information from the seller", "Seller"],
            ["Used part with a hidden defect (after checking)", "Seller"],
            ["The buyer ordered the wrong part", "Buyer"],
            ["The buyer changed their mind", "Buyer"],
          ],
        },
        after: ["The party responsible for the problem also pays the return shipping."],
      },
      {
        title: "Conditions",
        items: [
          "The part must be unused and not fitted, in its packaging when possible, except in case of a defect or non-conformity.",
          "Keep the receipt or invoice, and take photos of the part and its packaging.",
          "A seller cannot refuse a defect or non-conformity claim only because the part was fitted.",
        ],
      },
      {
        title: "How to ask for a return",
        steps: [
          "On your order page, choose \"Problem with this part?\", pick the reason and describe what happened. You can send photos to the seller on WhatsApp.",
          "The seller accepts or refuses within 2 working days. If they accept, agree with them how to send the part back.",
          "If the seller refuses or does not reply in time, ask PartHub to decide from the same page. PartHub reviews the case with both sides and records the decision on the order. You can also write to {email}.",
        ],
      },
      {
        title: "Refunds",
        paragraphs: [
          "You pay the seller directly, so the seller refunds you, within 7 days of receiving the returned part (or of the decision when no return is needed), by the payment method used or another method you agree on. When the seller is responsible, the return shipping is refunded too.",
        ],
      },
      {
        title: "Your rights",
        paragraphs: ["This policy does not limit your rights under Moroccan consumer law (law 31-08)."],
      },
    ],
  },
  ar: {
    title: "سياسة الإرجاع",
    summary: "كيف تُرجع قطعة، ومن يتحمّل التكلفة.",
    sections: [
      {
        title: "المهلة",
        paragraphs: ["اطلب الإرجاع خلال 7 أيام من الاستلام."],
      },
      {
        title: "من يتحمّل تكلفة الإرجاع",
        table: {
          head: ["الحالة", "من يدفع"],
          rows: [
            ["القطعة مختلفة عن الوصف", "البائع"],
            ["القطعة تالفة عند الوصول", "البائع"],
            ["غير متوافقة بسبب معلومات خاطئة من البائع", "البائع"],
            ["قطعة مستعملة بها عيب خفي (بعد التحقق)", "البائع"],
            ["المشتري طلب قطعة خاطئة", "المشتري"],
            ["المشتري غيّر رأيه", "المشتري"],
          ],
        },
        after: ["الطرف المتسبّب في المشكلة يتحمّل أيضاً تكلفة الشحن العكسي."],
      },
      {
        title: "الشروط",
        items: [
          "يجب أن تكون القطعة غير مستعملة وغير مركّبة، وفي غلافها متى أمكن، إلا في حالة العيب أو عدم المطابقة.",
          "احتفظ بالوصل أو الفاتورة، والتقط صوراً للقطعة وغلافها.",
          "لا يمكن للبائع رفض شكوى عيب أو عدم مطابقة لمجرد أن القطعة رُكّبت.",
        ],
      },
      {
        title: "كيف تطلب الإرجاع",
        steps: [
          "في صفحة طلبك، اختر \"مشكلة في هذه القطعة؟\"، وحدّد السبب وصِف ما حدث. يمكنك إرسال الصور للبائع عبر واتساب.",
          "يقبل البائع أو يرفض خلال يومي عمل. إن قبل، اتفق معه على طريقة إرجاع القطعة.",
          "إن رفض البائع أو لم يردّ في الوقت المحدد، اطلب من PartHub البتّ من الصفحة نفسها. تراجع PartHub الحالة مع الطرفين وتسجّل القرار في الطلب. يمكنك أيضاً مراسلتنا على {email}.",
        ],
      },
      {
        title: "استرجاع المبلغ",
        paragraphs: [
          "تدفع للبائع مباشرة، لذا يُرجع لك البائع المبلغ خلال 7 أيام من استلام القطعة المُرجَعة (أو من القرار إن لم يلزم الإرجاع)، بطريقة الدفع نفسها أو بطريقة أخرى تتفقان عليها. وعندما يكون البائع هو المسؤول، تُسترجع أيضاً تكلفة الشحن العكسي.",
        ],
      },
      {
        title: "حقوقك",
        paragraphs: ["هذه السياسة لا تحدّ من حقوقك وفق قانون حماية المستهلك المغربي (القانون 31-08)."],
      },
    ],
  },
  fr: {
    title: "Politique de retour",
    summary: "Comment retourner une pièce, et qui paie.",
    sections: [
      {
        title: "Délai",
        paragraphs: ["Demandez un retour dans les 7 jours suivant la livraison."],
      },
      {
        title: "Qui paie le retour",
        table: {
          head: ["Situation", "Qui paie"],
          rows: [
            ["La pièce est différente de sa description", "Vendeur"],
            ["La pièce est arrivée endommagée", "Vendeur"],
            ["Incompatible à cause d'informations erronées du vendeur", "Vendeur"],
            ["Pièce d'occasion avec un vice caché (après vérification)", "Vendeur"],
            ["L'acheteur a commandé la mauvaise pièce", "Acheteur"],
            ["L'acheteur a changé d'avis", "Acheteur"],
          ],
        },
        after: ["La partie responsable du problème paie aussi les frais de retour."],
      },
      {
        title: "Conditions",
        items: [
          "La pièce doit être neuve d'utilisation et non montée, dans son emballage si possible, sauf en cas de défaut ou de non-conformité.",
          "Gardez le reçu ou la facture, et prenez des photos de la pièce et de son emballage.",
          "Un vendeur ne peut pas refuser une réclamation pour défaut ou non-conformité au seul motif que la pièce a été montée.",
        ],
      },
      {
        title: "Comment demander un retour",
        steps: [
          "Sur la page de votre commande, choisissez « Un problème avec cette pièce ? », indiquez le motif et décrivez ce qui s'est passé. Vous pouvez envoyer des photos au vendeur sur WhatsApp.",
          "Le vendeur accepte ou refuse sous 2 jours ouvrables. S'il accepte, convenez avec lui du renvoi de la pièce.",
          "Si le vendeur refuse ou ne répond pas à temps, demandez à PartHub de trancher depuis la même page. PartHub examine le dossier avec les deux parties et inscrit la décision sur la commande. Vous pouvez aussi écrire à {email}.",
        ],
      },
      {
        title: "Remboursement",
        paragraphs: [
          "Vous payez directement le vendeur : c'est donc lui qui vous rembourse, dans les 7 jours suivant la réception de la pièce retournée (ou la décision, si aucun retour n'est nécessaire), par le même moyen de paiement ou un autre convenu ensemble. Lorsque le vendeur est responsable, les frais de retour sont aussi remboursés.",
        ],
      },
      {
        title: "Vos droits",
        paragraphs: ["Cette politique ne limite pas vos droits selon le droit marocain de la consommation (loi 31-08)."],
      },
    ],
  },
};

const privacy = {
  en: {
    title: "Privacy policy",
    summary: "What data PartHub collects and why.",
    sections: [
      {
        title: "Data we collect",
        items: [
          "Account: name, email, phone number and password (stored only in hashed form).",
          "Orders: delivery address, items ordered and your notes.",
          "Vehicles you save to check fitment.",
          "Activity: searches, part requests, reviews and back-in-stock alerts.",
          "Sellers: store details and contact numbers.",
        ],
      },
      {
        title: "Why we use it",
        items: [
          "To run your account and your orders.",
          "To send your order or part request to the seller concerned.",
          "To check fitment and improve search (for example, searches with no results show sellers which parts to stock).",
          "To prevent fraud and moderate listings and reviews.",
          "To contact you about your orders, including by WhatsApp when you give a number.",
        ],
      },
      {
        title: "Who sees it",
        items: [
          "The seller of your order sees your name, phone number and delivery address, to deliver it.",
          "Sellers see the part requests you send them.",
          "Published reviews show only your first name and the initial of your last name.",
          "PartHub does not sell your data. Technical providers (hosting: Cloudflare; messages: WhatsApp) process it only to provide their service.",
        ],
      },
      {
        title: "Storage on your device",
        paragraphs: [
          "Your browser keeps your sign-in session, language, cart and saved vehicle (local storage). PartHub does not use advertising cookies.",
        ],
      },
      {
        title: "How long we keep it",
        paragraphs: [
          "Account data is kept while your account is open. Order data is kept as long as needed for the order, complaints and legal obligations such as accounting.",
        ],
      },
      {
        title: "Your rights",
        paragraphs: [
          "Under law 09-08 on the protection of personal data, you can access, correct or delete your data and object to its use. Write to {email}. You can also contact the CNDP (Commission nationale de contrôle de la protection des données à caractère personnel).",
        ],
      },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    summary: "ما المعطيات التي تجمعها PartHub ولماذا.",
    sections: [
      {
        title: "المعطيات التي نجمعها",
        items: [
          "الحساب: الاسم والبريد الإلكتروني ورقم الهاتف وكلمة المرور (تُحفظ مشفّرة بشكل لا يمكن استرجاعه).",
          "الطلبات: عنوان التوصيل والقطع المطلوبة وملاحظاتك.",
          "السيارات التي تحفظها للتحقق من التوافق.",
          "النشاط: عمليات البحث وطلبات القطع والتقييمات وتنبيهات التوفّر.",
          "البائعون: معلومات المتجر وأرقام التواصل.",
        ],
      },
      {
        title: "لماذا نستعملها",
        items: [
          "لتسيير حسابك وطلباتك.",
          "لإرسال طلبك أو طلب القطعة إلى البائع المعني.",
          "للتحقق من التوافق وتحسين البحث (مثلاً: عمليات البحث بدون نتائج تُري البائعين ما يجب توفيره).",
          "لمنع الاحتيال ومراجعة العروض والتقييمات.",
          "للتواصل معك بخصوص طلباتك، بما في ذلك عبر واتساب إن أعطيت رقماً.",
        ],
      },
      {
        title: "من يطّلع عليها",
        items: [
          "بائع طلبك يرى اسمك ورقم هاتفك وعنوان التوصيل لتوصيله.",
          "البائعون يرون طلبات القطع التي ترسلها إليهم.",
          "التقييمات المنشورة لا تُظهر إلا اسمك الأول والحرف الأول من اسم العائلة.",
          "لا تبيع PartHub معطياتك. مزوّدو الخدمات التقنية (الاستضافة: Cloudflare، الرسائل: واتساب) يعالجونها فقط لتقديم خدمتهم.",
        ],
      },
      {
        title: "التخزين على جهازك",
        paragraphs: [
          "يحتفظ متصفحك بجلسة الدخول واللغة والسلة والسيارة المحفوظة (التخزين المحلي). لا تستعمل PartHub ملفات تعريف الارتباط الإشهارية.",
        ],
      },
      {
        title: "مدة الحفظ",
        paragraphs: [
          "تُحفظ معطيات الحساب ما دام حسابك مفتوحاً. وتُحفظ معطيات الطلبات المدة اللازمة للطلب والشكايات والالتزامات القانونية مثل المحاسبة.",
        ],
      },
      {
        title: "حقوقك",
        paragraphs: [
          "وفق القانون 09-08 المتعلق بحماية المعطيات الشخصية، يمكنك الاطلاع على معطياتك وتصحيحها وحذفها والاعتراض على استعمالها. راسلنا على {email}. يمكنك أيضاً التواصل مع اللجنة الوطنية لمراقبة حماية المعطيات ذات الطابع الشخصي (CNDP).",
        ],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    summary: "Les données que PartHub collecte, et pourquoi.",
    sections: [
      {
        title: "Données collectées",
        items: [
          "Compte : nom, e-mail, numéro de téléphone et mot de passe (conservé uniquement sous forme hachée).",
          "Commandes : adresse de livraison, articles commandés et vos remarques.",
          "Les véhicules que vous enregistrez pour vérifier la compatibilité.",
          "Activité : recherches, demandes de pièces, avis et alertes de retour en stock.",
          "Vendeurs : informations de la boutique et numéros de contact.",
        ],
      },
      {
        title: "Pourquoi nous les utilisons",
        items: [
          "Pour gérer votre compte et vos commandes.",
          "Pour transmettre votre commande ou votre demande de pièce au vendeur concerné.",
          "Pour vérifier la compatibilité et améliorer la recherche (par exemple, les recherches sans résultat montrent aux vendeurs quelles pièces stocker).",
          "Pour prévenir la fraude et modérer les annonces et les avis.",
          "Pour vous contacter au sujet de vos commandes, y compris par WhatsApp si vous donnez un numéro.",
        ],
      },
      {
        title: "Qui les voit",
        items: [
          "Le vendeur de votre commande voit votre nom, votre téléphone et votre adresse de livraison, pour la livrer.",
          "Les vendeurs voient les demandes de pièces que vous leur envoyez.",
          "Les avis publiés n'affichent que votre prénom et l'initiale de votre nom.",
          "PartHub ne vend pas vos données. Les prestataires techniques (hébergement : Cloudflare ; messages : WhatsApp) les traitent uniquement pour fournir leur service.",
        ],
      },
      {
        title: "Stockage sur votre appareil",
        paragraphs: [
          "Votre navigateur conserve votre session, votre langue, votre panier et votre véhicule enregistré (stockage local). PartHub n'utilise pas de cookies publicitaires.",
        ],
      },
      {
        title: "Durée de conservation",
        paragraphs: [
          "Les données du compte sont conservées tant que votre compte est ouvert. Les données de commande sont conservées le temps nécessaire à la commande, aux réclamations et aux obligations légales comme la comptabilité.",
        ],
      },
      {
        title: "Vos droits",
        paragraphs: [
          "Selon la loi 09-08 relative à la protection des données personnelles, vous pouvez accéder à vos données, les rectifier, les supprimer et vous opposer à leur utilisation. Écrivez à {email}. Vous pouvez aussi saisir la CNDP (Commission nationale de contrôle de la protection des données à caractère personnel).",
        ],
      },
    ],
  },
};

export const LEGAL_DOCS = { terms, seller, returns, privacy };

// The document in the given language (falls back to English).
export function legalDoc(id, lang) {
  const doc = LEGAL_DOCS[id];
  if (!doc) return null;
  return doc[lang] || doc.en;
}

// Replace {email} in a legal text.
export function legalText(text) {
  return String(text).replace(/\{email\}/g, LEGAL_CONTACT_EMAIL);
}
