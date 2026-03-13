/* =========================
   PLUETO TV AUTO CATALOG
   - keeps your manual picks
   - auto-loads more from Internet Archive
   - injects hover-card CSS
========================= */

/* ---------- AUTO CSS INJECTION ---------- */
const style = document.createElement("style");
style.innerHTML = `
.row-track,
.cards-row,
.poster-row,
.catalog-row{
  display:flex;
  gap:16px;
  overflow-x:auto;
  padding:20px 0 40px;
  scroll-behavior:smooth;
}

.media-card{
  position:relative;
  flex:0 0 220px;
  text-decoration:none;
  color:white;
  border-radius:16px;
  overflow:visible;
}

.media-card-poster{
  width:100%;
  aspect-ratio:16/9;
  object-fit:cover;
  display:block;
  border-radius:16px;
  transition:transform .22s ease, box-shadow .22s ease;
  background:#111;
}

.media-card:hover .media-card-poster{
  transform:scale(1.05);
  box-shadow:0 14px 34px rgba(0,0,0,.45);
}

.media-card-hover{
  position:absolute;
  left:0;
  right:0;
  top:calc(100% - 18px);
  background:#141414;
  border-radius:0 0 18px 18px;
  padding:14px;
  opacity:0;
  transform:translateY(-8px);
  pointer-events:none;
  transition:opacity .2s ease, transform .2s ease;
  box-shadow:0 16px 40px rgba(0,0,0,.5);
  z-index:50;
}

.media-card:hover .media-card-hover{
  opacity:1;
  transform:translateY(0);
  pointer-events:auto;
}

.media-card-title{
  font-size:.95rem;
  font-weight:700;
  margin:10px 0 0;
}

.media-card-meta{
  display:flex;
  gap:8px;
  margin:10px 0;
  font-size:.78rem;
  color:#b8b8b8;
  flex-wrap:wrap;
}

.media-pill{
  border:1px solid rgba(255,255,255,.16);
  border-radius:999px;
  padding:4px 8px;
  background:rgba(255,255,255,.04);
}

.media-card-desc{
  font-size:.84rem;
  line-height:1.45;
  color:#d6d6d6;
  margin-bottom:12px;
}

.media-card-actions{
  display:flex;
  gap:10px;
}

.media-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:38px;
  padding:0 14px;
  border-radius:999px;
  border:none;
  cursor:pointer;
  font-weight:700;
}

.media-btn-play{
  background:white;
  color:black;
}

.media-btn-list{
  background:rgba(255,255,255,.08);
  color:white;
  border:1px solid rgba(255,255,255,.14);
}

@media (max-width:700px){
  .media-card{ flex-basis:170px; }
  .media-card-hover{ display:none; }
}
`;
document.head.appendChild(style);

/* ---------- HELPERS ---------- */
function archiveImg(id){
  return `https://archive.org/services/img/${id}`;
}

function archiveEmbed(id){
  return `https://archive.org/embed/${id}`;
}

