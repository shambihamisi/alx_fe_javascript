// Storage keys
const STORAGE_KEY = "dqg_quotes_v1";
const LAST_CATEGORY_KEY = "dqg_last_category_v2";

// Data
const DEFAULT_QUOTES = [
  { text: "The only way to do great work is to love what you do.", category: "Inspiration" },
  { text: "Simplicity is the soul of efficiency.", category: "Productivity" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming" },
  { text: "Whether you think you can or you think you can’t, you’re right.", category: "Mindset" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", category: "Inspiration" }
];

// State
let quotes = loadQuotes();
// NEW: canonical selected category state (persisted)
let selectedCategory = loadSelectedCategory(); // "All" or a real category

// Elements (both old and new markup supported)
const els = {
  categoryFilter: document.getElementById("categoryFilter"),
  quoteDisplay: document.getElementById("quoteDisplay"),
  quoteText: document.getElementById("quoteText"),
  quoteCategory: document.getElementById("quoteCategory"),
  newQuoteBtn: document.getElementById("newQuote"),
  toggleAddQuoteBtn: document.getElementById("toggleAddQuote"),
  addQuoteContainer: document.getElementById("addQuoteContainer"),
  quotesList: document.getElementById("quotesList"),
};

// ---- Persistence helpers ----
function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_QUOTES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_QUOTES];
  } catch {
    return [...DEFAULT_QUOTES];
  }
}
function saveQuotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}
function loadSelectedCategory() {
  try {
    return localStorage.getItem(LAST_CATEGORY_KEY) || "All";
  } catch {
    return "All";
  }
}
function saveSelectedCategory(cat) {
  selectedCategory = cat || "All";
  localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory);
}

// ---- Utilities ----
function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function getCategories() {
  const set = new Set(quotes.map(q => (q.category || "").trim()).filter(Boolean));
  return ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
}

// ---- UI builders ----
function populateCategories(preselect) {
  const cats = getCategories();
  // Decide which to select: explicit preselect > saved selectedCategory > "All"
  const toSelect = cats.includes(preselect) ? preselect : (cats.includes(selectedCategory) ? selectedCategory : "All");
  if (els.categoryFilter) {
    els.categoryFilter.innerHTML = cats
      .map(c => `<option value="${escapeHtml(c)}"${c === toSelect ? " selected" : ""}>${escapeHtml(c)}</option>`)
      .join("");
  }
  // Keep state in sync
  saveSelectedCategory(toSelect);
}

function renderQuotesList(list) {
  if (!els.quotesList) return;
  if (!list.length) {
    els.quotesList.innerHTML = "<li>No quotes in this category yet.</li>";
    return;
  }
  els.quotesList.innerHTML = list
    .map(q => `<li>${escapeHtml(q.text)} <small>— ${escapeHtml(q.category)}</small></li>`)
    .join("");
}

// ---- Filtering ----
function currentFilteredQuotes() {
  const sel = selectedCategory || "All";
  if (sel === "All") return quotes;
  return quotes.filter(q => (q.category || "").trim().toLowerCase() === sel.trim().toLowerCase());
}

// ---- Display helpers ----
function displayQuote(pick) {
  if (els.quoteDisplay) {
    els.quoteDisplay.textContent = `${pick.text} — ${pick.category}`;
  } else {
    if (els.quoteText) els.quoteText.textContent = pick.text;
    if (els.quoteCategory) els.quoteCategory.textContent = `# ${pick.category}`;
  }
}
function clearQuote(msg = "No quotes found for this category.") {
  if (els.quoteDisplay) {
    els.quoteDisplay.textContent = msg;
  } else {
    if (els.quoteText) els.quoteText.textContent = msg;
    if (els.quoteCategory) els.quoteCategory.textContent = "";
  }
}

// ---- Required actions ----
function showRandomQuote() {
  const pool = currentFilteredQuotes();
  if (!pool.length) { clearQuote(); return; }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  displayQuote(pick);
}

function filterQuotes() {
  // Read from UI if available, otherwise trust state
  const uiVal = els.categoryFilter && els.categoryFilter.value ? els.categoryFilter.value : selectedCategory;
  saveSelectedCategory(uiVal);
  renderQuotesList(currentFilteredQuotes());
  showRandomQuote();
}

// ---- Add-quote UI ----
function createAddQuoteForm() {
  if (!els.addQuoteContainer || document.getElementById("dqgAddForm")) return;
  const wrap = document.createElement("div");
  wrap.id = "dqgAddForm";
  wrap.innerHTML = `
    <h3>Add a Quote</h3>
    <input id="newQuoteText" type="text" placeholder="Enter a new quote" />
    <input id="newQuoteCategory" type="text" placeholder="Enter quote category" />
    <button id="submitNewQuote">Add Quote</button>
    <span id="formMsg"></span>
  `;
  els.addQuoteContainer.appendChild(wrap);
  document.getElementById("submitNewQuote").addEventListener("click", addQuote);
}

function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const msg = document.getElementById("formMsg");
  if (!textEl || !catEl) return;

  const text = (textEl.value || "").trim();
  const category = (catEl.value || "").trim();
  if (!text || !category) {
    if (msg) { msg.textContent = "Please fill both fields."; msg.style.color = "#c0292b"; }
    return;
  }

  quotes.push({ text, category });
  saveQuotes();

  // Update categories, keep current selection if possible
  const keep = els.categoryFilter && els.categoryFilter.value ? els.categoryFilter.value : selectedCategory;
  populateCategories(keep);
  filterQuotes();

  textEl.value = "";
  catEl.value = "";
  if (msg) { msg.textContent = "Quote added!"; msg.style.color = "#0f8f2e"; }
}

// ---- Boot ----
document.addEventListener("DOMContentLoaded", () => {
  populateCategories(selectedCategory);
  renderQuotesList(currentFilteredQuotes());
  showRandomQuote();

  if (els.newQuoteBtn) els.newQuoteBtn.addEventListener("click", showRandomQuote);

  if (els.categoryFilter) {
    els.categoryFilter.addEventListener("change", () => {
      saveSelectedCategory(els.categoryFilter.value || "All");
      filterQuotes();
    });
  }

  if (els.toggleAddQuoteBtn) {
    els.toggleAddQuoteBtn.addEventListener("click", () => {
      if (!document.getElementById("dqgAddForm")) createAddQuoteForm();
      const form = document.getElementById("dqgAddForm");
      const visible = form && form.style.display !== "none";
      if (form) form.style.display = visible ? "none" : "block";
      els.toggleAddQuoteBtn.textContent = visible ? "Add Quote" : "Close Add Quote";
    });
  }

  // Expose for inline handlers if used in HTML
  window.filterQuotes = filterQuotes;
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;
  window.addQuote = addQuote;
});
