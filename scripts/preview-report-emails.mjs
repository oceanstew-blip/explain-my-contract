import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { renderReportReadyEmail } from '../lib/report-email.ts';

const directory = path.resolve('output/email-review');
await mkdir(directory, { recursive: true });
await copyFile('public/brand/contract-email-hero.jpg', path.join(directory, 'contract-email-hero.jpg'));
const base = {
  expiresAt: '2026-10-26T14:00:00Z',
  reportUrl: 'https://example.com/fictional-report#token=DEMONSTRATION-NOT-A-REAL-REPORT',
  heroImageUrl: './contract-email-hero.jpg',
};
const cases = [
  { slug: 'residential-lease', agreementType: 'Fictional Residential Lease', findings: [
    { headline: 'Renewal requires 60 days’ notice', attention_level: 'important', location: 'Section 14 · Renewal', danger: 'The agreement renews unless written notice arrives at least 60 days before the term ends. Check the notice deadline and the required delivery method.' },
    { headline: 'Damage charges are broadly described', attention_level: 'high_attention', location: 'Section 8 · Property condition', danger: 'The tenant may be charged for damage beyond normal wear. Ask how damage is documented and how charges can be disputed.' },
    { headline: 'Subletting needs written permission', attention_level: 'important', location: 'Section 7 · Use of property', danger: 'The lease requires the landlord’s written consent before another person can sublet the property.' },
  ] },
  { slug: 'service-agreement', agreementType: 'Fictional Marketing Services Agreement', findings: [
    { headline: 'The agreement renews for another year', attention_level: 'high_attention', location: 'Section 6 · Renewal', danger: 'A further 12-month term begins unless written notice arrives 60 days before renewal. Put that deadline on your calendar.' },
    { headline: 'Revision limits are not defined', attention_level: 'important', location: 'Section 2 · Deliverables', danger: 'The agreement lists deliverables but does not state how many revisions are included. Clarify what counts as additional work and its cost.' },
  ] },
  { slug: 'no-findings', agreementType: 'Fictional Simple Services Agreement', findings: [] },
];
for (const sample of cases) {
  const message = renderReportReadyEmail({ ...base, ...sample });
  await writeFile(path.join(directory, `${sample.slug}.html`), message.html);
  await writeFile(path.join(directory, `${sample.slug}.txt`), `Subject: ${message.subject}\n\n${message.text}`);
}
await writeFile(path.join(directory, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Client email review</title><style>body{font:16px/1.6 Arial;margin:0;background:#edf2f6;color:#102e57}main{max-width:1000px;margin:auto;padding:32px 20px}h1{font:42px Georgia}a{color:#061d95}nav{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}nav a{padding:12px 18px;background:white;border:1px solid #cbd9e9;border-radius:10px}iframe{width:100%;height:1500px;border:1px solid #cbd9e9;border-radius:12px;background:white}.note{padding:16px;background:#fff3dc;border-radius:10px}</style><main><p>EXPLAIN MY CONTRACT NOW · EMAIL REVIEW</p><h1>What your client receives.</h1><p>Proposed branded email, rendered by the actual application template. All examples below are fictional. These are browser previews, not sent messages or new contract analyses.</p><p class="note">From: Explain My Contract Now &lt;reports@explainmycontractnow.com&gt;<br>Replies: support@explainmycontractnow.com<br>The report button uses a demonstration link. Real client emails use the client’s private report link.</p><nav><a target="email" href="residential-lease.html">Lease email</a><a target="email" href="service-agreement.html">Service agreement</a><a target="email" href="no-findings.html">No findings</a><a target="email" href="current-email.html">Current live template</a><a href="residential-lease.txt">Plain-text version</a></nav><iframe title="Client email preview" name="email" src="residential-lease.html"></iframe></main></html>`);
console.log(`Email previews: ${directory}/index.html`);
