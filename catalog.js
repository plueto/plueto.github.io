const fs = require("fs");

const OUTPUT_PATH = "./catalog.js";

const MOVIE_ROWS = 900;
const TV_ROWS = 500;

const MAX_MOVIES = 260;
const MAX_TV = 110;

const ARCHIVE_ADVANCEDSEARCH = "https://archive.org/advancedsearch.php";
const ARCHIVE_METADATA = "https://archive.org/metadata";

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
    if (Number.isFinite(n) && n > 0 && n < 5000) {
      return Math.round(n);
    }
  }

  return null;
}

function formatDuration(minutes, type) {
  if (!minutes || !Number.isFinite(minutes)) {
    return type === "tv" ? "Series / Episodes" : "Full Movie";
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
  return cleaned.length > 240 ? `${cleaned.slice(0, 237).trim()}...` : cleaned;
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
    blob.includes("season") ||
    blob.includes("series") ||
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

  if (
    blob.includes("anime") ||
    blob.includes("subbed") ||
    blob.includes("dubbed") ||
    blob.includes("manga") ||
    blob.includes("ova") ||
    blob.includes("pokemon") ||
    blob.includes("lain")
  ) {
    return "Anime";
  }

  if (type === "tv") {
    if (blob.includes("cartoon") || blob.includes("animation") || blob.includes("animated")) {
      return "Animation";
    }
    if (blob.includes("science fiction") || blob.includes("sci-fi") || blob.includes("space")) {
      return "Sci-Fi";
    }
    if (blob.includes("crime") || blob.includes("detective") || blob.includes("police")) {
      return "Crime";
    }
    return "TV Picks";
  }

  if (
    blob.includes("horror") ||
    blob.includes("zombie") ||
    blob.includes("vampire") ||
    blob.includes("monster") ||
    blob.includes("phantom") ||
    blob.includes("ghost") ||
    blob.includes("werewolf")
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

function hasAny(text, words) {
  const lower = String(text || "").toLowerCase();
  return words.some(word => lower.includes(word));
}

function looksLikeGarbageTitle(title) {
  const t = String(title || "").trim();
  if (!t || t === ".") return true;

  const lower = t.toLowerCase();

  const garbagePatterns = [
    "apk",
    "mod extra",
    "time trial videos",
    "rom pack",
    "compressed by",
    "upload by"
  ];

  if (hasAny(lower, garbagePatterns)) return true;

  const symbolCount = (t.match(/[_\-]/g) || []).length;
  if (symbolCount > 14) return true;

  return false;
}

function hasExplicitKeywords(text) {
  const banned = [
    "porn",
    "porno",
    "pornography",
    "nudist",
    "nude",
    "nudity",
    "erotic",
    "sexual",
    "xxx",
    "fetish",
    "bdsm",
    "hardcore",
    "softcore",
    "orgy",
    "seduction",
    "hot web series",
    "hentai sex",
    "stag film",
    "love camp 7",
    "real sex episode",
    "topless",
    "alpha france"
  ];

  return hasAny(text, banned);
}

function hasNewsKeywords(text) {
  const banned = [
    "eyewitness news",
    "sept. 11",
    "september 11",
    "9/11",
    "cnn ",
    "bbc world news",
    "fox5",
    "abc sept.",
    "nbc sept.",
    "cbs sept.",
    "wrc :",
    "wusa :",
    "live at daybreak",
    "newscast",
    "coverage",
    "today :"
  ];

  return hasAny(text, banned);
}

function hasSoftwareKeywords(text) {
  const banned = [
    "apk",
    "mod extra",
    "app",
    "software",
    "console x",
    "game collection",
    "pc lite",
    "android",
    "retroarch",
    "rom pack"
  ];

  return hasAny(text, banned);
}

function hasReligiousUploadKeywords(text) {
  const banned = [
    "quran",
    "hatim",
    "reciter",
    "oktakipli",
    "mahir zain mp3",
    "holy quran translation"
  ];

  return hasAny(text, banned);
}

function hasJunkKeywords(text) {
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
    "radio show",
    "audio only",
    "mp3",
    "soundtrack",
    "demo reel",
    "training film",
    "instructional film",
    "public domain movies",
    "archive",
    "shocker internet drive in",
    "countrockula"
  ];

  return hasAny(text, banned);
}

function isBadCollectionOrSubject(subjects) {
  const banned = [
    "newsandpublicaffairs",
    "podcasts",
    "audio",
    "software",
    "adult",
    "pornography",
    "fetish",
    "sex",
    "news",
    "politics"
  ];

  return subjects.some(s => banned.some(b => s.includes(b)));
}

function getVideoFiles(metadataPayload) {
  const files = Array.isArray(metadataPayload?.files) ? metadataPayload.files : [];

  return files.filter(file => {
    const format = String(file.format || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();

    const isVideoFormat =
      format.includes("mpeg4") ||
      format.includes("h.264") ||
      format.includes("matroska") ||
      format.includes("quicktime") ||
      format.includes("ogg video") ||
      format.includes("mp4") ||
      format.includes("video");

    const isVideoExt =
      name.endsWith(".mp4") ||
      name.endsWith(".mkv") ||
      name.endsWith(".mov") ||
      name.endsWith(".ogv") ||
      name.endsWith(".avi") ||
      name.endsWith(".m4v");

    const isBadAux =
      name.includes("_thumb") ||
      name.includes("_spectrogram") ||
      name.endsWith(".gif") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".srt") ||
      name.endsWith(".vtt") ||
      name.endsWith(".txt") ||
      name.endsWith(".xml") ||
      name.endsWith(".pdf") ||
      name.endsWith(".zip") ||
      name.endsWith(".rar");

    return (isVideoFormat || isVideoExt) && !isBadAux;
  });
}

function extractHeight(file) {
  const candidates = [
    file.height,
    file.video_height,
    file.imageheight
  ];

  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const text = `${file.name || ""} ${file.format || ""}`;
  const match = String(text).match(/\b(2160|1440|1080|900|864|810|800|720|576|540|480|360)p\b/i);
  if (match) return Number(match[1]);

  return null;
}

function getBestVideoFile(metadataPayload) {
  const videos = getVideoFiles(metadataPayload);
  if (!videos.length) return null;

  const ranked = videos
    .map(file => ({
      file,
      height: extractHeight(file) || 0,
      size: Number(file.size || 0)
    }))
    .sort((a, b) => {
      if (b.height !== a.height) return b.height - a.height;
      return b.size - a.size;
    });

  return ranked[0];
}

function passesResolutionCheck(bestVideo, type, title, description, downloads) {
  if (!bestVideo) return false;

  const height = bestVideo.height || 0;
  const blob = `${title} ${description}`.toLowerCase();
  const isAnimeish = hasAny(blob, ["anime", "subbed", "dubbed", "ova", "pokemon", "lain"]);

  if (height >= 720) return true;
  if (type === "tv" && height >= 480) return true;
  if (type === "movie" && height >= 540 && downloads >= 400) return true;
  if (type === "movie" && height >= 480 && downloads >= 2500) return true;
  if (isAnimeish && height >= 480) return true;

  return false;
}

function hasRecognizableSignals(title, description, subjects, downloads, type) {
  const blob = `${title} ${description} ${subjects.join(" ")}`.toLowerCase();

  const strongSignals = [
    "movie",
    "film",
    "tv",
    "series",
    "episode",
    "season",
    "anime",
    "cartoon",
    "animation",
    "dubbed",
    "subbed",
    "classic tv",
    "feature film",
    "feature films",
    "science fiction",
    "horror",
    "detective",
    "western",
    "comedy",
    "drama",
    "thriller",
    "adventure"
  ];

  if (hasAny(blob, strongSignals)) return true;
  if (type === "movie" && downloads >= 120) return true;
  if (type === "tv" && downloads >= 80) return true;

  return false;
}

function isProbablyBadTvDump(title, description, downloads) {
  const blob = `${title} ${description}`.toLowerCase();

  if (hasAny(blob, ["complete series", "full series", "all episodes", "episode collection"])) {
    return downloads < 300;
  }

  return false;
}

function isBadCandidate({ title, description, subjects, metadata, downloads, type }) {
  const blob = `${title} ${description} ${subjects.join(" ")}`.toLowerCase();

  if (String(title).trim() === "." || String(title).trim().length < 2) return true;
  if (looksLikeGarbageTitle(title)) return true;

  if (hasExplicitKeywords(blob)) return true;
  if (hasNewsKeywords(blob)) return true;
  if (hasSoftwareKeywords(blob)) return true;
  if (hasReligiousUploadKeywords(blob)) return true;
  if (hasJunkKeywords(blob)) return true;
  if (isBadCollectionOrSubject(subjects)) return true;

  if (type === "tv" && isProbablyBadTvDump(title, description, downloads)) return true;

  if (/^episode\s*\d+/i.test(String(title).trim()) && downloads < 300) return true;

  if (!hasRecognizableSignals(title, description, subjects, downloads, type)) return true;

  const metadataTitle = String(firstString(metadata.title) || "").toLowerCase();
  if (metadataTitle === "home" || metadataTitle === "archive") return true;

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

  url.searchParams.append("fl[]", "identifier");
  url.searchParams.append("fl[]", "title");
  url.searchParams.append("fl[]", "description");
  url.searchParams.append("fl[]", "year");
  url.searchParams.append("fl[]", "runtime");
  url.searchParams.append("fl[]", "downloads");
  url.searchParams.append("fl[]", "subject");
  url.searchParams.append("fl[]", "collection");
  url.searchParams.append("fl[]", "mediatype");

  url.searchParams.append("sort[]", "downloads desc");
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
  const downloads = Number(doc.downloads || 0);

  if (isBadCandidate({ title, description, subjects, metadata, downloads, type })) {
    return null;
  }

  const bestVideo = getBestVideoFile(metadataPayload);
  if (!passesResolutionCheck(bestVideo, type, title, description, downloads)) {
    return null;
  }

  const row = classifyRow(title, description, subjects, type);

  return {
    id: identifier,
    title,
    type,
    row,
    year: year || "",
    duration: formatDuration(runtimeMinutes, type),
    rating: type === "tv" ? "TV-G" : "NR",
    description,
    image: `https://archive.org/services/img/${identifier}`,
    fallbackImage: `https://archive.org/services/img/${identifier}`,
    preview: `https://archive.org/embed/${identifier}`,
    downloads
  };
}

function dedupe(items) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    if (!item) continue;

    const key = item.id || item.identifier;
    if (!key) continue;

    if (seen.has(key)) continue;
    seen.add(key);
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
  const movieQuery =
    '(mediatype:movies) AND ' +
    '((collection:feature_films) OR (collection:movies) OR (subject:"feature film") OR (subject:"feature films") OR (subject:cinema) OR (subject:film))';

  const tvQuery =
    '(mediatype:movies) AND ' +
    '((collection:classic_tv) OR (subject:television) OR (subject:"television programs") OR (subject:"tv shows") OR (subject:anime) OR (title:episode) OR (title:season) OR (title:series))';

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
