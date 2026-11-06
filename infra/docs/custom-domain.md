# Custom domain: parthub.autos

| Address | Serves | Where to connect it in Cloudflare |
|---|---|---|
| `parthub.autos` (+ `www`) | Storefront | Workers & Pages → `parthub-platform` → Custom domains |
| `seller.parthub.autos` | Seller portal | Workers & Pages → `parthub-platform-seller` → Custom domains |
| `admin.parthub.autos` | Admin | Workers & Pages → `parthub-platform-admin` → Custom domains |
| `api.parthub.autos` | API (Worker `parthub-api`) | Workers & Pages → `parthub-api` → Settings → Domains & Routes → Add custom domain |

## 1. Put the domain on Cloudflare
- Cloudflare dashboard → Add a domain → `parthub.autos` → Free plan.
- At the registrar where the domain was bought, replace the nameservers with
  the two Cloudflare gives. (Not needed if it was bought on Cloudflare.)
- Wait until Cloudflare shows the domain as **Active**.

## 2. Connect the four addresses
As in the table above. Cloudflare creates the DNS records and certificates.
`www.parthub.autos`: add it to the storefront project too, then redirect it
to `parthub.autos` (Rules → Redirect Rules).

## 3. Switch the apps to the new addresses
Only once `https://api.parthub.autos/api/v1/catalog/categories` answers.
GitHub → Settings → Secrets and variables → Actions → **Variables**:

| Variable | Value |
|---|---|
| `API_BASE_URL` | `https://api.parthub.autos` |
| `SITE_URL` | `https://parthub.autos` |
| `SELLER_PORTAL_URL` | `https://seller.parthub.autos` |

Then Actions → **Deploy Pages** → Run workflow (all). No code change.
`SITE_URL` makes canonical links, the sitemap and robots.txt use the domain,
so pages still reachable on `*.pages.dev` count as one site for Google.

## 4. Email
`support@parthub.autos` is the contact address in the legal pages.
Cloudflare → `parthub.autos` → Email → Email Routing: create
`support@parthub.autos` and forward it to the team's mailbox.

## 5. Google Search Console
Add a **Domain** property for `parthub.autos` (verification by DNS TXT
record, added in Cloudflare DNS), then submit
`https://parthub.autos/sitemap.xml`.
