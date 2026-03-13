const MY_LIST_KEY = "plueto_my_list";

function getMyList() {
  try {
    const raw = localStorage.getItem(MY_LIST_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMyList(list) {
  localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
}

function toggleMyList(id) {
  const list = getMyList();
  const index = list.indexOf(id);

  if (index === -1) {
    list.push(id);
    saveMyList(list);
    return true;
  } else {
    list.splice(index, 1);
    saveMyList(list);
    return false;
  }
}

function isInMyList(id) {
  return getMyList().includes(id);
}

function getMyListButtonLabel(id) {
  return isInMyList(id) ? "✓ In My List" : "+ My List";
}
