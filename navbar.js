async function loadNavbar(activeKey = "") {
  const mount = document.getElementById("navbar-mount");
  if (!mount) return;

  try {
    const res = await fetch("components/navbar.html");
    const html = await res.text();
    mount.innerHTML = html;

    if (activeKey) {
      const activeLink = mount.querySelector(`[data-nav="${activeKey}"]`);
      if (activeLink) activeLink.classList.add("active");
    }

    wireGlobalSearch();
  } catch (err) {
    console.error("Navbar failed to load:", err);
  }
}

function wireGlobalSearch() {
  const form = document.querySelector(".nav-search");
  const input = document.getElementById("global-search-input");
  if (!form || !input) return;

  const params = new URLSearchParams(window.location.search);
  const existingQuery = params.get("q");
  if (existingQuery) input.value = existingQuery;

  form.addEventListener("submit", (e) => {
    const q = input.value.trim();
    if (!q) {
      e.preventDefault();
      return;
    }

    // send all searches to homepage
    window.location.href = `index.html?q=${encodeURIComponent(q)}`;
    e.preventDefault();
  });
}
