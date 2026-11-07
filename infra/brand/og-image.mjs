import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";
const R = process.argv[2], OUT = process.argv[3];
const F = `${R}/apps/storefront/node_modules/@fontsource`;
const font = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(file).toString("base64")}) format('woff2')}`;
const mark = fs.readFileSync(`${R}/infra/brand/mark-white.svg`, "utf8").replace("<svg ", '<svg width="104" height="104" ');
const html = `<style>
${font("Plex", `${F}/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2`, 600)}
${font("Plex", `${F}/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff2`, 700)}
${font("PlexAr", `${F}/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2`, 600)}
body{margin:0;width:1200px;height:630px;font-family:Plex;color:#fff;background:radial-gradient(900px 500px at 100% 100%,#1f45b5 0%,transparent 60%),linear-gradient(135deg,#0b1730,#102D4B 55%,#14336f);position:relative;overflow:hidden}
.bar{position:absolute;right:0;top:0;bottom:0;width:14px;background:#2875E5}
.wrap{padding:70px 80px}
.logo{display:flex;align-items:center;gap:22px}
.word{font-weight:700;font-size:76px;letter-spacing:-1px}
.word span{color:#9CC0FF}
h1{font-weight:700;font-size:60px;line-height:1.1;margin:58px 0 0}
.ar{font-family:PlexAr;font-weight:600;font-size:44px;color:#DBE4FF;margin-top:18px;direction:rtl;text-align:left;unicode-bidi:plaintext}
.pills{display:flex;gap:16px;margin-top:46px}
.pill{border:2px solid rgba(255,255,255,.25);border-radius:999px;padding:10px 24px;font-weight:600;font-size:25px;color:#E6ECFF}
</style><body><div class="bar"></div><div class="wrap">
<div class="logo">${mark}<div class="word">Part<span>Hub</span></div></div>
<h1>Pièces auto au Maroc,<br>compatibles avec votre véhicule</h1>
<div class="ar">قطع غيار السيارات المناسبة لسيارتك</div>
<div class="pills"><div class="pill">Neuves · d'origine · occasion</div><div class="pill">Vendeurs vérifiés</div><div class="pill">Paiement à la livraison</div></div>
</div></body>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
await p.screenshot({ path: OUT }); await b.close();
