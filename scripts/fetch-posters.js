const fs = require("fs");

const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  console.error("Missing TMDB_API_KEY");
  process.exit(1);
}

const CATALOG_PATH = "./catalog.js";
const OUTPUT_PATH = "./posters.json";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

function loadCatalog() {
  const source = fs.readFileSync(CATALOG_PATH, "utf8");

  // Supports either: const CATALOG = [...] or window.CATALOG = [...]
  const match = source.match(/(?:const\s+CATALOG\s*=|window\.CATALOG\s*=)\s*(\[[\s\S]*?\])\s*;/);

  if (!match) {
    throw new Error("Could not parse CATALOG from catalog.js");
  }

  return Function(`"use strict"; return (${match[1]});`)();
}

async function searchTmdb(item) {
  const type = item.type === "tv" ? "tv" : "movie";
  const yearParam = type === "tv" ? "first_air_date_year" : "year";

  const url =
    `https://api.themoviedb.org/3/search/${type}` +
    `?api_key=${encodeURIComponent(API_KEY)}` +
    `&query=${encodeURIComponent(item.title)}` +
    `&${yearParam}=${encodeURIComponent(item.year || "")}` +
    `&include_adult=false`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status}`);
  }

  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  if (!results.length) return null;

  const exactYearMatch = results.find((r) => {
    const date = r.release_date || r.first_air_date || "";
    return item.year && String(date).startsWith(String(item.year));
  });

  const best = exactYearMatch || results[0];

  if (!best || !best.poster_path) return null;

  return `${TMDB_IMAGE_BASE}${best.poster_path}`;
}

async function main() {
  const catalog = loadCatalog();
  const posters = {};

  for (const item of catalog) {
    try {
      const posterUrl = await searchTmdb(item);
      posters[item.id] = posterUrl;
      console.log(`Poster for ${item.title}: ${posterUrl || "none"}`);
    } catch (err) {
      console.warn(`Failed for ${item.title}:`, err.message);
      posters[item.id] = null;
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(posters, null, 2));
  console.log(`Saved ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
