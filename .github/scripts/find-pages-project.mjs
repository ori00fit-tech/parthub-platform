// Find the Cloudflare Pages project that serves a given domain.
// Usage: node find-pages-project.mjs <domain> <fallback-name>
// Prints the project name on stdout; diagnostics go to stderr.
// Auth: CLOUDFLARE_EMAIL + CLOUDFLARE_API_KEY (global key), as used by wrangler.
const [domain, fallback] = process.argv.slice(2);
const headers = {
  "X-Auth-Email": process.env.CLOUDFLARE_EMAIL || "",
  "X-Auth-Key": process.env.CLOUDFLARE_API_KEY || "",
};

async function api(path) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, { headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(`${path}: ${res.status} ${JSON.stringify(body.errors || body).slice(0, 300)}`);
  }
  return body;
}

const accounts = (await api("/accounts?per_page=50")).result || [];
const all = [];
for (const account of accounts) {
  for (let page = 1; page < 20; page++) {
    const body = await api(`/accounts/${account.id}/pages/projects?per_page=10&page=${page}`);
    const list = body.result || [];
    for (const p of list) all.push({ account: account.name, name: p.name, domains: p.domains || [], subdomain: p.subdomain || "" });
    if (list.length < 10) break;
  }
}

console.error(`Pages projects in your account (${all.length}):`);
for (const p of all) console.error(`  - ${p.name}  →  ${[...new Set([p.subdomain, ...p.domains].filter(Boolean))].join(", ")}`);

const wanted = domain.toLowerCase();
const match =
  all.find((p) => p.domains.some((d) => d.toLowerCase() === wanted)) ||
  all.find((p) => p.name === fallback);

if (!match) {
  console.error(`\nNo Pages project serves ${domain} and none is named ${fallback}.`);
  console.error(`Create one (Workers & Pages → Create → Pages → Direct upload) or add ${domain} as a custom domain to the right project.`);
  process.exit(1);
}
console.error(`\n${domain} → ${match.name}`);
console.log(match.name);
