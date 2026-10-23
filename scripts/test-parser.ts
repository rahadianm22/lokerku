import { parseJobHtml, splitTitle } from "../lib/extract";

const ld = `<html><head><title>x</title><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"JobPosting","title":"Senior Product Designer","description":"<p>We are a <b>hybrid</b> team in Jakarta.</p>","datePosted":"2026-10-20","validThrough":"2026-11-05T00:00:00","employmentType":["FULL_TIME"],"hiringOrganization":{"@type":"Organization","name":"Bank Contoh","logo":"https://x.com/l.png"},"jobLocation":{"@type":"Place","address":{"addressLocality":"Jakarta Selatan","addressRegion":"DKI Jakarta","addressCountry":"ID"}},"baseSalary":{"currency":"IDR","value":{"minValue":18000000,"maxValue":25000000,"unitText":"MONTH"}}}]}</script></head></html>`;
const li = `<html><head><meta property="og:title" content="Tokopedia hiring UI/UX Designer in Jakarta, Indonesia | LinkedIn"><meta property="og:description" content="Remote role ..."></head></html>`;
const gl = `<html><head><title>Lowongan Kerja Product Designer di PT Maju Jaya, Tangerang - Glints</title></head></html>`;

console.log(JSON.stringify(parseJobHtml(ld, "https://www.jobstreet.co.id/job/1"), null, 1));
console.log(parseJobHtml(li, "https://www.linkedin.com/jobs/view/123").data);
console.log(parseJobHtml(gl, "https://glints.com/id/opportunities/jobs/x").data);
console.log(splitTitle("Product Designer at Gojek"), splitTitle("UX Writer - Traveloka"));
