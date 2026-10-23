/** Deteksi platform dari URL — aman dipakai di client & server. */
const PLATFORMS: [RegExp, string][] = [
  [/linkedin\./, "LinkedIn"],
  [/jobstreet\./, "JobStreet"],
  [/glints\./, "Glints"],
  [/kalibrr\./, "Kalibrr"],
  [/indeed\./, "Indeed"],
  [/karir\.com/, "Karir.com"],
  [/dealls\./, "Dealls"],
  [/kitalulus\./, "KitaLulus"],
  [/topkarir\./, "TopKarir"],
  [/techinasia\./, "Tech in Asia"],
  [/upwork\./, "Upwork"],
  [/glassdoor\./, "Glassdoor"],
  [/wellfound\.|angel\.co/, "Wellfound"],
  [/(lever\.co|jobs\.lever)/, "Lever"],
  [/greenhouse\.io/, "Greenhouse"],
  [/workable\.com/, "Workable"],
  [/ashbyhq\.com/, "Ashby"],
  [/(twitter|x)\.com/, "X"],
  [/instagram\./, "Instagram"],
  [/docs\.google\.com\/forms|forms\.gle/, "Google Form"],
];

export function detectPlatform(url: string): string {
  try {
    const u = new URL(url);
    const full = u.hostname + u.pathname;
    for (const [re, name] of PLATFORMS) if (re.test(full)) return name;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Lainnya";
  }
}

