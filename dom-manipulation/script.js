// -------- Data & Persistence --------
const DEFAULT_QUOTES = [
  { text: "The only way to do great work is to love what you do.", category: "Inspiration" },
  { text: "Simplicity is the soul of efficiency.", category: "Productivity" },
  { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming" },
  { text: "Whether you think you can or you think you can’t, you’re right.", category: "Mindset" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", category: "Inspiration" }
];

const STORAGE_KEY = "dqg_quotes_v1";

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

let quotes = loadQuotes();

// -------- DOM Helpers --------
const els = {
  categoryFilter: document.getElementById("categoryFilter"),
  quoteText: document.getElementById("quoteText"),
  quoteCategory: document.getElementById("quoteCategory"),
  newQuoteBtn: document.getElementById("newQuote"),
  toggleAddQuoteBtn: document.getElementById("toggleAddQuote"),
  addQuoteContainer: document.getElementById("addQuoteContainer"),
};

// Build a unique, sorted list of categories (+ All)
function getCategories() {
  const set = new Set(quotes.map(q => q.category.trim()).filter(Boolean));
  return ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
}

function populateCategories(selected = "All") {
  const opts = getCategories()
    .map(cat => `<option value="${escapeHtml(cat)}"${cat === selected ? " selected" : ""}>${escapeHtml(cat)}</option>`)
    .join("");
  els.categoryFilter.innerHTML = opts;
}

// Simple HTML escaper to prevent accidental injection via user input
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// -------- Core Features --------
function filteredQuotesBySelectedCategory() {
  const selected = els.categoryFilter.value || "All";
  if (selected === "All") return quotes;
  return quotes.filter(q => q.category.trim().toLowerCase() === selected.trim().toLowerCase());
}

// Required function: showRandomQuote
function showRandomQuote() {
  const pool = filteredQuotesBySelectedCategory();
  if (!pool.length) {
    els.quoteText.textContent = "No quotes found for this category yet.";
    els.quoteCategory.textContent = "";
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  els.quoteText.textContent = pick.text;
  els.quoteCategory.textContent = `# ${pick.category}`;
}

// Required function: createAddQuoteForm
function createAddQuoteForm() {
  if (document.getElementById("dqgAddForm")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "dqgAddForm";

  wrapper.innerHTML = `
    <h2>Add a Quote</h2>
    <div class="row" style="align-items:flex-start;">
      <div style="flex:1; min-width:240px;">
        <label class="muted" for="newQuoteText">Quote</label>
        <input id="newQuoteText" type="text" placeholder="Enter a new quote" style="width:100%; margin-top:.4rem;" />
        <div class="hint">Example: “Stay hungry, stay foolish.”</div>
      </div>
      <div style="flex:1; min-width:200px;">
        <label class="muted" for="newQuoteCategory">Category</label>
        <input id="newQuoteCategory" type="text" placeholder="Enter quote category" style="width:100%; margin-top:.4rem;" />
        <div class="hint">New or existing category (e.g., Inspiration)</div>
      </div>
    </div>
    <div class="row">
      <button id="submitNewQuote">Add Quote</button>
      <span id="formMsg" class="muted" role="status" aria-live="polite"></span>
    </div>
  `;

  els.addQuoteContainer.appendChild(wrapper);

  // Wire up submit button
  document.getElementById("submitNewQuote").addEventListener("click", () => addQuote());
}

// Compatibility: if user includes your provided inline snippet, this global function will handle it.
function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const catInput = document.getElementById("newQuoteCategory");
  const msgEl = document.getElementById("formMsg");

  if (!textInput || !catInput) {
    alert("Add form not found. Click 'Add Quote' to open the form first.");
    return;
  }

  const text = (textInput.value || "").trim();
  const category = (catInput.value || "").trim();

  if (!text || !category) {
    if (msgEl) {
      msgEl.textContent = "Please provide both a quote and a category.";
      msgEl.className = "error";
    }
    return;
  }

  quotes.push({ text, category });
  saveQuotes();

  // Refresh categories, keep current selection if sensible
  const wasSelected = els.categoryFilter.value || "All";
  populateCategories(wasSelected);

  // Provide feedback and clear inputs
  if (msgEl) {
    msgEl.textContent = "Quote added!";
    msgEl.className = "success";
  }
  textInput.value = "";
  catInput.value = "";


  els.categoryFilter.value = "All";
  showRandomQuote();
}

// -------- Event Wiring --------
document.addEventListener("DOMContentLoaded", () => {
  populateCategories("All");
  showRandomQuote();

  els.newQuoteBtn.addEventListener("click", showRandomQuote);
  els.categoryFilter.addEventListener("change", showRandomQuote);

  // Toggle the add-quote form visibility (create on first open)
  let addOpen = false;
  els.toggleAddQuoteBtn.addEventListener("click", () => {
    if (!document.getElementById("dqgAddForm")) createAddQuoteForm();
    addOpen = !addOpen;
    document.getElementById("dqgAddForm").style.display = addOpen ? "block" : "none";
    els.toggleAddQuoteBtn.textContent = addOpen ? "Close Add Quote" : "Add Quote";
  });
});
