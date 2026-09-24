import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = process.argv[2];

if (!outputDirectory) {
  throw new Error("Usage: node scripts/export-local-reviews.mjs <output-directory>");
}

const reports = [
  {
    slug: "01-marketing-campaign-services-agreement",
    source: "07_Marketing_Campaign_Services_Agreement.pdf",
    id: "07000000-0000-4000-8000-000000000007",
    token: "local-test-07-private-preview",
  },
  {
    slug: "02-residential-lease",
    source: "ResidentialLease_FILLED.pdf",
    id: "08000000-0000-4000-8000-000000000008",
    token: "local-residential-lease-private-preview",
  },
  {
    slug: "03-coaching-agreement",
    source: "CoachingAgreement_FILLED.pdf",
    id: "09000000-0000-4000-8000-000000000009",
    token: "local-coaching-agreement-private-preview",
  },
  {
    slug: "04-employee-contract-template",
    source: "EmployeeContract.pdf",
    id: "10000000-0000-4000-8000-000000000010",
    token: "local-employee-contract-private-preview",
  },
  {
    slug: "05-commercial-lease-sample",
    source: "CommerciaLease.pdf",
    id: "11000000-0000-4000-8000-000000000011",
    token: "local-commercial-lease-private-preview",
  },
];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const list = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const level = {
  high_attention: ["High attention", "high"],
  important: ["Important to understand", "important"],
  document_quality: ["Document-quality concern", "quality"],
};

const styles = `
  :root{color-scheme:light;--ink:#231942;--muted:#655f73;--paper:#fffdfa;--line:#ded8e8;--purple:#5b2ca0;--red:#8f1d2c;--amber:#8a5200;--blue:#245a78}
  *{box-sizing:border-box}body{margin:0;background:#f4f0f8;color:var(--ink);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{max-width:920px;margin:0 auto;padding:42px 22px 70px}header,.card,.section{background:var(--paper);border:1px solid var(--line);border-radius:22px;box-shadow:0 10px 32px rgba(35,25,66,.06)}
  header{padding:34px;background:linear-gradient(135deg,#29184f,#5b2ca0);color:white}h1,h2,h3{line-height:1.2;margin-top:0}h1{font-size:clamp(2rem,5vw,3.35rem);margin-bottom:12px}h2{font-size:1.6rem}h3{font-size:1.25rem}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.meta{opacity:.85}.section{padding:25px;margin-top:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.card{padding:20px;margin-top:16px;box-shadow:none}.tag{display:inline-block;border:1px solid currentColor;border-radius:999px;padding:4px 10px;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.high{color:var(--red);background:#fff1f2}.important{color:var(--amber);background:#fff8e8}.quality{color:var(--blue);background:#eef8ff}.location{color:var(--muted);font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}strong{color:var(--ink)}ul{padding-left:22px}.protection{border-left:5px solid #2d8a64}.notice{font-size:.9rem;color:var(--muted)}a{color:var(--purple)}@media print{body{background:white}main{max-width:none;padding:0}header,.card,.section{box-shadow:none;break-inside:avoid}a{color:inherit;text-decoration:none}}
`;

function renderReport(data, source) {
  const report = data.report;
  const snapshot = report.agreement_snapshot;
  const highCount = report.detailed_analysis.filter((item) => item.attention_level === "high_attention").length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(snapshot.agreement_type)} - Explain My Contract Now</title><style>${styles}</style></head><body><main>
    <p><a href="index.html">&larr; All saved reviews</a></p>
    <header><p class="eyebrow">Saved local report</p><h1>${escapeHtml(snapshot.agreement_type)}</h1><p>${report.total_flags} terms to review · ${highCount} high attention</p><p class="meta">Source: ${escapeHtml(source)}</p></header>
    <section class="section"><p class="eyebrow">The deal at a glance</p><p><strong>Prospective party reviewed:</strong> ${escapeHtml(snapshot.reviewed_for ?? "Not specified")}</p><p><strong>${escapeHtml(snapshot.counterparty_label ?? "Named service provider")}:</strong> ${escapeHtml(snapshot.provider)}</p><p><strong>Term:</strong> ${escapeHtml(snapshot.term)}</p><div class="grid"><div><h3>What you get</h3>${list(snapshot.what_you_get)}</div><div><h3>What you pay</h3>${list(snapshot.what_you_pay)}</div><div><h3>What you commit to</h3>${list(snapshot.what_you_commit_to)}</div></div></section>
    ${highCount ? `<section class="section"><p class="eyebrow">Report-level attention</p><h2>High attention recommended</h2><p>This agreement includes ${highCount} ${highCount === 1 ? "term" : "terms"} with significant financial or practical consequences. Review the original language carefully and consider a qualified attorney if you are deciding how to respond or proceed.</p></section>` : ""}
    ${report.protections?.length ? `<section class="section"><p class="eyebrow">Protections in your contract</p>${report.protections.map((item) => `<article class="card protection"><h3>${escapeHtml(item.headline)}</h3><p class="location">${escapeHtml(item.location)}</p><p>${escapeHtml(item.explanation)}</p></article>`).join("")}</section>` : ""}
    <section class="section"><p class="eyebrow">Terms to review</p>${[...report.detailed_analysis].sort((a,b) => ({high_attention:0,important:1,document_quality:2}[a.attention_level]-({high_attention:0,important:1,document_quality:2}[b.attention_level]))).map((item) => { const [label,className] = level[item.attention_level]; return `<article class="card"><span class="tag ${className}">${label}</span><h2>${escapeHtml(item.headline)}</h2><p class="location">${escapeHtml(item.location)}</p><p><strong>In plain English:</strong> ${escapeHtml(item.legal_gibberish)}</p><p><strong>What it means:</strong> ${escapeHtml(item.danger)}</p><p><strong>Your contract-based next step:</strong> ${escapeHtml(item.fix)}</p></article>`; }).join("")}</section>
    <p class="notice">Educational contract analysis only; not legal advice. Saved from a local testing preview.</p>
  </main></body></html>`;
}

await mkdir(outputDirectory, { recursive: true });
const saved = [];

for (const item of reports) {
  const response = await fetch(`http://localhost:3001/api/reports/${item.id}`, {
    headers: { Authorization: `Bearer ${item.token}` },
  });
  if (!response.ok) throw new Error(`Could not export ${item.slug}: HTTP ${response.status}`);
  const data = await response.json();
  const filename = `${item.slug}.html`;
  await writeFile(path.join(outputDirectory, filename), renderReport(data, item.source), "utf8");
  saved.push({ filename, title: data.report.agreement_snapshot.agreement_type, source: item.source, total: data.report.total_flags, high: data.report.detailed_analysis.filter((finding) => finding.attention_level === "high_attention").length });
}

const index = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Saved Contract Reviews</title><style>${styles}</style></head><body><main><header><p class="eyebrow">Explain My Contract Now</p><h1>Saved contract reviews</h1><p>Standalone local testing reports saved for later review.</p></header><section class="section">${saved.map((item) => `<article class="card"><h2><a href="${item.filename}">${escapeHtml(item.title)}</a></h2><p>${item.total} terms to review · ${item.high} high attention</p><p class="notice">Source: ${escapeHtml(item.source)}</p></article>`).join("")}</section><p class="notice">Educational contract analysis only; not legal advice.</p></main></body></html>`;
await writeFile(path.join(outputDirectory, "index.html"), index, "utf8");

console.log(`Saved ${saved.length} reports and index.html to ${outputDirectory}`);
