const DEFAULT_QUOTES = [
  { text: "The only way to do great work is to love what you do.", category: "Inspiration" },
  { text: "Simplicity is the soul of efficiency.", category: "Productivity" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming" },
  { text: "Whether you think you can or you think you can’t, you’re right.", category: "Mindset" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", category: "Inspiration" }
];

const STORAGE_KEY = "dqg_quotes_v1";
const LAST_QUOTE_KEY = "dqg_last_quote";
const LAST_CATEGORY_KEY = "dqg_last_category";

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

let quotes = loadQuotes();

const els = {
  categoryFilter: document.getElementById("categoryFilter"),
  quoteText: document.getElementById("quoteText"),
  quoteCategory: document.getElementById("quoteCategory"),
  newQuoteBtn: document.getElementById("newQuote"),
  toggleAddQuoteBtn: document.getElementById("toggleAddQuote"),
  addQuoteContainer: document.getElementById("addQuoteContainer"),
  exportBtn: document.getElementById("exportJson"),
};

function escapeHtml(str) {
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function getCategories() {
  const set = new Set(quotes.map(q => (q.category||"").trim()).filter(Boolean));
  return ["All", ...[...set].sort((a,b)=>a.localeCompare(b))];
}
function populateCategories(selected="All") {
  const opts = getCategories().map(c=>`<option value="${escapeHtml(c)}"${c===selected?" selected":""}>${escapeHtml(c)}</option>`).join("");
  els.categoryFilter.innerHTML = opts;
}
function filteredQuotes() {
  const sel = els.categoryFilter.value || "All";
  if (sel==="All") return quotes;
  return quotes.filter(q => (q.category||"").trim().toLowerCase() === sel.trim().toLowerCase());
}

function showRandomQuote() {
  const pool = filteredQuotes();
  if (!pool.length) {
    els.quoteText.textContent = "No quotes found for this category yet.";
    els.quoteCategory.textContent = "";
    sessionStorage.removeItem(LAST_QUOTE_KEY);
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  els.quoteText.textContent = pick.text;
  els.quoteCategory.textContent = `# ${pick.category}`;
  sessionStorage.setItem(LAST_QUOTE_KEY, JSON.stringify(pick));
}

function createAddQuoteForm() {
  if (document.getElementById("dqgAddForm")) return;
  const wrap = document.createElement("div");
  wrap.id = "dqgAddForm";
  wrap.innerHTML = `
    <h2>Add a Quote</h2>
    <div>
      <input id="newQuoteText" type="text" placeholder="Enter a new quote" />
      <input id="newQuoteCategory" type="text" placeholder="Enter quote category" />
      <button id="submitNewQuote">Add Quote</button>
      <span id="formMsg"></span>
    </div>
  `;
  els.addQuoteContainer.appendChild(wrap);
  document.getElementById("submitNewQuote").addEventListener("click", () => addQuote());
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const catInput = document.getElementById("newQuoteCategory");
  const msgEl = document.getElementById("formMsg");
  if (!textInput || !catInput) { alert("Open the Add Quote form first."); return; }
  const text = (textInput.value||"").trim();
  const category = (catInput.value||"").trim();
  if (!text || !category) { if (msgEl){ msgEl.textContent="Please provide both a quote and a category."; msgEl.style.color="#c0292b"; } return; }
  quotes.push({ text, category });
  saveQuotes();
  const keep = els.categoryFilter.value || "All";
  populateCategories(keep);
  if (msgEl){ msgEl.textContent="Quote added!"; msgEl.style.color="#0f8f2e"; }
  textInput.value=""; catInput.value="";
  showRandomQuote();
}

function exportToJson() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error("Invalid JSON format");
      const cleaned = data
        .filter(q => q && typeof q.text === "string" && typeof q.category === "string")
        .map(q => ({ text: q.text.trim(), category: q.category.trim() }))
        .filter(q => q.text && q.category);
      const existing = new Set(quotes.map(q => (q.text.trim()+"||"+q.category.trim()).toLowerCase()));
      const toAdd = cleaned.filter(q => {
        const key = (q.text+"||"+q.category).toLowerCase();
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
      if (!toAdd.length) { alert("No new quotes to import."); return; }
      quotes.push(...toAdd);
      saveQuotes();
      const sel = els.categoryFilter.value || "All";
      populateCategories(sel);
      alert("Quotes imported successfully!");
      showRandomQuote();
      event.target.value = "";
    } catch (err) {
      alert("Failed to import JSON. Please check the file format.");
    }
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  const lastCat = sessionStorage.getItem(LAST_CATEGORY_KEY) || "All";
  populateCategories(lastCat);
  els.categoryFilter.value = lastCat;
  const lastQuoteRaw = sessionStorage.getItem(LAST_QUOTE_KEY);
  if (lastQuoteRaw) {
    try {
      const q = JSON.parse(lastQuoteRaw);
      if (q && q.text && q.category) {
        els.quoteText.textContent = q.text;
        els.quoteCategory.textContent = `# ${q.category}`;
      } else { showRandomQuote(); }
    } catch { showRandomQuote(); }
  } else {
    showRandomQuote();
  }

  els.newQuoteBtn.addEventListener("click", showRandomQuote);
  els.categoryFilter.addEventListener("change", () => {
    sessionStorage.setItem(LAST_CATEGORY_KEY, els.categoryFilter.value || "All");
    showRandomQuote();
  });

  let open = false;
  els.toggleAddQuoteBtn.addEventListener("click", () => {
    if (!document.getElementById("dqgAddForm")) createAddQuoteForm();
    open = !open;
    document.getElementById("dqgAddForm").style.display = open ? "block" : "none";
    els.toggleAddQuoteBtn.textContent = open ? "Close Add Quote" : "Add Quote";
  });

  els.exportBtn.addEventListener("click", exportToJson);

  window.importFromJsonFile = importFromJsonFile;
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;
  window.addQuote = addQuote;
});
