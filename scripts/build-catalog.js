const fs = require("fs");

const OUTPUT_PATH = "./catalog.js";

// How many items to fetch before filtering down.
// You can raise these if you want a bigger catalog.
const MOVIE_ROWS = 120;
const TV_ROWS = 120;

// Final limits written into catalog.js
const MAX_MOVIES = 48;
const MAX_TV = 24;

const ARCHIVE_ADVANCEDSEARCH = "https://archive.org/advancedsearch.php";
const ARCHIVE_METADATA = "https://archive.org/metadata";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstString(value) {
  if (Array.isArray(value)) return value.find(Boolean) || "";
  return value || "";
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [value];
}

function parseYear(value) {
  const text = String(value || "");
  const match = text.match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function parseRuntimeMinutes(value) {
  if (value == null) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? Math.round(value) : null;
  }

  const text = String(Array.isArray(value) ? value[0] : value).trim().toLowerCase();
  if (!text) return null;

  // hh:mm:ss or mm:ss
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
    const parts = text.split(":").map(Number);
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return Math.round(h * 60 + m + s / 60);
    }
    if (parts.length === 2) {
      const [m, s] = parts;
      return Math.round(m + s / 60);
    }
  }

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*m/);

  if (hourMatch || minMatch) {
    const hours = hourMatch ? Number(hourMatch[1]) : 0;
    const mins = minMatch ? Number(minMatch[1]) : 0;
    const total = Math.round(hours * 60 + mins);
    return total > 0 ? total : null;
  }

  const plainNumber = text.match(/\d+(?:\.\d+)?/);
  if (plainNumber) {
    const n = Number(plainNumber[0]);
    if (Number.isFinite(n) && n > 0 && n < 1000) {
      return Math.round(n);
    }
  }

  return null;
}

function formatDuration(minutes, type) {
  if (!minutes || !Number.isFinite(minutes)) {
    return type === "tv" ? "Episode" : "Full Movie";
  }

  if (type === "tv") {
    if (minutes >= 50) return `${minutes}m`;
    return `${minutes}m episode`;
  }

  return `${minutes}m`;
}

function normalizeDescription(metadata, doc) {
  const description =
    firstString(metadata.description) ||
    firstString(doc.description) ||
    "";

  const cleaned = stripHtml(description);
  if (!cleaned) return "No description available yet.";
  return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned;
}

function normalizeTitle(metadata, doc, identifier) {
  const rawTitle =
    firstString(metadata.title) ||
    firstString(doc.title) ||
    identifier;

  return stripHtml(rawTitle) || identifier;
}

function getSubjects(metadata, doc) {
  return [
    ...toArray(metadata.subject),
    ...toArray(doc.subject),
    ...toArray(metadata.collection),
    ...toArray(doc.collection),
  ]
    .map(x => String(x).toLowerCase())
    .filter(Boolean);
}

function classifyType(metadata, doc, identifier, title) {
  const blob = [
    identifier,
    title,
    firstString(metadata.mediatype),
    ...getSubjects(metadata, doc),
    normalizeDescription(metadata, doc),
  ]
    .join(" ")
    .toLowerCase();

  if (
    blob.includes("tv") ||
    blob.includes("television") ||
    blob.includes("episode") ||
    blob.includes("classic_tv") ||
    blob.includes("classic tv") ||
    blob.includes("serial")
  ) {
    return "tv";
  }

  return "movie";
}

function classifyRow(title, description, subjects, type) {
  const blob = [title, description, ...subjects].join(" ").toLowerCase();

  if (type === "tv") {
    if (blob.includes("cartoon") || blob.includes("animation") || blob.includes("animated")) {
      return "Animation";
    }
    return "TV Picks";
  }

  if (
    blob.includes("horror") ||
    blob.includes("zombie") ||
    blob.includes("vampire") ||
    blob.includes("monster") ||
    blob.includes("phantom") ||
    blob.includes("ghost")
  ) {
    return "Horror";
  }

  if (
    blob.includes("science fiction") ||
    blob.includes("sci-fi") ||
    blob.includes("alien") ||
    blob.includes("robot") ||
    blob.includes("space") ||
    blob.includes("future")
  ) {
    return "Sci-Fi";
  }

  if (
    blob.includes("animation") ||
    blob.includes("animated") ||
    blob.includes("cartoon")
  ) {
    return "Animation";
  }

  if (
    blob.includes("crime") ||
    blob.includes("gangster") ||
    blob.includes("noir") ||
    blob.includes("detective")
  ) {
    return "Crime";
  }

  return "Featured";
}

function isBadCandidate({ title, description, runtimeMinutes }) {
  const blob = `${title} ${description}`.toLowerCase();

  const banned = [
    "trailer",
    "preview",
    "promo",
    "teaser",
    "clip",
    "sample",
    "test",
    "outtakes",
    "bloopers",
    "commercial",
    "advertisement",
    "music video",
    "behind the scenes",
    "behind-the-scenes",
  ];

  if (banned.some(word => blob.includes(word))) return true;

  if (runtimeMinutes && runtimeMinutes < 20) return true;

  return false;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "PluetoTVCatalogBuilder/1.0 (+https://github.com/plueto/plueto.github.io)"
    }
  });

  if (!res.ok) {
    throw new Error(`Request failed ${res.status}: ${url}`);
  }

  return res.json();
}

