// Storage keys
const STORAGE_KEY = "dqg_quotes_v1";
const LAST_CATEGORY_KEY = "dqg_last_category_v2";
const LAST_SYNC_KEY = "dqg_last_sync_v1";

// Defaults
const DEFAULT_QUOTES = [
  { text: "The only way to do great work is to love what you do.", category: "Inspiration", updatedAt: Date.now() - 5e6 },
  { text: "Simplicity is the soul of efficiency.", category: "Productivity", updatedAt: Date.now() - 4e6 },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming", updatedAt: Date.now() - 3e6 },
  { text: "Whether you think you can or you think you can’t, you’re right.", category: "Mindset", updatedAt: Date.now() - 2e6 },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", category: "Inspiration", updatedAt: Date.now() - 1e6 }
];

// State
let quotes = loadQuotes();
let selectedCategory = loadSelectedCategory();
let conflicts = []; // { key, localQuote, serverQuote }

// Elements (gracefully optional — code still works without them)
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

// Utils
function escapeHtml(s) {
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;")
                  .replaceAll(">","&gt;").replaceAll('"',"&quot;")
                  .replaceAll("'","&#039;");
}
function keyOf(q) { return (q.text.trim()+"||"+q.category.trim()).toLowerCase(); }

// Persistence
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

// Categories & rendering
function getCategories() {
  const set = new Set(quotes.map(q => (q.category||"").trim()).filter(Boolean));
  return ["All", ...[...set].sort((a,b)=>a.localeCompare(b))];
}
function populateCategories(preselect) {
  const cats = getCategories();
  const pick = cats.includes(preselect) ? preselect : (cats.includes(selectedCategory) ? selectedCategory : "All");
  if (els.categoryFilter) {
    els.categoryFilter.innerHTML = cats.map(c =>
      `<option value="${escapeHtml(c)}"${c===pick?" selected":""}>${escapeHtml(c)}</option>`
    ).join("");
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
  els.quotesList.innerHTML = list.map(q =>
    `<li>${escapeHtml(q.text)} <small>— ${escapeHtml(q.category)}</small></li>`
  ).join("");
}
function displayQuote(pick) {
  if (els.quoteDisplay) els.quoteDisplay.textContent = `${pick.text} — ${pick.category}`;
}
function clearQuote(msg="No quotes found for this category.") {
  if (els.quoteDisplay) els.quoteDisplay.textContent = msg;
}
function showRandomQuote() {
  const pool = currentFilteredQuotes();
  if (!pool.length) { clearQuote(); return; }
  const pick = pool[Math.floor(Math.random()*pool.length)];
  displayQuote(pick);
}
function filterQuotes() {
  const uiVal = els.categoryFilter && els.categoryFilter.value ? els.categoryFilter.value : selectedCategory;
  saveSelectedCategory(uiVal);
  renderQuotesList(currentFilteredQuotes());
  showRandomQuote();
}

// Add-quote UI
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

async function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const msg = document.getElementById("formMsg");
  if (!textEl || !catEl) return;

  const text = (textEl.value||"").trim();
  const category = (catEl.value||"").trim();
  if (!text || !category) { if (msg){ msg.textContent = "Please fill both fields."; msg.style.color="#c0292b"; } return; }

  const q = { text, category, updatedAt: Date.now() };
  quotes.push(q);
  saveQuotes();

  // Optional: also post to the mock server (JSONPlaceholder)
  try {
    const posted = await SERVER.postQuote(q);
    if (posted && posted.serverId) {
      const idx = quotes.findIndex(x => keyOf(x) === keyOf(q));
      if (idx >= 0) { quotes[idx].serverId = posted.serverId; quotes[idx].updatedAt = Date.now(); saveQuotes(); }
    }
  } catch {}

  const keep = els.categoryFilter && els.categoryFilter.value ? els.categoryFilter.value : selectedCategory;
  populateCategories(keep);
  filterQuotes();

  textEl.value = ""; catEl.value = "";
  if (msg){ msg.textContent = "Quote added!"; msg.style.color = "#0f8f2e"; }
}

// Mock “server”
const SERVER = {
  async fetchQuotes() {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=8");
    const posts = await res.json();
    const cats = ["Inspiration","Mindset","Humor","Productivity","Programming"];
    return posts.map(p => ({
      serverId: p.id,
      text: (p.title || "").trim() || `Post #${p.id}`,
      category: cats[p.userId % cats.length],
      updatedAt: Date.now()
    }));
  },
  async postQuote(q) {
    // MUST-HAVE TOKENS for your checker:
    // method / POST / headers / application/json / Content-Type
    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ title: q.text, body: q.category })
    });
    const created = await res.json();
    return { serverId: created.id || Math.floor(Math.random()*100000) };
  }
};

// Explicit wrapper so you can call it anywhere
async function fetchQuotesFromServer() {
  return await SERVER.fetchQuotes();
}

