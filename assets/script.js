/**
 * Sakuku — Praktikum 3 PABWE
 * Fitur: Tab switcher, Catatan Pengeluaran (CRUD + localStorage),
 *        Bookmark Manager (CRUD + validasi URL + localStorage),
 *        Kuis Interaktif (state, skor, high score + localStorage)
 */

/* ========== UTILITAS ========== */

/** Ambil elemen; lempar error jika tidak ada (membantu debug DOM) */
function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Elemen tidak ditemukan: ${selector}`);
  return el;
}

function $all(selector) {
  return document.querySelectorAll(selector);
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

function formatTanggal(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/* ========== TAB SWITCHER ========== */

const TAB_STORAGE_KEY = "sakuku-p3-active-tab";
const tabButtons = $all(".tab-btn");
const panels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz"),
};

/** Ganti tab aktif: sembunyikan panel lain, highlight tombol, ingat di localStorage */
function switchTab(name) {
  if (!panels[name]) name = "expense";

  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== name);
  });

  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.setAttribute("aria-selected", String(active));
    btn.classList.toggle("bg-teal-700", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("shadow", active);
    btn.classList.toggle("text-slate-600", !active);
    btn.classList.toggle("hover:bg-slate-100", !active);
  });

  localStorage.setItem(TAB_STORAGE_KEY, name);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Pulihkan tab terakhir yang dibuka (default: expense)
const savedTab = localStorage.getItem(TAB_STORAGE_KEY) || "expense";
switchTab(savedTab);

/* ========== 3.1 CATATAN PENGELUARAN HARIAN (EXPENSE TRACKER) ========== */

const EXPENSE_STORAGE_KEY = "sakuku-p3-transaksi";
const EXPENSE_CATEGORIES = ["Makanan", "Transport", "Belanja", "Tagihan", "Hiburan", "Gaji", "Lainnya"];

let expenses = loadExpenses();
let editingExpenseId = null;
let deletingExpenseId = null;

const expForm = $("#expense-form");
const expTitle = $("#expense-title");
const expCategory = $("#expense-category");
const expAmount = $("#expense-amount");
const expType = $("#expense-type");
const expDate = $("#expense-date");
const expSearch = $("#expense-search");
const expFilterType = $("#expense-filter-type");
const expFilterCategory = $("#expense-filter-category");
const expSort = $("#expense-sort");
const expList = $("#expense-list");
const expEmpty = $("#expense-empty");
const expIncomeTotal = $("#expense-income-total");
const expOutcomeTotal = $("#expense-outcome-total");
const expBalance = $("#expense-balance");

const modalExpEdit = $("#modal-expense-edit");
const modalExpDelete = $("#modal-expense-delete");
const expEditForm = $("#expense-edit-form");
const expEditTitle = $("#expense-edit-title");
const expEditCategory = $("#expense-edit-category");
const expEditAmount = $("#expense-edit-amount");
const expEditType = $("#expense-edit-type");
const expEditDate = $("#expense-edit-date");
const expDeleteTitle = $("#expense-delete-title");
const expDeleteConfirm = $("#expense-delete-confirm");

function fillCategoryOptions(select) {
  select.innerHTML = EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
}
fillCategoryOptions(expCategory);
fillCategoryOptions(expEditCategory);
expFilterCategory.innerHTML =
  `<option value="">Semua kategori</option>` + EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
expDate.value = new Date().toISOString().slice(0, 10);

function loadExpenses() {
  try {
    const raw = localStorage.getItem(EXPENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
}

/** Hitung & tampilkan ringkasan total pemasukan, pengeluaran, saldo */
function renderExpenseSummary() {
  const income = expenses.filter((t) => t.type === "Pemasukan").reduce((sum, t) => sum + t.amount, 0);
  const outcome = expenses.filter((t) => t.type === "Pengeluaran").reduce((sum, t) => sum + t.amount, 0);
  expIncomeTotal.textContent = formatRupiah(income);
  expOutcomeTotal.textContent = formatRupiah(outcome);
  expBalance.textContent = formatRupiah(income - outcome);
}

/** Filter + sort + render daftar transaksi */
function renderExpenses() {
  const query = expSearch.value.trim().toLowerCase();
  const filterType = expFilterType.value;
  const filterCategory = expFilterCategory.value;
  const sort = expSort.value;

  let items = expenses.filter((t) => {
    const matchQuery = t.title.toLowerCase().includes(query);
    const matchType = !filterType || t.type === filterType;
    const matchCategory = !filterCategory || t.category === filterCategory;
    return matchQuery && matchType && matchCategory;
  });

  items = [...items].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.createdAt - b.createdAt;
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  renderExpenseSummary();

  const noData = expenses.length === 0;
  expEmpty.classList.toggle("hidden", !noData);
  expList.classList.toggle("hidden", noData);

  if (noData) {
    expList.innerHTML = "";
    return;
  }

  expList.innerHTML = "";

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600";
    li.textContent = "Tidak ada transaksi yang cocok dengan pencarian/filter.";
    expList.appendChild(li);
    return;
  }

  items.forEach((t) => {
    const li = document.createElement("li");
    li.className = "flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 px-4 py-3";
    li.dataset.id = t.id;

    const info = document.createElement("div");
    info.className = "flex-1 min-w-0";

    const titleEl = document.createElement("p");
    titleEl.className = "font-medium text-slate-900 truncate";
    titleEl.textContent = t.title;

    const metaEl = document.createElement("p");
    metaEl.className = "text-xs text-slate-500 mt-0.5";
    metaEl.textContent = `${t.category} • ${formatTanggal(t.date)}`;

    const badgeRow = document.createElement("div");
    badgeRow.className = "flex items-center gap-2 mt-1.5";

    const typeBadge = document.createElement("span");
    typeBadge.className = `inline-flex text-xs font-semibold px-2 py-0.5 rounded-md ${
      t.type === "Pemasukan" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
    }`;
    typeBadge.textContent = t.type;

    const amountEl = document.createElement("span");
    amountEl.className = `text-sm font-semibold ${t.type === "Pemasukan" ? "text-emerald-700" : "text-rose-700"}`;
    amountEl.textContent = `${t.type === "Pemasukan" ? "+" : "-"}${formatRupiah(t.amount)}`;

    badgeRow.append(typeBadge, amountEl);
    info.append(titleEl, metaEl, badgeRow);

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-1.5 shrink-0";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
    editBtn.innerHTML = '<i class="ti ti-pencil"></i> Ubah';
    editBtn.addEventListener("click", () => openExpenseEditModal(t.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50";
    deleteBtn.innerHTML = '<i class="ti ti-trash"></i> Hapus';
    deleteBtn.addEventListener("click", () => openExpenseDeleteModal(t.id));

    actions.append(editBtn, deleteBtn);
    li.append(info, actions);
    expList.appendChild(li);
  });
}

function openModal(modal) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

function openExpenseEditModal(id) {
  const t = expenses.find((x) => x.id === id);
  if (!t) return;
  editingExpenseId = id;
  expEditTitle.value = t.title;
  expEditCategory.value = t.category;
  expEditAmount.value = t.amount;
  expEditType.value = t.type;
  expEditDate.value = t.date;
  openModal(modalExpEdit);
  expEditTitle.focus();
}

function openExpenseDeleteModal(id) {
  const t = expenses.find((x) => x.id === id);
  if (!t) return;
  deletingExpenseId = id;
  expDeleteTitle.textContent = `"${t.title}"`;
  openModal(modalExpDelete);
}

function closeExpenseEditModal() {
  editingExpenseId = null;
  expEditForm.reset();
  closeModal(modalExpEdit);
}

function closeExpenseDeleteModal() {
  deletingExpenseId = null;
  closeModal(modalExpDelete);
}

$all("[data-close-modal='expense-edit']").forEach((btn) => btn.addEventListener("click", closeExpenseEditModal));
$all("[data-close-modal='expense-delete']").forEach((btn) => btn.addEventListener("click", closeExpenseDeleteModal));
modalExpEdit.querySelector(".modal-backdrop").addEventListener("click", closeExpenseEditModal);
modalExpDelete.querySelector(".modal-backdrop").addEventListener("click", closeExpenseDeleteModal);

expEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = expEditTitle.value.trim();
  const amount = Number(expEditAmount.value);
  if (!title || !editingExpenseId || !(amount > 0)) return;

  const t = expenses.find((x) => x.id === editingExpenseId);
  if (t) {
    t.title = title;
    t.category = expEditCategory.value;
    t.amount = amount;
    t.type = expEditType.value;
    t.date = expEditDate.value;
    saveExpenses();
    renderExpenses();
  }
  closeExpenseEditModal();
});

expDeleteConfirm.addEventListener("click", () => {
  if (!deletingExpenseId) return;
  expenses = expenses.filter((t) => t.id !== deletingExpenseId);
  saveExpenses();
  renderExpenses();
  closeExpenseDeleteModal();
});

expForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = expTitle.value.trim();
  const amount = Number(expAmount.value);

  if (!title) return;
  if (!(amount > 0)) {
    alert("Jumlah harus berupa angka lebih dari 0.");
    return;
  }

  expenses.push({
    id: uid(),
    title,
    category: expCategory.value,
    amount,
    type: expType.value,
    date: expDate.value || new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
  });

  saveExpenses();
  expForm.reset();
  expDate.value = new Date().toISOString().slice(0, 10);
  renderExpenses();
});

[expSearch, expFilterType, expFilterCategory, expSort].forEach((el) => {
  el.addEventListener("input", renderExpenses);
  el.addEventListener("change", renderExpenses);
});

renderExpenses();

/* ========== 3.2 BOOKMARK / LINK MANAGER ========== */

const BOOKMARK_STORAGE_KEY = "sakuku-p3-bookmark";

let bookmarks = loadBookmarks();
let editingBookmarkId = null;
let deletingBookmarkId = null;

const bmForm = $("#bookmark-form");
const bmTitle = $("#bookmark-title");
const bmUrl = $("#bookmark-url");
const bmCategory = $("#bookmark-category");
const bmNote = $("#bookmark-note");
const bmSearch = $("#bookmark-search");
const bmSort = $("#bookmark-sort");
const bmList = $("#bookmark-list");
const bmEmpty = $("#bookmark-empty");
const bmUrlError = $("#bookmark-url-error");

const modalBmEdit = $("#modal-bookmark-edit");
const modalBmDelete = $("#modal-bookmark-delete");
const bmEditForm = $("#bookmark-edit-form");
const bmEditTitle = $("#bookmark-edit-title");
const bmEditUrl = $("#bookmark-edit-url");
const bmEditCategory = $("#bookmark-edit-category");
const bmEditNote = $("#bookmark-edit-note");
const bmDeleteTitle = $("#bookmark-delete-title");
const bmDeleteConfirm = $("#bookmark-delete-confirm");

/** Validasi URL sederhana: wajib diawali http:// atau https:// */
function isValidUrl(value) {
  return /^https?:\/\/.+/i.test(value.trim());
}

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks() {
  localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
}

function renderBookmarks() {
  const query = bmSearch.value.trim().toLowerCase();
  const sort = bmSort.value;

  let items = bookmarks.filter((b) => {
    return (
      b.title.toLowerCase().includes(query) ||
      b.url.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query)
    );
  });

  items = [...items].sort((a, b) => {
    switch (sort) {
      case "title-asc":
        return a.title.localeCompare(b.title, "id");
      case "title-desc":
        return b.title.localeCompare(a.title, "id");
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  const noData = bookmarks.length === 0;
  bmEmpty.classList.toggle("hidden", !noData);
  bmList.classList.toggle("hidden", noData);

  if (noData) {
    bmList.innerHTML = "";
    return;
  }

  bmList.innerHTML = "";

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600";
    li.textContent = "Tidak ada bookmark yang cocok dengan pencarian.";
    bmList.appendChild(li);
    return;
  }

  items.forEach((b) => {
    const li = document.createElement("li");
    li.className = "flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 px-4 py-3";
    li.dataset.id = b.id;

    const info = document.createElement("div");
    info.className = "flex-1 min-w-0";

    const link = document.createElement("a");
    link.href = b.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "font-medium text-teal-700 hover:underline truncate block";
    link.textContent = b.title;

    const urlEl = document.createElement("p");
    urlEl.className = "text-xs text-slate-500 truncate";
    urlEl.textContent = b.url;

    const badge = document.createElement("span");
    badge.className = "inline-flex mt-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800";
    badge.textContent = b.category;

    info.append(link, urlEl, badge);
    if (b.note) {
      const noteEl = document.createElement("p");
      noteEl.className = "text-xs text-slate-500 mt-1";
      noteEl.textContent = b.note;
      info.append(noteEl);
    }

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-1.5 shrink-0";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
    editBtn.innerHTML = '<i class="ti ti-pencil"></i> Ubah';
    editBtn.addEventListener("click", () => openBookmarkEditModal(b.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50";
    deleteBtn.innerHTML = '<i class="ti ti-trash"></i> Hapus';
    deleteBtn.addEventListener("click", () => openBookmarkDeleteModal(b.id));

    actions.append(editBtn, deleteBtn);
    li.append(info, actions);
    bmList.appendChild(li);
  });
}

function openBookmarkEditModal(id) {
  const b = bookmarks.find((x) => x.id === id);
  if (!b) return;
  editingBookmarkId = id;
  bmEditTitle.value = b.title;
  bmEditUrl.value = b.url;
  bmEditCategory.value = b.category;
  bmEditNote.value = b.note || "";
  openModal(modalBmEdit);
  bmEditTitle.focus();
}

function openBookmarkDeleteModal(id) {
  const b = bookmarks.find((x) => x.id === id);
  if (!b) return;
  deletingBookmarkId = id;
  bmDeleteTitle.textContent = `"${b.title}"`;
  openModal(modalBmDelete);
}

function closeBookmarkEditModal() {
  editingBookmarkId = null;
  bmEditForm.reset();
  closeModal(modalBmEdit);
}

function closeBookmarkDeleteModal() {
  deletingBookmarkId = null;
  closeModal(modalBmDelete);
}

$all("[data-close-modal='bookmark-edit']").forEach((btn) => btn.addEventListener("click", closeBookmarkEditModal));
$all("[data-close-modal='bookmark-delete']").forEach((btn) => btn.addEventListener("click", closeBookmarkDeleteModal));
modalBmEdit.querySelector(".modal-backdrop").addEventListener("click", closeBookmarkEditModal);
modalBmDelete.querySelector(".modal-backdrop").addEventListener("click", closeBookmarkDeleteModal);

bmEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = bmEditTitle.value.trim();
  const url = bmEditUrl.value.trim();
  if (!title || !editingBookmarkId || !isValidUrl(url)) {
    alert("URL harus diawali http:// atau https://");
    return;
  }
  const b = bookmarks.find((x) => x.id === editingBookmarkId);
  if (b) {
    b.title = title;
    b.url = url;
    b.category = bmEditCategory.value.trim() || "Umum";
    b.note = bmEditNote.value.trim();
    saveBookmarks();
    renderBookmarks();
  }
  closeBookmarkEditModal();
});

bmDeleteConfirm.addEventListener("click", () => {
  if (!deletingBookmarkId) return;
  bookmarks = bookmarks.filter((b) => b.id !== deletingBookmarkId);
  saveBookmarks();
  renderBookmarks();
  closeBookmarkDeleteModal();
});

bmForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = bmTitle.value.trim();
  const url = bmUrl.value.trim();

  if (!title) return;
  if (!isValidUrl(url)) {
    bmUrlError.classList.remove("hidden");
    bmUrl.focus();
    return;
  }
  bmUrlError.classList.add("hidden");

  bookmarks.push({
    id: uid(),
    title,
    url,
    category: bmCategory.value.trim() || "Umum",
    note: bmNote.value.trim(),
    createdAt: Date.now(),
  });

  saveBookmarks();
  bmForm.reset();
  renderBookmarks();
});

bmUrl.addEventListener("input", () => bmUrlError.classList.add("hidden"));

[bmSearch, bmSort].forEach((el) => {
  el.addEventListener("input", renderBookmarks);
  el.addEventListener("change", renderBookmarks);
});

renderBookmarks();

/* ========== 3.3 KUIS INTERAKTIF (QUIZ APP) ========== */

const QUIZ_BEST_KEY = "sakuku-p3-quiz-best";

/** Data soal — array of object, topik: literasi digital & dasar web */
const QUIZ_QUESTIONS = [
  {
    question: "Apa kepanjangan dari HTML?",
    options: ["Hyper Trainer Marking Language", "HyperText Markup Language", "HighText Machine Language", "Hyper Text Modern Language"],
    answerIndex: 1,
  },
  {
    question: "Fungsi apa yang digunakan untuk menyimpan data ke localStorage?",
    options: ["localStorage.save()", "localStorage.put()", "localStorage.setItem()", "localStorage.store()"],
    answerIndex: 2,
  },
  {
    question: "Method array mana yang digunakan untuk menyaring data berdasarkan kondisi?",
    options: ["map()", "filter()", "reduce()", "forEach()"],
    answerIndex: 1,
  },
  {
    question: "Format data apa yang umum dipakai untuk menyimpan objek ke localStorage?",
    options: ["XML", "YAML", "JSON", "CSV"],
    answerIndex: 2,
  },
  {
    question: "Awalan mana yang wajib ada pada URL yang valid?",
    options: ["ftp:// atau www://", "http:// atau https://", "web:// atau site://", "link:// atau url://"],
    answerIndex: 1,
  },
  {
    question: "Apa fungsi utama CSS dalam sebuah halaman web?",
    options: ["Mengatur logika program", "Mengatur tampilan/gaya halaman", "Menyimpan data ke server", "Membuat query database"],
    answerIndex: 1,
  },
];

let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let quizFinished = false;

const quizStart = $("#quiz-start");
const quizPlay = $("#quiz-play");
const quizResult = $("#quiz-result");
const quizStartBtn = $("#quiz-start-btn");
const quizProgress = $("#quiz-progress");
const quizScoreLive = $("#quiz-score-live");
const quizQuestionEl = $("#quiz-question");
const quizOptionsEl = $("#quiz-options");
const quizNextBtn = $("#quiz-next-btn");
const quizFinalScore = $("#quiz-final-score");
const quizBestScore = $("#quiz-best-score");
const quizRestartBtn = $("#quiz-restart-btn");
const quizBestScoreHome = $("#quiz-best-score-home");

function getBestScore() {
  const v = localStorage.getItem(QUIZ_BEST_KEY);
  return v ? Number(v) : null;
}

function showBestScoreHome() {
  const best = getBestScore();
  quizBestScoreHome.textContent = best === null ? "Belum ada" : `${best} / ${QUIZ_QUESTIONS.length}`;
}
showBestScoreHome();

function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  quizFinished = false;
  quizStart.classList.add("hidden");
  quizResult.classList.add("hidden");
  quizPlay.classList.remove("hidden");
  renderQuizQuestion();
}

function renderQuizQuestion() {
  quizAnswered = false;
  const q = QUIZ_QUESTIONS[quizIndex];
  quizProgress.textContent = `Soal ${quizIndex + 1} / ${QUIZ_QUESTIONS.length}`;
  quizScoreLive.textContent = `Skor: ${quizScore}`;
  quizQuestionEl.textContent = q.question;
  quizNextBtn.classList.add("hidden");

  quizOptionsEl.innerHTML = "";
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "quiz-option w-full text-left rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectQuizAnswer(idx, btn));
    quizOptionsEl.appendChild(btn);
  });
}

function selectQuizAnswer(idx, btnEl) {
  if (quizAnswered) return;
  quizAnswered = true;

  const q = QUIZ_QUESTIONS[quizIndex];
  const correct = idx === q.answerIndex;
  if (correct) quizScore += 1;

  $all(".quiz-option").forEach((btn, i) => {
    btn.classList.remove("hover:bg-slate-50");
    if (i === q.answerIndex) {
      btn.classList.add("border-emerald-400", "bg-emerald-50", "text-emerald-800");
    } else if (i === idx) {
      btn.classList.add("border-rose-400", "bg-rose-50", "text-rose-800");
    }
  });

  quizScoreLive.textContent = `Skor: ${quizScore}`;
  quizNextBtn.classList.remove("hidden");
  quizNextBtn.textContent = quizIndex === QUIZ_QUESTIONS.length - 1 ? "Lihat Hasil" : "Soal Berikutnya";
}

quizNextBtn.addEventListener("click", () => {
  if (quizIndex < QUIZ_QUESTIONS.length - 1) {
    quizIndex += 1;
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  quizFinished = true;
  quizPlay.classList.add("hidden");
  quizResult.classList.remove("hidden");
  quizFinalScore.textContent = `${quizScore} / ${QUIZ_QUESTIONS.length}`;

  const best = getBestScore();
  if (best === null || quizScore > best) {
    localStorage.setItem(QUIZ_BEST_KEY, String(quizScore));
    quizBestScore.textContent = `Rekor baru! ${quizScore} / ${QUIZ_QUESTIONS.length}`;
  } else {
    quizBestScore.textContent = `Skor terbaik: ${best} / ${QUIZ_QUESTIONS.length}`;
  }
  showBestScoreHome();
}

quizStartBtn.addEventListener("click", startQuiz);
quizRestartBtn.addEventListener("click", startQuiz);

// Escape menutup modal manapun yang terbuka
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!modalExpEdit.classList.contains("hidden")) closeExpenseEditModal();
  if (!modalExpDelete.classList.contains("hidden")) closeExpenseDeleteModal();
  if (!modalBmEdit.classList.contains("hidden")) closeBookmarkEditModal();
  if (!modalBmDelete.classList.contains("hidden")) closeBookmarkDeleteModal();
});