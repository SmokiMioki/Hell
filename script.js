const cards = [...document.querySelectorAll(".entry")];
const filters = [...document.querySelectorAll(".filter")];
const searchInput = document.getElementById("searchInput");
const visibleCount = document.getElementById("visibleCount");
const emptyState = document.getElementById("emptyState");
let activeFilter = "all";

function updateArchive() {
  const query = searchInput.value.trim().toLocaleLowerCase("ru");
  let count = 0;
  cards.forEach(card => {
    const categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
    const searchMatch = !query || (card.dataset.name + " " + card.innerText).toLocaleLowerCase("ru").includes(query);
    const show = categoryMatch && searchMatch;
    card.hidden = !show;
    if (show) count++;
  });
  visibleCount.textContent = String(count).padStart(2, "0");
  emptyState.hidden = count > 0;
}
filters.forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  filters.forEach(item => item.classList.toggle("active", item === button));
  updateArchive();
}));
searchInput.addEventListener("input", updateArchive);

const dialog = document.getElementById("detailDialog");
document.querySelectorAll("[data-detail]").forEach(link => link.addEventListener("click", event => {
  event.preventDefault();
  const card = link.closest(".entry");
  document.getElementById("dialogTitle").textContent = link.dataset.detail;
  document.getElementById("dialogText").textContent = card.querySelector("p").textContent;
  dialog.showModal();
}));
document.getElementById("dialogClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

document.getElementById("themeToggle").addEventListener("click", () => document.body.classList.toggle("paper-mode"));
document.getElementById("menuToggle").addEventListener("click", () => document.querySelector(".site-header nav").classList.toggle("open"));
document.querySelectorAll(".site-header nav a").forEach(link => link.addEventListener("click", () => document.querySelector(".site-header nav").classList.remove("open")));
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});
updateArchive();
