const STORAGE_KEY = "dqg_quotes_v1";
const LAST_CATEGORY_KEY = "dqg_last_category_v2";

const DEFAULT_QUOTES = [
  { text: "The only way to do great work is to love what you do.", category: "Inspiration" },
  { text: "Simplicity is the soul of efficiency.", category: "Productivity" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming" },
  { text: "Whether you think you can or you think you can’t, you’re right.", category: "Mindset" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", category: "Inspiration" }
];

function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_QUOTES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_QUOTES];
  } catch { return [...DEFAULT_QUOTES]; }
}
function saveQuotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}
function escapeHtml(s) {
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

let quotes = loadQuotes();

const els = {
  categoryFilter: document.getElementById("categoryFilter"),
  quoteText: document.getElementById("quoteText"),
  quoteCategory: document.getElementById("quoteCategory"),
  newQuoteBtn: document.getElementById("newQuote"),
  toggleAddQuoteBtn: document.getElementById("toggleAddQuote"),
  addQuoteContainer: document.getElementById("addQuoteContainer"),
  quotesList: document.getElementById("quotesList"),
};

function getCategories() {
  const set = new Set(quotes.map(q => (q.category||"").trim()).filter(Boolean));
  return ["All", ...[...set].sort((a,b)=>a.localeCompare(b))];
}

function populateCategories(selected) {
  const cats = getCategories();
  const sel = selected && cats.includes(selected) ? selected : (localStorage.getItem(LAST_CATEGORY_KEY) || "All");
  els.categoryFilter.innerHTML = cats.map(c =>
    `<option value="${escapeHtml(c)}"${c===sel?" selected":""}>${escapeHtml(c)}</option>`
  ).join("");
}

function renderQuotesList(list) {
  if (!list.length) {
    els.quotesList.innerHTML = "<li>No quotes in this category yet.</li>";
    return;
  }
  els.quotesList.innerHTML = list.map(q =>
    `<li>${escapeHtml(q.text)} <small>— ${escapeHtml(q.category)}</small></li>`
  ).join("");
}

function currentFilteredQuotes() {
  const sel = els.categoryFilter.value || "All";
  if (sel === "All") return quotes;
  return quotes.filter(q => (q.category||"").trim().toLowerCase() === sel.trim().toLowerCase());
}

function showRandomQuote() {
  const pool = currentFilteredQuotes();
  if (!pool.length) {
    els.quoteText.textContent = "No quotes found for this category.";
    els.quoteCategory.textContent = "";
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  els.quoteText.textContent = pick.text;
  els.quoteCategory.textContent = `# ${pick.category}`;
}

function filterQuotes() {
  const sel = els.categoryFilter.value || "All";
  localStorage.setItem(LAST_CATEGORY_KEY, sel);
  renderQuotesList(currentFilteredQuotes());
  showRandomQuote();
}

function createAddQuoteForm() {
  if (document.getElementById("dqgAddForm")) return;
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

  const text = (textEl.value||"").trim();
  const category = (catEl.value||"").trim();
  if (!text || !category) { if (msg){ msg.textContent = "Please fill both fields."; msg.style.color="#c0292b"; } return; }

  quotes.push({ text, category });
  saveQuotes();

  const prevSel = els.categoryFilter.value || "All";
  populateCategories(prevSel);
  filterQuotes();

  textEl.value = "";
  catEl.value = "";
  if (msg){ msg.textContent = "Quote added!"; msg.style.color="#0f8f2e"; }
}

document.addEventListener("DOMContentLoaded", () => {
  populateCategories();
  renderQuotesList(currentFilteredQuotes());
  showRandomQuote();

  els.newQuoteBtn.addEventListener("click", showRandomQuote);
  els.toggleAddQuoteBtn.addEventListener("click", () => {
    if (!document.getElementById("dqgAddForm")) createAddQuoteForm();
    const form = document.getElementById("dqgAddForm");
    const visible = form.style.display !== "none";
    form.style.display = visible ? "none" : "block";
    els.toggleAddQuoteBtn.textContent = visible ? "Add Quote" : "Close Add Quote";
  });

  window.filterQuotes = filterQuotes;
});
