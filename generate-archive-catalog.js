const fs = require("fs");

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function yearFromDate(value) {
  const text = clean(value);
  const match = text.match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : "";
}

function looksBad(text) {
  const t = clean(text).toLowerCase();
  return [
    "trailer",
    "short",
    "clip",
    "sample",
    "excerpt",
    "promo",
    "teaser",
    "behind the scenes"
  ].some(word => t.includes(word));
}

function parseMinutes(lengthValue) {
  const text = clean(lengthValue);

  // seconds as a raw number
  if (/^\d+(\.\d+)?$/.test(text)) {
    const num = Number(text);
    // heuristic: if huge, probably seconds
    if (num > 180) return num / 60;
    return num;
  }

  // hh:mm:ss or mm:ss
  const parts = text.split(":").map(Number).filter(n => !Number.isNaN(n));
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60;
  }
  if (parts.length === 2) {
    return parts[0] + parts[1] / 60;
  }

  const num = Number(text.match(/\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(num) ? num : 0;
}

async function searchArchive(query, rows = 50, page = 1) {
  const params = new URLSearchParams({
    q: query,
    fl: "identifier,title,description,date,publicdate,mediatype,downloads",
    sort: "downloads desc",
    rows: String(rows),
    page: String(page),
    output: "json"
  });

  return fetchJson(`https://archive.org/advancedsearch.php?${params.toString()}`);
}

async function getMetadata(identifier) {
  return fetchJson(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
}

function findBestPlayableFile(metadata) {
  const files = Array.isArray(metadata.files) ? metadata.files : [];

  // Prefer h.264/mp4-ish files with usable dimensions and duration
  const candidates = files
    .map(file => {
      const width = Number(file.width || 0);
      const height = Number(file.height || 0);
      const minutes = parseMinutes(file.length || "");
      const format = clean(file.format).toLowerCase();
      const name = clean(file.name).toLowerCase();

      return {
        file,
        width,
        height,
        minutes,
        format,
        name,
        score:
          (width >= 1280 ? 4 : width >= 960 ? 3 : width >= 720 ? 2 : 0) +
          (format.includes("h.264") ? 3 : 0) +
          (name.endsWith(".mp4") ? 2 : 0)
      };
    })
    .filter(x =>
      x.minutes > 0 &&
      x.width >= 720 &&
      (x.format.includes("h.264") || x.name.endsWith(".mp4"))
    )
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

function toCatalogItem(doc, best, type) {
  const identifier = clean(doc.identifier);
  const title = clean(doc.title) || identifier;
  const description = clean(Array.isArray(doc.description) ? doc.description[0] : doc.description);
  const year = yearFromDate(doc.date || doc.publicdate || "");

  return {
    id: identifier,
    title,
    type,
    row: type === "tv" ? "TV Shows" : "Movies",
    year,
    duration: best ? `${Math.round(best.minutes)}m` : "Unknown",
    rating: "NR",
    description,
    image: "",
    fallbackImage: `https://archive.org/services/img/${identifier}`,
    preview: `https://archive.org/embed/${identifier}`
  };
}

async function collectItems({ query, pages, type, minMinutes, maxMinutes = Infinity, maxItems }) {
  const accepted = [];

  for (let page = 1; page <= pages; page++) {
    const data = await searchArchive(query, 50, page);
    const docs = data?.response?.docs || [];

    for (const doc of docs) {
      const title = clean(doc.title);
      const description = clean(Array.isArray(doc.description) ? doc.description[0] : doc.description);

      if (looksBad(title) || looksBad(description)) continue;

      try {
        const metadata = await getMetadata(doc.identifier);
        const best = findBestPlayableFile(metadata);
        if (!best) continue;

        if (best.minutes < minMinutes || best.minutes > maxMinutes) continue;

        accepted.push(toCatalogItem(doc, best, type));

        if (accepted.length >= maxItems) return accepted;
      } catch (err) {
        console.warn(`Skipping ${doc.identifier}: ${err.message}`);
      }
    }
  }

  return accepted;
}

async function main() {
  const movies = await collectItems({
    query: 'collection:(feature_films) AND mediatype:(movies)',
    pages: 8,
    type: "movie",
    minMinutes: 70,
    maxItems: 250
  });

  const tv = await collectItems({
    query: '(mediatype:(movies) OR mediatype:(video)) AND (subject:(television) OR title:(episode) OR title:(tv) OR title:(show))',
    pages: 8,
    type: "tv",
    minMinutes: 24,
    maxMinutes: 60,
    maxItems: 250
  });

  const catalog = [...movies, ...tv];

  fs.writeFileSync(
    "catalog.js",
    `window.CATALOG = ${JSON.stringify(catalog, null, 2)};\n`,
    "utf8"
  );

  console.log(`Wrote ${catalog.length} titles to catalog.js`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
