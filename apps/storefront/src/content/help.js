// Help & FAQ (/help), in the three languages. Plain data, also read by the
// Pages Function functions/help.js (search engines, FAQPage markup), so no
// imports here. Keep every answer true to the code and to the legal texts in
// packages/shared/src/legal/content.js (returns: 7 days; selling: free for
// now, 30 days' notice before any fee).

export const HELP = {
  ar: {
    title: "المساعدة والأسئلة الشائعة",
    intro: "كل ما تحتاجه لتطلب قطعة، تتابعها، وتُرجعها إن لم تناسب سيارتك.",
    contact: "لم تجد جوابك؟ راسلنا:",
    sections: [
      {
        id: "order",
        title: "البحث والطلب",
        items: [
          { q: "كيف أجد القطعة المناسبة لسيارتي؟", a: "اختر سيارتك (الشركة، الموديل، السنة، والمحرك إن أمكن) ثم ابحث باسم القطعة أو برقمها الأصلي (OEM). تظهر لك القطع المتوافقة مع سيارتك، ويمكنك حفظ سيارتك لتجدها في كل زيارة." },
          { q: "لم أجد القطعة، ماذا أفعل؟", a: "أرسل «طلب قطعة» مع معلومات سيارتك وصور إن أمكن. يصل طلبك إلى المحلات المناسبة، فترسل لك عروضها بالسعر والحالة، وتختار العرض الذي يناسبك." },
          { q: "هل أحتاج حساباً للطلب؟", a: "نعم، يُنشأ حسابك في نفس صفحة الطلب ببريدك وكلمة سر. الحساب يسمح لك بمتابعة طلباتك وطلب الإرجاع." },
        ],
      },
      {
        id: "pay",
        title: "الدفع والتوصيل",
        items: [
          { q: "كيف أدفع؟", a: "الدفع عند الاستلام: تدفع لعامل التوصيل أو للبائع عند استلام القطعة. لا تحتاج بطاقة بنكية." },
          { q: "كم ثمن التوصيل ومتى يصل الطلب؟", a: "يظهر ثمن التوصيل ومدته قبل تأكيد الطلب، وهما يختلفان حسب البائع ومدينتك. بعض البائعين يقدمون التوصيل مجاناً فوق مبلغ معين." },
          { q: "هل يمكنني الاستلام من المحل؟", a: "نعم، إذا كان البائع يقدم الاستلام. بعد تأكيد الطلب يظهر لك عنوان المحل وكود الاستلام في صفحة الطلب، تعطيه للبائع عند الاستلام." },
        ],
      },
      {
        id: "track",
        title: "متابعة الطلب",
        items: [
          { q: "كيف أتابع طلبي؟", a: "من «طلباتي» في حسابك. تصلك أيضاً رسالة WhatsApp عند كل مرحلة: الطلب، التأكيد، الشحن مع رقم التتبع، والتسليم." },
          { q: "البائع لم يؤكد طلبي، ماذا أفعل؟", a: "ينتظر الطلب تأكيد البائع. إذا تأخر، تواصل معنا وسنتابع الأمر مع البائع." },
        ],
      },
      {
        id: "returns",
        title: "الإرجاع والاسترداد",
        items: [
          { q: "هل يمكنني إرجاع قطعة؟", a: "نعم، اطلب الإرجاع من صفحة الطلب خلال 7 أيام من التسليم. يتحمل البائع التكاليف إذا كانت القطعة معيبة، أو تالفة، أو مختلفة عن وصفها، أو غير متوافقة بسبب معلومات البائع." },
          { q: "كيف أسترد مالي؟", a: "يرد عليك البائع خلال يومي عمل، ثم يرد لك المبلغ خلال 7 أيام من استلامه القطعة المرجعة. إذا لم تتفقا، يراجع PartHub الملف ويقرر." },
        ],
      },
      {
        id: "trust",
        title: "الثقة",
        items: [
          { q: "ماذا تعني شارة «بائع موثّق»؟", a: "تعني أن PartHub تحقق من المتجر: السجل التجاري أو زيارة المحل. نمنحها فقط بعد هذا التحقق." },
          { q: "هل التقييمات حقيقية؟", a: "لا يستطيع كتابة تقييم إلا مشترٍ طلب القطعة عبر PartHub، وكل تقييم يُراجع قبل نشره." },
        ],
      },
      {
        id: "account",
        title: "حسابي",
        items: [
          { q: "نسيت كلمة السر.", a: "في صفحة الدخول اختر «نسيت كلمة السر» وأدخل بريدك أو رقم هاتفك: يصلك كود على WhatsApp." },
          { q: "كيف أحذف حسابي؟", a: "من صفحة «حذف الحساب». يُغلق حسابك فوراً، ولديك 30 يوماً للتراجع، ثم تُحذف معلوماتك الشخصية." },
        ],
      },
      {
        id: "sell",
        title: "البيع على PartHub",
        items: [
          { q: "كيف أفتح متجري؟", a: "أنشئ حساب بائع، أدخل اسم محلك ومدينتك ورقم WhatsApp، ثم أضف قطعك بالصور والأسعار والسيارات المتوافقة. يراجع PartHub متجرك قبل ظهور قطعك." },
          { q: "كم يكلف البيع؟", a: "البيع على PartHub مجاني حالياً. إذا أُضيفت رسوم أو عمولة، ستُبلَّغ قبل 30 يوماً على الأقل، ويمكنك إغلاق متجرك إن لم تقبلها." },
        ],
      },
    ],
  },
  fr: {
    title: "Aide et questions fréquentes",
    intro: "Tout pour commander une pièce, suivre votre commande et la retourner si elle ne convient pas.",
    contact: "Vous ne trouvez pas votre réponse ? Écrivez-nous :",
    sections: [
      {
        id: "order",
        title: "Recherche et commande",
        items: [
          { q: "Comment trouver la bonne pièce pour ma voiture ?", a: "Choisissez votre véhicule (marque, modèle, année, et motorisation si possible), puis cherchez par nom de pièce ou par référence d’origine (OEM). Les pièces compatibles s’affichent, et vous pouvez enregistrer votre véhicule pour vos prochaines visites." },
          { q: "Je ne trouve pas la pièce, que faire ?", a: "Envoyez une « demande de pièce » avec votre véhicule et des photos si possible. Elle arrive aux magasins concernés, qui vous envoient leurs offres (prix, état) ; vous choisissez celle qui vous convient." },
          { q: "Faut-il un compte pour commander ?", a: "Oui : il se crée sur la page de commande, avec votre e-mail et un mot de passe. Il vous permet de suivre vos commandes et de demander un retour." },
        ],
      },
      {
        id: "pay",
        title: "Paiement et livraison",
        items: [
          { q: "Comment payer ?", a: "Paiement à la livraison : vous payez le livreur ou le vendeur en recevant la pièce. Aucune carte bancaire n’est nécessaire." },
          { q: "Combien coûte la livraison et quand arrive-t-elle ?", a: "Le prix et le délai s’affichent avant de confirmer la commande ; ils dépendent du vendeur et de votre ville. Certains vendeurs offrent la livraison à partir d’un montant." },
          { q: "Puis-je retirer la pièce au magasin ?", a: "Oui, si le vendeur propose le retrait. Une fois la commande confirmée, l’adresse du magasin et votre code de retrait s’affichent sur la page de la commande ; donnez ce code au vendeur." },
        ],
      },
      {
        id: "track",
        title: "Suivi de commande",
        items: [
          { q: "Comment suivre ma commande ?", a: "Dans « Mes commandes ». Vous recevez aussi un message WhatsApp à chaque étape : commande, confirmation, expédition avec numéro de suivi, livraison." },
          { q: "Le vendeur n’a pas confirmé ma commande.", a: "La commande attend la confirmation du vendeur. Si cela tarde, contactez-nous : nous relançons le vendeur." },
        ],
      },
      {
        id: "returns",
        title: "Retours et remboursements",
        items: [
          { q: "Puis-je retourner une pièce ?", a: "Oui, demandez le retour depuis la page de la commande dans les 7 jours suivant la livraison. Le vendeur paie lorsque la pièce est défectueuse, endommagée, différente de sa description ou incompatible à cause de ses informations." },
          { q: "Comment suis-je remboursé ?", a: "Le vendeur répond sous 2 jours ouvrables, puis vous rembourse dans les 7 jours suivant la réception de la pièce retournée. En cas de désaccord, PartHub examine le dossier et décide." },
        ],
      },
      {
        id: "trust",
        title: "Confiance",
        items: [
          { q: "Que signifie le badge « Vendeur vérifié » ?", a: "PartHub a vérifié la boutique : registre de commerce ou visite du magasin. Le badge n’est donné qu’après cette vérification." },
          { q: "Les avis sont-ils réels ?", a: "Seul un acheteur qui a commandé la pièce sur PartHub peut laisser un avis, et chaque avis est relu avant publication." },
        ],
      },
      {
        id: "account",
        title: "Mon compte",
        items: [
          { q: "J’ai oublié mon mot de passe.", a: "Sur la page de connexion, choisissez « Mot de passe oublié » et entrez votre e-mail ou votre téléphone : vous recevez un code sur WhatsApp." },
          { q: "Comment supprimer mon compte ?", a: "Depuis la page « Supprimer mon compte ». Il est fermé tout de suite ; vous avez 30 jours pour changer d’avis, puis vos données personnelles sont effacées." },
        ],
      },
      {
        id: "sell",
        title: "Vendre sur PartHub",
        items: [
          { q: "Comment ouvrir ma boutique ?", a: "Créez un compte vendeur, indiquez le nom de votre magasin, votre ville et votre WhatsApp, puis ajoutez vos pièces avec photos, prix et véhicules compatibles. PartHub vérifie votre boutique avant que vos pièces soient visibles." },
          { q: "Combien coûte la vente ?", a: "Vendre sur PartHub est actuellement gratuit. Si des frais ou une commission sont introduits, vous serez prévenu au moins 30 jours avant, et vous pourrez fermer votre boutique si vous ne les acceptez pas." },
        ],
      },
    ],
  },
  en: {
    title: "Help and frequently asked questions",
    intro: "Everything you need to order a part, follow your order and return it if it does not fit.",
    contact: "Didn’t find your answer? Write to us:",
    sections: [
      {
        id: "order",
        title: "Finding and ordering",
        items: [
          { q: "How do I find the right part for my car?", a: "Choose your vehicle (make, model, year, and engine if you can), then search by part name or by original part number (OEM). Compatible parts are shown, and you can save your vehicle for your next visits." },
          { q: "I can’t find the part. What can I do?", a: "Send a “part request” with your vehicle and photos if you have them. It reaches the matching shops, which send you offers (price, condition); you pick the one that suits you." },
          { q: "Do I need an account to order?", a: "Yes. It is created on the order page with your e-mail and a password, and lets you follow your orders and ask for a return." },
        ],
      },
      {
        id: "pay",
        title: "Payment and delivery",
        items: [
          { q: "How do I pay?", a: "Cash on delivery: you pay the courier or the seller when you receive the part. No bank card needed." },
          { q: "How much is delivery, and when does it arrive?", a: "The price and the time are shown before you confirm the order; they depend on the seller and your city. Some sellers deliver for free above an amount." },
          { q: "Can I collect the part at the shop?", a: "Yes, if the seller offers pickup. Once the order is confirmed, the shop’s address and your pickup code are on the order page; give the code to the seller." },
        ],
      },
      {
        id: "track",
        title: "Following an order",
        items: [
          { q: "How do I follow my order?", a: "In “My orders”. You also get a WhatsApp message at each step: order, confirmation, shipping with tracking number, delivery." },
          { q: "The seller hasn’t confirmed my order.", a: "The order is waiting for the seller. If it takes too long, contact us and we will follow up with the seller." },
        ],
      },
      {
        id: "returns",
        title: "Returns and refunds",
        items: [
          { q: "Can I return a part?", a: "Yes: ask for a return from the order page within 7 days of delivery. The seller pays when the part is faulty, damaged, different from its description or not compatible because of the seller’s information." },
          { q: "How am I refunded?", a: "The seller answers within 2 working days, then refunds you within 7 days of receiving the returned part. If you disagree, PartHub reviews the case and decides." },
        ],
      },
      {
        id: "trust",
        title: "Trust",
        items: [
          { q: "What does the “Verified seller” badge mean?", a: "PartHub checked the store: trade register or a visit to the shop. The badge is given only after that check." },
          { q: "Are the reviews real?", a: "Only a buyer who ordered the part on PartHub can leave a review, and every review is read before it is published." },
        ],
      },
      {
        id: "account",
        title: "My account",
        items: [
          { q: "I forgot my password.", a: "On the sign-in page choose “Forgot password” and enter your e-mail or phone: you get a code on WhatsApp." },
          { q: "How do I delete my account?", a: "From the “Delete account” page. It is closed at once; you have 30 days to change your mind, then your personal data is erased." },
        ],
      },
      {
        id: "sell",
        title: "Selling on PartHub",
        items: [
          { q: "How do I open my store?", a: "Create a seller account, give your shop’s name, city and WhatsApp, then add your parts with photos, prices and compatible vehicles. PartHub checks your store before your parts are visible." },
          { q: "How much does selling cost?", a: "Selling on PartHub is currently free. If fees or a commission are introduced, you will be told at least 30 days before, and you can close your store if you do not accept them." },
        ],
      },
    ],
  },
};

export function helpFor(lang) {
  return HELP[lang] || HELP.fr;
}