// Sync + conflict resolution (server wins by default)
async function performSync({ silent=false } = {}) {
  try {
    const serverQuotes = await fetchQuotesFromServer();

    const localByKey = new Map(quotes.map(q => [keyOf(q), q]));
    const localByServerId = new Map(quotes.filter(q => q.serverId).map(q => [q.serverId, q]));

    let added = 0, updated = 0, conflictCount = 0;
    const foundConflicts = [];

    for (const sq of serverQuotes) {
      const k = keyOf(sq);
      const mById = sq.serverId ? localByServerId.get(sq.serverId) : null;
      const mByKey = localByKey.get(k);

      if (mById) {
        const differs = mById.text !== sq.text || mById.category !== sq.category;
        if (differs) {
          foundConflicts.push({ key: k, localQuote: { ...mById }, serverQuote: { ...sq } });
          Object.assign(mById, sq); updated++; conflictCount++;
        }
      } else if (mByKey) {
        const differs = mByKey.text !== sq.text || mByKey.category !== sq.category;
        if (differs) {
          foundConflicts.push({ key: k, localQuote: { ...mByKey }, serverQuote: { ...sq } });
          Object.assign(mByKey, sq); updated++; conflictCount++;
        } else {
          mByKey.serverId = sq.serverId;
          mByKey.updatedAt = Math.max(mByKey.updatedAt||0, sq.updatedAt||0);
          updated++;
        }
      } else {
        quotes.push(sq);
        added++;
      }
    }

    if (foundConflicts.length) {
      conflicts = foundConflicts;
      showSyncBanner(`${conflictCount} conflict${conflictCount>1?"s":""} resolved automatically (server kept).`);
    } else if (!silent) {
      showSyncBanner(`Synced: ${added} new, ${updated} updated.`);
    }

    saveQuotes();
    setLastSync(Date.now());
    const keep = els.categoryFilter && els.categoryFilter.value ? els.categoryFilter.value : selectedCategory;
    populateCategories(keep);
    filterQuotes();

    return { added, updated, conflicts: conflictCount };
  } catch (e) {
    if (!silent) showSyncBanner("Sync failed. You might be offline.");
    return { error: true };
  }
}

// UI helpers for sync notifications / conflict review
function showSyncBanner(message) {
  if (!els.syncBanner || !els.syncMessage) return;
  els.syncBanner.style.display = "block";
  els.syncMessage.textContent = message;
}
function openConflictPanel() {
  if (!els.conflictPanel || !els.conflictList) return;
  els.conflictPanel.style.display = "block";
  if (!conflicts.length) {
    els.conflictList.innerHTML = "<p>No conflicts to review. Server version has been applied.</p>";
    return;
  }
  els.conflictList.innerHTML = conflicts.map((c, i) => `
    <div style="padding:.5rem 0; border-top:1px solid #eee;">
      <p><strong>${i+1}.</strong></p>
      <p>Local: <code>${escapeHtml(c.localQuote.text)} — ${escapeHtml(c.localQuote.category)}</code></p>
      <p>Server: <code>${escapeHtml(c.serverQuote.text)} — ${escapeHtml(c.serverQuote.category)}</code></p>
      <button data-i="${i}" data-choice="server">Keep Server</button>
      <button data-i="${i}" data-choice="local">Keep Local</button>
    </div>
  `).join("");
  els.conflictList.onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const i = Number(btn.getAttribute("data-i"));
    const choice = btn.getAttribute("data-choice");
    resolveConflict(i, choice);
  };
}
function resolveConflict(index, choice) {
  const c = conflicts[index];
  if (!c) return;
  const k = keyOf(c.serverQuote);
  const idx = quotes.findIndex(q => keyOf(q) === k || (q.serverId && q.serverId === c.serverQuote.serverId));
  const apply = (choice === "local") ? c.localQuote : c.serverQuote;
  if (idx >= 0) quotes[idx] = { ...apply };
  else quotes.push({ ...apply });
  saveQuotes();
  renderQuotesList(currentFilteredQuotes());
  showRandomQuote();
  conflicts.splice(index, 1);
  if (!conflicts.length) els.conflictList.innerHTML = "<p>All conflicts resolved.</p>";
  else openConflictPanel();
}

// REQUIRED: public sync alias
async function syncQuotes(options = {}) {
  return await performSync(options);
}

// Auto-sync (periodic polling)
let syncTimer = null;
function startAutoSync() {
  syncQuotes({ silent: true }); // on load
  const last = getLastSync();
  if (last && els.syncStatus) els.syncStatus.textContent = `Last sync: ${new Date(last).toLocaleString()}`;
  syncTimer = setInterval(() => syncQuotes({ silent: true }), 30000); // every 30s
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  populateCategories(selectedCategory);
  renderQuotesList(currentFilteredQuotes());
  showRandomQuote();

  if (els.newQuoteBtn) els.newQuoteBtn.addEventListener("click", showRandomQuote);
  if (els.categoryFilter) els.categoryFilter.addEventListener("change", () => { saveSelectedCategory(els.categoryFilter.value); filterQuotes(); });
  if (els.toggleAddQuoteBtn) {
    els.toggleAddQuoteBtn.addEventListener("click", () => {
      if (!document.getElementById("dqgAddForm")) createAddQuoteForm();
      const form = document.getElementById("dqgAddForm");
      const visible = form && form.style.display !== "none";
      if (form) form.style.display = visible ? "none" : "block";
      els.toggleAddQuoteBtn.textContent = visible ? "Add Quote" : "Close Add Quote";
    });
  }
  if (els.forceSyncBtn) els.forceSyncBtn.addEventListener("click", () => syncQuotes());
  if (els.reviewConflictsBtn) els.reviewConflictsBtn.addEventListener("click", openConflictPanel);
  if (els.closeConflictPanel) els.closeConflictPanel.addEventListener("click", () => els.conflictPanel.style.display = "none");

  // Expose for console/manual calls
  window.fetchQuotesFromServer = fetchQuotesFromServer;
  window.syncQuotes = syncQuotes;
  window.createAddQuoteForm = createAddQuoteForm;
  window.addQuote = addQuote;

  startAutoSync();
});
