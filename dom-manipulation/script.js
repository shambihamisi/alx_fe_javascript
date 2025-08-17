// ---------- Storage Keys ----------
const STORAGE_KEY = "dqg_quotes_v1";
const LAST_CATEGORY_KEY = "dqg_last_category_v2";
const LAST_SYNC_KEY = "dqg_last_sync_v1";

// ---------- Defaults ----------
const DEFAULT_QUOTES = [
  { text: "The only way to do great work is to love what you do.", category: "Inspiration", updatedAt: Date.now() - 5e6 },
  { text: "Simplicity is the soul of efficiency.", category: "Productivity", updatedAt: Date.now() - 4e6 },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming", updatedAt: Date.now() - 3e6 },
  { text: "Whether you think you can or you think you can’t, you’re right.", category: "Mindset", updatedAt: Date.now() - 2e6 },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", category: "Inspiration", updatedAt: Date.now() - 1e6 }
];

// ---------- State ----------
let quotes = loadQuotes();
let selectedCategory = loadSelectedCategory();
let conflicts = []; // {key, localQuote, serverQuote}

// ---------- Elements ----------
const els = {
  categoryFilter: document.getElementById("categoryFilter"),
  quoteDisplay: document.getElementById("quoteDisplay"),
  newQuoteBtn: document.getElementById("newQuote"),
  toggleAddQuoteBtn: document.getElementById("toggleAddQuote"),
  addQuoteContainer: document.getElementById("addQuoteContainer"),
  quotesList: document.getElementById("quotesList"),
  forceSyncBtn: document.getElementById("forceSyncBtn"),
  syncStatus: document.getElementById("syncStatus"),
  syncBanner: document.getElementById("syncBanner"),
  syncMessage: document.getElementById("syncMessage"),
  reviewConflictsBtn: document.getElementById("reviewConflictsBtn"),
  conflictPanel: document.getElementById("conflictPanel"),
  conflictList: document.getElementById("conflictList"),
  closeConflictPanel: document.getElementById("closeConflictPanel"),
};

// ---------- Utilities ----------
function escapeHtml(s) {
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;")
                  .replaceAll(">","&gt;").replaceAll('"',"&quot;")
                  .replaceAll("'","&#039;");
}
function keyOf(q) { return (q.text.trim()+"||"+q.category.trim()).toLowerCase(); }

// ---------- Persistence ----------
function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_QUOTES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_QUOTES];
  } catch { return [...DEFAULT_QUOTES]; }
}
function saveQuotes() { localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes)); }

function loadSelectedCategory() {
  try { return localStorage.getItem(LAST_CATEGORY_KEY) || "All"; }
  catch { return "All"; }
}
function saveSelectedCategory(cat) {
  selectedCategory = cat || "All";
  localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory);
}

function setLastSync(ts) {
  localStorage.setItem(LAST_SYNC_KEY, String(ts));
  if (els.syncStatus) els.syncStatus.textContent = `Last sync: ${new Date(ts).toLocaleString()}`;
}
function getLastSync() { return Number(localStorage.getItem(LAST_SYNC_KEY) || 0); }

// ---------- Category & Rendering ----------
function getCategories() {
  const set = new Set(quotes.map(q => (q.category||"").trim()).filter(Boolean));
  return ["All", ...[...set].sort((a,b)=>a.localeCompare(b))];
}
function populateCategories(preselect) {
  const cats = getCategories();
  const pick = cats.includes(preselect) ? preselect : (cats.includes(selectedCategory) ? selectedCategory : "All");
  if (els.categoryFilter) {
    els.categoryFilter.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}"${c===pick?" selected":""}>${escapeHtml(c)}</option>`).join("");
  }
  saveSelectedCategory(pick);
}
function currentFilteredQuotes() {
  const sel = selectedCategory || "All";
  if (sel === "All") return quotes;
  return quotes.filter(q => (q.category||"").trim().toLowerCase() === sel.trim().toLowerCase());
}
function renderQuotesList(list) {
  if (!els.quotesList) return;
  if (!list.length) { els.quotesList.innerHTML = "<li>No quotes in this category yet.</li>"; return; }
  els.quotesList.innerHTML = list.map(q => `<li>${escapeHtml(q.text)} <small>— ${escapeHtml(q.category)}</small></li>`).join("");
}
function displayQuote(pick) {
  els.quoteDisplay.textContent = `${pick.text} — ${pick.category}`;
}
function clearQuote(msg="No quotes found for this category.") {
  els.quoteDisplay.textContent = msg;
}
function showRandomQuote() {
  const pool = currentFilteredQuotes();
  if (!pool.length) { clearQuote(); return; }
  const pick = pool[Math.floor(Math.random()*pool.length)];
  displayQuote(pick);
}
function filterQuotes() {
  const uiVal = els.categoryFilter && els.categoryFilter.value ? els.categoryFil
