const MY_LIST_KEY = "plueto_my_list";

function getMyList() {
  const raw = localStorage.getItem(MY_LIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveMyList(list) {
  localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
}

function toggleMyList(id) {
  const list = getMyList();
  const index = list.indexOf(id);

  if (index === -1) {
    list.push(id);
  } else {
    list.splice(index, 1);
  }

  saveMyList(list);
}

function isInMyList(id) {
  return getMyList().includes(id);
}
