const cards = [...document.querySelectorAll(".extension-card")];
const filters = [...document.querySelectorAll(".filter")];
const searchInput = document.getElementById("searchInput");
const visibleCount = document.getElementById("visibleCount");
const emptyState = document.getElementById("emptyState");
let activeFilter = "all";

function updateCatalog() {
  const query = searchInput.value.trim().toLocaleLowerCase("ru");
  let count = 0;
  cards.forEach(card => {
    const categoryMatches = activeFilter === "all" || card.dataset.category === activeFilter;
    const searchMatches = !query || (card.dataset.name + " " + card.innerText).toLocaleLowerCase("ru").includes(query);
    const show = categoryMatches && searchMatches;
    card.hidden = !show;
    if (show) count++;
  });
  visibleCount.textContent = String(count).padStart(2, "0");
  emptyState.hidden = count !== 0;
}
filters.forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  filters.forEach(item => item.classList.toggle("active", item === button));
  updateCatalog();
}));
searchInput.addEventListener("input", updateCatalog);

const dialog = document.getElementById("detailDialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogText = document.getElementById("dialogText");
document.querySelectorAll("[data-detail]").forEach(link => link.addEventListener("click", event => {
  event.preventDefault();
  const card = link.closest(".extension-card");
  dialogTitle.textContent = link.dataset.detail;
  dialogText.textContent = card.querySelector("p").textContent;
  dialog.showModal();
}));
document.getElementById("dialogClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
});
document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("nav").classList.toggle("open");
});
document.querySelectorAll(".nav a").forEach(link => link.addEventListener("click", () => {
  document.getElementById("nav").classList.remove("open");
}));

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});
updateCatalog();
