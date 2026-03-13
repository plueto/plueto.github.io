window.CATALOG = [

{
id: "scarface-1932_202109",
title: "Scarface",
type: "movie",
row: "Crime",
isNew: true,
year: 1932,
duration: "93m",
rating: "PG",
description: "A ruthless gangster rises to power in Chicago during the prohibition era.",
hero: false,
image: "https://upload.wikimedia.org/wikipedia/commons/7/76/Scarface_Poster.jpg",
fallbackImage: "https://archive.org/services/img/scarface-1932_202109",
preview: "https://archive.org/embed/scarface-1932_202109"
},

{
id: "night_of_the_living_dead",
title: "Night of the Living Dead",
type: "movie",
row: "Horror",
isNew: true,
year: 1968,
duration: "96m",
rating: "PG",
description: "A group of strangers hide in a farmhouse while the dead rise and hunt the living.",
hero: false,
image: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Night_of_the_Living_Dead_Film_Poster.jpg",
fallbackImage: "https://archive.org/services/img/night_of_the_living_dead",
preview: "https://archive.org/embed/night_of_the_living_dead"
},

{
id: "nosferatu",
title: "Nosferatu",
type: "movie",
row: "Horror",
isNew: false,
year: 1922,
duration: "94m",
rating: "PG",
description: "The silent German classic that introduced the terrifying Count Orlok.",
hero: false,
image: "https://upload.wikimedia.org/wikipedia/commons/3/38/Nosferatu_Vampyr.jpg",
fallbackImage: "https://archive.org/services/img/nosferatu",
preview: "https://archive.org/embed/nosferatu"
},

{
id: "phantom_of_the_opera",
title: "The Phantom of the Opera",
type: "movie",
row: "Horror",
isNew: false,
year: 1925,
duration: "93m",
rating: "PG",
description: "A mysterious phantom haunts the Paris Opera House.",
hero: false,
image: "https://upload.wikimedia.org/wikipedia/commons/3/35/Phantom_of_the_Opera_poster_1925.jpg",
fallbackImage: "https://archive.org/services/img/phantom_of_the_opera",
preview: "https://archive.org/embed/phantom_of_the_opera"
},

{
id: "fantastic-planet__1973",
title: "Fantastic Planet",
type: "movie",
row: "Sci-Fi",
isNew: true,
year: 1973,
duration: "72m",
rating: "PG",
description: "A surreal animated sci-fi film about humans living as pets on an alien world.",
hero: true,
image: "https://archive.org/services/img/fantastic-planet__1973",
fallbackImage: "https://archive.org/services/img/fantastic-planet__1973",
preview: "https://archive.org/embed/fantastic-planet__1973"
},

{
id: "popeye-colorized-collection",
title: "Popeye Cartoons",
type: "movie",
row: "Animation",
isNew: false,
year: 1933,
duration: "Series",
rating: "G",
description: "Classic Popeye animated shorts featuring spinach-fueled adventures.",
hero: false,
image: "https://upload.wikimedia.org/wikipedia/commons/9/92/Popeye_the_Sailor_poster.jpg",
fallbackImage: "https://archive.org/services/img/popeye-colorized-collection",
preview: "https://archive.org/embed/popeye-colorized-collection"
},

{
id: "day-the-earth-stood-still-1951",
title: "The Day the Earth Stood Still",
type: "movie",
row: "Sci-Fi",
isNew: true,
year: 1951,
duration: "92m",
rating: "PG",
description: "An alien visitor arrives on Earth with a warning for humanity.",
hero: false,
image: "https://upload.wikimedia.org/wikipedia/commons/6/66/The_Day_the_Earth_Stood_Still_%281951_poster%29.jpg",
fallbackImage: "https://archive.org/services/img/day-the-earth-stood-still-1951",
preview: "https://archive.org/embed/day-the-earth-stood-still-1951"
}

];

function getMyList() {
return JSON.parse(localStorage.getItem("pluetoMyList") || "[]");
}

function setMyList(list) {
localStorage.setItem("pluetoMyList", JSON.stringify(list));
}

function toggleMyList(id) {
const list = getMyList();
const exists = list.includes(id);
const next = exists ? list.filter(x => x !== id) : [...list, id];
setMyList(next);
}
