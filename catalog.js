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
`;
document.head.appendChild(style);


/* ---------- MOVIE CATALOG ---------- */

const CATALOG = [

{
id:"scarface-1932_202109",
title:"Scarface",
type:"movie",
row:"Crime",
year:1932,
duration:"93m",
rating:"PG",
description:"A ruthless gangster rises to power in Chicago during the prohibition era.",
image:"https://archive.org/services/img/scarface-1932_202109"
},

{
id:"night_of_the_living_dead",
title:"Night of the Living Dead",
type:"movie",
row:"Horror",
year:1968,
duration:"96m",
rating:"PG",
description:"A group of strangers hide in a farmhouse while the dead rise and hunt the living.",
image:"https://archive.org/services/img/night_of_the_living_dead"
},

{
id:"nosferatu",
title:"Nosferatu",
type:"movie",
row:"Horror",
year:1922,
duration:"94m",
rating:"PG",
description:"The silent German classic that introduced the terrifying Count Orlok.",
image:"https://archive.org/services/img/nosferatu"
},

{
id:"phantom_of_the_opera",
title:"The Phantom of the Opera",
type:"movie",
row:"Horror",
year:1925,
duration:"93m",
rating:"PG",
description:"A mysterious phantom haunts the Paris Opera House.",
image:"https://archive.org/services/img/phantom_of_the_opera"
},

{
id:"fantastic-planet__1973",
title:"Fantastic Planet",
type:"movie",
row:"Sci-Fi",
year:1973,
duration:"72m",
rating:"PG",
description:"A surreal animated sci-fi film about humans living as pets on an alien world.",
image:"https://archive.org/services/img/fantastic-planet__1973"
},

{
id:"popeye-colorized-collection",
title:"Popeye Cartoons",
type:"movie",
row:"Animation",
year:1933,
duration:"Series",
rating:"G",
description:"Classic Popeye animated shorts featuring spinach-fueled adventures.",
image:"https://archive.org/services/img/popeye-colorized-collection"
},

{
id:"day-the-earth-stood-still-1951",
title:"The Day the Earth Stood Still",
type:"movie",
row:"Sci-Fi",
year:1951,
duration:"92m",
rating:"PG",
description:"An alien visitor arrives on Earth with a warning for humanity.",
image:"https://archive.org/services/img/day-the-earth-stood-still-1951"
}

];


/* ---------- CARD BUILDER ---------- */

function createMediaCard(item){
return `
<a class="media-card" href="watch.html?id=${item.id}">
<img class="media-card-poster" src="${item.image}" alt="${item.title}">

<div class="media-card-title">${item.title}</div>

<div class="media-card-hover">

<div class="media-card-title">${item.title}</div>

<div class="media-card-meta">
<span class="media-pill">${item.year}</span>
<span class="media-pill">${item.rating}</span>
<span class="media-pill">${item.duration}</span>
</div>

<p class="media-card-desc">${item.description}</p>

<div class="media-card-actions">
<span class="media-btn media-btn-play">▶ Play</span>
<button class="media-btn media-btn-list" onclick="event.preventDefault();toggleMyList('${item.id}')">+ My List</button>
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
localStorage.setItem("pluetoMyList",JSON.stringify(list));
}

function toggleMyList(id){
const list=getMyList();
const exists=list.includes(id);
const next=exists ? list.filter(x=>x!==id) : [...list,id];
setMyList(next);
}