function buildAdvancedSearchUrl(query, rows) {
  const url = new URL(ARCHIVE_ADVANCEDSEARCH);
  url.searchParams.set("q", query);
  url.searchParams.set("fl[]", "identifier");
  url.searchParams.set("fl[]", "title");
  url.searchParams.set("fl[]", "description");
  url.searchParams.set("fl[]", "year");
  url.searchParams.set("fl[]", "runtime");
  url.searchParams.set("fl[]", "downloads");
  url.searchParams.set("fl[]", "subject");
  url.searchParams.set("fl[]", "collection");
  url.searchParams.set("fl[]", "mediatype");
  url.searchParams.set("sort[]", "downloads desc");
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("page", "1");
  url.searchParams.set("output", "json");
  return url.toString();
}

async function searchArchive(query, rows) {
  const url = buildAdvancedSearchUrl(query, rows);
  const data = await fetchJson(url);
  return Array.isArray(data?.response?.docs) ? data.response.docs : [];
}

async function fetchMetadata(identifier) {
  return fetchJson(`${ARCHIVE_METADATA}/${encodeURIComponent(identifier)}`);
}

async function buildItem(doc) {
  const identifier = doc.identifier;
  if (!identifier) return null;

  const metadataPayload = await fetchMetadata(identifier);
  const metadata = metadataPayload?.metadata || {};

  const title = normalizeTitle(metadata, doc, identifier);
  const description = normalizeDescription(metadata, doc);

  const year =
    parseYear(firstString(metadata.year)) ||
    parseYear(firstString(doc.year)) ||
    parseYear(firstString(metadata.date)) ||
    null;

  const runtimeMinutes =
    parseRuntimeMinutes(firstString(metadata.runtime)) ||
    parseRuntimeMinutes(firstString(doc.runtime)) ||
    null;

  const subjects = getSubjects(metadata, doc);
  const type = classifyType(metadata, doc, identifier, title);

  if (isBadCandidate({ title, description, runtimeMinutes })) {
    return null;
  }

  const row = classifyRow(title, description, subjects, type);

  return {
    id: identifier,
    title,
    type,
    row,
    year: year || (type === "tv" ? "" : ""),
    duration: formatDuration(runtimeMinutes, type),
    rating: type === "tv" ? "TV-G" : "NR",
    description,
    image: `https://archive.org/services/img/${identifier}`,
    fallbackImage: `https://archive.org/services/img/${identifier}`,
    preview: `https://archive.org/embed/${identifier}`,
    downloads: Number(doc.downloads || 0)
  };
}

function dedupe(items) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    if (!item) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }

  return out;
}

function sortCatalog(items) {
  return [...items].sort((a, b) => {
    const dl = (b.downloads || 0) - (a.downloads || 0);
    if (dl !== 0) return dl;
    return String(a.title).localeCompare(String(b.title));
  });
}

function removeInternalFields(items) {
  return items.map(({ downloads, ...rest }) => rest);
}

function serializeCatalog(items) {
  return `window.CATALOG = ${JSON.stringify(items, null, 2)};\n`;
}

async function main() {
  // Movies: feature films / movies
  const movieQuery =
    '(mediatype:movies) AND ' +
    '((collection:feature_films) OR (subject:"feature films") OR (subject:"feature film"))';

  // TV-ish material: classic TV / television / episodes
  const tvQuery =
    '(mediatype:movies) AND ' +
    '((collection:classic_tv) OR (subject:television) OR (subject:"television programs") OR (title:episode))';

  console.log("Searching Internet Archive for movies...");
  const movieDocs = await searchArchive(movieQuery, MOVIE_ROWS);

  console.log("Searching Internet Archive for TV...");
  const tvDocs = await searchArchive(tvQuery, TV_ROWS);

  const combinedDocs = dedupe([...movieDocs, ...tvDocs]);

  console.log(`Found ${combinedDocs.length} raw candidates. Fetching metadata...`);

  const built = [];
  for (let i = 0; i < combinedDocs.length; i += 1) {
    const doc = combinedDocs[i];
    try {
      const item = await buildItem(doc);
      if (item) {
        built.push(item);
        console.log(`[${i + 1}/${combinedDocs.length}] OK: ${item.title}`);
      } else {
        console.log(`[${i + 1}/${combinedDocs.length}] skipped: ${doc.identifier}`);
      }
    } catch (err) {
      console.warn(`[${i + 1}/${combinedDocs.length}] failed: ${doc.identifier} -> ${err.message}`);
    }
  }

  let catalog = sortCatalog(dedupe(built));

  const movies = catalog.filter(item => item.type === "movie").slice(0, MAX_MOVIES);
  const tv = catalog.filter(item => item.type === "tv").slice(0, MAX_TV);

  catalog = removeInternalFields([...movies, ...tv]);

  fs.writeFileSync(OUTPUT_PATH, serializeCatalog(catalog), "utf8");

  console.log(`Saved ${catalog.length} titles to ${OUTPUT_PATH}`);
  console.log(`Movies: ${movies.length}`);
  console.log(`TV: ${tv.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