function safeText(value, fallback = ""){
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function normalizeYear(value){
  if (!value) return "";
  const str = String(value);
  const match = str.match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : "";
}

function guessRating(text = ""){
  const t = text.toLowerCase();
  if (t.includes("tv-ma") || t.includes("mature")) return "TV-MA";
  if (t.includes("tv-14")) return "TV-14";
  if (t.includes("adult")) return "R";
  return "PG";
}

function guessRow(item){
  const blob = `${item.title} ${item.description}`.toLowerCase();

  if (/(horror|ghost|phantom|dracula|vampire|zombie|monster|nosferatu|dead)/.test(blob)) return "Horror";
  if (/(crime|gangster|detective|police|murder|scarface|noir)/.test(blob)) return "Crime";
  if (/(space|alien|planet|robot|future|science fiction|sci-fi|earth stood still)/.test(blob)) return "Sci-Fi";
  if (/(cartoon|animation|animated|popeye)/.test(blob)) return "Animation";
  if (/(romance|love|casanova)/.test(blob)) return "Drama";
  if (/(western|cowboy)/.test(blob)) return "Westerns";

  return "Featured";
}

function cleanDescription(text){
  const value = safeText(text, "Classic public-domain cinema from the Internet Archive.");
  return value.length > 180 ? value.slice(0, 177) + "..." : value;
}

function dedupeById(items){
  const seen = new Set();
  return items.filter(item => {
    if (!item || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isProbablyBadFit(doc){
  const title = safeText(doc.title).toLowerCase();
  const desc = safeText(doc.description).toLowerCase();
  const id = safeText(doc.identifier).toLowerCase();
  const blob = `${title} ${desc} ${id}`;

  // weed out obvious junk for your site
  if (/(trailer|promo|clip|sample|behind the scenes|episode \d|season \d|test upload|vhs rip)/.test(blob)) return true;
  if (/(xxx|porn|sex|adult only)/.test(blob)) return true;
  if (/(iso|dvd|blu-ray|bdmv|disc image)/.test(blob)) return true;

  return false;
}

function toCatalogItem(doc, index = 0){
  const id = safeText(doc.identifier);
  const title = safeText(doc.title, id.replace(/[-_]/g, " "));
  const description = cleanDescription(doc.description);
  const year = normalizeYear(doc.year || doc.date || doc.publicdate) || "";
  const row = guessRow({ title, description });

  return {
    id,
    title,
    type: "movie",
    row,
    isNew: index < 12,
    year,
    duration: "Full Movie",
    rating: guessRating(description),
    description,
    hero: false,
    image: archiveImg(id),
    preview: archiveEmbed(id)
  };
}

/* ---------- MANUAL PICKS ---------- */
const MANUAL_PICKS = [
  {
    id:"scarface-1932_202109",
    title:"Scarface",
    type:"movie",
    row:"Crime",
    isNew:true,
    year:1932,
    duration:"93m",
    rating:"PG",
    description:"A ruthless gangster rises to power in Chicago during the prohibition era.",
    hero:true,
    image:archiveImg("scarface-1932_202109"),
    preview:archiveEmbed("scarface-1932_202109")
  },
  {
    id:"night_of_the_living_dead",
    title:"Night of the Living Dead",
    type:"movie",
    row:"Horror",
    isNew:true,
    year:1968,
    duration:"96m",
    rating:"PG",
    description:"A group of strangers hide in a farmhouse while the dead rise and hunt the living.",
    hero:false,
    image:archiveImg("night_of_the_living_dead"),
    preview:archiveEmbed("night_of_the_living_dead")
  },
  {
    id:"nosferatu",
    title:"Nosferatu",
    type:"movie",
    row:"Horror",
    isNew:false,
    year:1922,
    duration:"94m",
    rating:"PG",
    description:"The silent German classic that introduced the terrifying Count Orlok.",
    hero:false,
    image:archiveImg("nosferatu"),
    preview:archiveEmbed("nosferatu")
  },
  {
    id:"phantom_of_the_opera",
    title:"The Phantom of the Opera",
    type:"movie",
    row:"Horror",
    isNew:false,
    year:1925,
    duration:"93m",
    rating:"PG",
    description:"A mysterious phantom haunts the Paris Opera House.",
    hero:false,
    image:archiveImg("phantom_of_the_opera"),
    preview:archiveEmbed("phantom_of_the_opera")
  },
  {
    id:"fantastic-planet__1973",
    title:"Fantastic Planet",
    type:"movie",
    row:"Sci-Fi",
    isNew:true,
    year:1973,
    duration:"72m",
    rating:"PG",
    description:"A surreal animated sci-fi film about humans living as pets on an alien world.",
    hero:false,
    image:archiveImg("fantastic-planet__1973"),
    preview:archiveEmbed("fantastic-planet__1973")
  },
  {
    id:"popeye-colorized-collection",
    title:"Popeye Cartoons",
    type:"movie",
    row:"Animation",
    isNew:false,
    year:1933,
    duration:"Series",
    rating:"G",
    description:"Classic Popeye animated shorts featuring spinach-fueled adventures.",
    hero:false,
    image:archiveImg("popeye-colorized-collection"),
    preview:archiveEmbed("popeye-colorized-collection")
  },
  {
    id:"day-the-earth-stood-still-1951",
    title:"The Day the Earth Stood Still",
    type:"movie",
    row:"Sci-Fi",
    isNew:true,
    year:1951,
    duration:"92m",
    rating:"PG",
    description:"An alien visitor arrives on Earth with a warning for humanity.",
    hero:false,
    image:archiveImg("day-the-earth-stood-still-1951"),
    preview:archiveEmbed("day-the-earth-stood-still-1951")
  }
];

/* ---------- GLOBAL CATALOG ---------- */
window.CATALOG = [...MANUAL_PICKS];

/* ---------- CARD BUILDER ---------- */
function createMediaCard(item){
  return `
    <a class="media-card" href="watch.html?id=${encodeURIComponent(item.id)}">
      <img class="media-card-poster" src="${item.image}" alt="${item.title}" loading="lazy">

      <div class="media-card-title">${item.title}</div>

      <div class="media-card-hover">
        <div class="media-card-title">${item.title}</div>

        <div class="media-card-meta">
          ${item.isNew ? `<span class="media-pill">New</span>` : ""}
          ${item.year ? `<span class="media-pill">${item.year}</span>` : ""}
          <span class="media-pill">${item.rating}</span>
          <span class="media-pill">${item.duration}</span>
        </div>

        <p class="media-card-desc">${item.description}</p>

        <div class="media-card-actions">
          <span class="media-btn media-btn-play">▶ Play</span>
          <button class="media-btn media-btn-list" type="button" onclick="event.preventDefault();toggleMyList('${item.id}')">
            + My List
          </button>
        </div>
      </div>
    </a>
  `;
}

/* ---------- MY LIST ---------- */
function getMyList(){
  return JSON.parse(localStorage.getItem("pluetoMyList") || "[]");
}

function setMyList(list){
  localStorage.setItem("pluetoMyList", JSON.stringify(list));
}

function toggleMyList(id){
  const list = getMyList();
  const exists = list.includes(id);
  const next = exists ? list.filter(x => x !== id) : [...list, id];
  setMyList(next);
  window.dispatchEvent(new CustomEvent("mylist:updated", { detail: next }));
}

/* ---------- OPTIONAL AUTO RENDER HELPERS ---------- */
function renderInto(selector, items){
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = items.map(createMediaCard).join("");
}

function groupByRow(items){
  return items.reduce((acc, item) => {
    const key = item.row || "Featured";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function tryAutoRender(){
  // if your existing pages already render CATALOG, this won't hurt anything.
  // if they don't, this gives you a fallback.
  const grouped = groupByRow(window.CATALOG);

  renderInto("#continue-watching-row", window.CATALOG.slice(0, 12));
  renderInto("#my-list-row", window.CATALOG.filter(item => getMyList().includes(item.id)));

  const moviesGrid = document.querySelector("#movies-grid");
  if (moviesGrid) {
    moviesGrid.innerHTML = Object.entries(grouped).map(([rowName, items]) => `
      <section class="catalog-section">
        <h2>${rowName}</h2>
        <div class="catalog-row">${items.map(createMediaCard).join("")}</div>
      </section>
    `).join("");
  }
}

/* ---------- INTERNET ARCHIVE AUTO LOAD ---------- */
async function loadArchiveMovies(){
  const query = [
    'collection:(feature_films)',
    'AND mediatype:(movies)',
    'AND -title:(trailer)',
    'AND -description:(trailer)',
    'AND -format:(ISO)'
  ].join(" ");

  const params = new URLSearchParams();
  params.set("q", query);
  params.append("fl[]", "identifier");
  params.append("fl[]", "title");
  params.append("fl[]", "description");
  params.append("fl[]", "year");
  params.append("fl[]", "date");
  params.append("fl[]", "downloads");
  params.append("fl[]", "mediatype");
  params.set("sort[]", "downloads desc");
  params.set("rows", "60");
  params.set("page", "1");
  params.set("output", "json");

  const url = `https://archive.org/advancedsearch.php?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Archive request failed: ${res.status}`);
    const data = await res.json();

    const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];

    const autoItems = docs
      .filter(doc => !isProbablyBadFit(doc))
      .map((doc, index) => toCatalogItem(doc, index));

    window.CATALOG = dedupeById([...MANUAL_PICKS, ...autoItems]);

    window.dispatchEvent(new CustomEvent("catalog:updated", { detail: window.CATALOG }));
    tryAutoRender();

    console.log(`Loaded ${autoItems.length} archive movies`);
  } catch (error) {
    console.warn("Could not auto-load Internet Archive movies.", error);
  }
}

/* ---------- BOOT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  tryAutoRender();
  loadArchiveMovies();
});
