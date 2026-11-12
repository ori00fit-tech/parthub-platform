# PartHub technical assets — inventory for the transfer to PartHub SARL

Purpose: the list of everything that makes PartHub, to be transferred (or
licensed) to the company before any investor, as the founders' plan
requires. Facts below come from the repository and the production checks
(November 2026). Lines marked **to fill** cannot be read from the code:
the founders complete them. No secret value is written here, only names.

## 1. Code
| Asset | Where | Holder today |
|---|---|---|
| Source code (API, storefront, seller portal, admin, shared package, infra, tests, docs) | GitHub `ori00fit-tech/parthub-platform`, branch `main`, first commit 2026-03-29 | GitHub account `ori00fit-tech` |
| Authorship | 134 commits "Chafik Talidi", 73 commits written with an AI assistant (Claude) in the owner's sessions, 53 merges by `ori00fit-tech` | One human author. The commit e-mail is a placeholder (`YOUR_EMAIL@example.com`): set the real one (`git config user.email`) |
| Third-party code (production) | MIT: react, react-dom, react-router, hono…; ISC: lucide-react; OFL-1.1: fonts IBM Plex Sans / Sans Arabic / Mono, Barlow Condensed | Permissive licences, no copyleft: no obstacle to a transfer or a closed-source company product |

AI-generated code: the assistant provider's terms give the user the rights
to the output; counsel should state it in the transfer deed.

## 2. Brand
| Asset | Where | To do |
|---|---|---|
| Name "PartHub" | used on every site | **to fill**: OMPIC trademark filing (classes to choose with counsel, e.g. 35 online marketplace, 42 software, 12 vehicle parts); check prior rights |
| Logo (P + gear), wordmark, colours, guidelines | `packages/shared/src/brand`, `infra/docs/brand.md`, `apps/storefront/public` (logo, favicon, og-image) | created in the repository: transfer with the code |

## 3. Domains and hosting (Cloudflare)
| Asset | Detail | Holder today |
|---|---|---|
| Domain `parthub.autos` (+ `www`, `seller.`, `admin.`, `api.`) | DNS on Cloudflare (`infra/docs/custom-domain.md`) | **to fill**: registrar and registrant name |
| Worker `parthub-api` | API, daily cron 03:17 UTC; workers.dev address used by an old script | Cloudflare account **to fill** (account e-mail) |
| D1 database `parthub-db` | id in `workers/api/wrangler.toml`; all marketplace data | same Cloudflare account |
| R2 bucket `parthub-media` | part and store photos | same Cloudflare account |
| Pages projects | `parthub-platform` (storefront), `parthub-platform-seller`, `parthub-platform-admin` | same Cloudflare account |
| Worker secrets (names) | `JWT_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, and per carrier `CARRIER_<CODE>_WEBHOOK_SECRET` when set | re-create (rotate) them after the transfer |
| GitHub Actions secrets (names) | `CF_EMAIL`, `CF_GLOBAL_API_KEY` (to replace by a scoped API token), `VITE_API_BASE_URL` | rotate after the transfer |

Moving Cloudflare: either transfer the domain and resources to an account
owned by the company, or add the company as account owner and remove the
personal access. Same for GitHub (organisation owned by the company).

## 4. WhatsApp / Meta
| Asset | Detail | Holder today |
|---|---|---|
| Meta app and WhatsApp Business account "PartHub" | number +212 751-411879 (`infra/docs/whatsapp.md`) | **to fill**: Meta Business portfolio owner. Business verification should be done in the company's name (RC, ICE) once registered |
| Message templates | `parthub_new_order`, `parthub_new_request`, `parthub_new_offer`, `parthub_offer_accepted`, `parthub_back_in_stock` | belong to the WhatsApp Business account |

## 5. Other accounts
| Asset | Holder today |
|---|---|
| E-mail `support@parthub.autos` | **to fill**: provider and owner |
| Carrier accounts / contracts (when signed) | in the company's name from the start |
| Accounting, bank | in the company's name (no seller money held: COD model A) |

## 6. Data
| Data | Where | Note |
|---|---|---|
| Accounts (buyers, sellers, admins), orders, addresses, claims, messages | D1 `parthub-db` | personal data: law 09-08, CNDP file, processing outside Morocco (Cloudflare, Meta) |
| Vehicle catalog (35 makes, 263 models, 501 generations, 1,306 engines) and part brands | `infra/d1/catalog/vehicles-morocco.txt` → migration 0017 | compiled for PartHub; make and brand names are their owners' trademarks, used to describe compatibility |
| Photos uploaded by sellers | R2 `parthub-media` | the seller agreement should grant PartHub a licence to display them |

## 7. After the transfer (checklist)
1. Company owns: GitHub organisation, Cloudflare account, domain, Meta Business portfolio, e-mail.
2. Rotate every secret (Worker and GitHub), replace `CF_GLOBAL_API_KEY` by a scoped token.
3. Fill `packages/shared/src/legal/company.js`, bump `LEGAL_VERSION`: notice page, footer and invoices show the company; sellers accept the new terms.
4. Trademark filed in the company's name.
5. Keep this file up to date (it is part of the data room).
