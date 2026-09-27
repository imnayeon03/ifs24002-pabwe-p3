/**
 * Latihan JavaScript — Praktikum 3
 * Fitur: Tab switcher, Todo (CRUD + localStorage), Magic Number, Password Checker
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

/* ========== TAB SWITCHER ========== */

const TAB_STORAGE_KEY = "pabwe-p3-active-tab";
const tabButtons = $all(".tab-btn");
const panels = {
  todo: $("#panel-todo"),
  magic: $("#panel-magic"),
  password: $("#panel-password"),
};

/** Ganti tab aktif: sembunyikan panel lain, highlight tombol, ingat di localStorage */
function switchTab(name) {
  if (!panels[name]) name = "todo";

  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== name);
  });

  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.setAttribute("aria-selected", String(active));
    btn.classList.toggle("bg-sky-600", active);
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

// Pulihkan tab terakhir yang dibuka (default: todo)
const savedTab = localStorage.getItem(TAB_STORAGE_KEY) || "todo";
switchTab(savedTab);

/* ========== TODO LIST ========== */

const TODO_STORAGE_KEY = "pabwe-p3-todos";
const STATUS_ORDER = ["Todo", "Progress", "Done", "Cancel"];

/** Warna badge status */
const STATUS_STYLE = {
  Todo: "bg-sky-100 text-sky-800",
  Progress: "bg-amber-100 text-amber-800",
  Done: "bg-emerald-100 text-emerald-800",
  Cancel: "bg-rose-100 text-rose-800",
};

let todos = loadTodos();
let editingId = null; // id todo yang sedang diubah di modal
let deletingId = null; // id todo yang akan dihapus di modal

const todoForm = $("#todo-form");
const todoTitle = $("#todo-title");
const todoStatus = $("#todo-status");
const todoSearch = $("#todo-search");
const todoSort = $("#todo-sort");
const todoList = $("#todo-list");
const todoEmpty = $("#todo-empty");

const modalEdit = $("#modal-edit");
const modalDelete = $("#modal-delete");
const editForm = $("#edit-form");
const editTitle = $("#edit-title");
const editStatus = $("#edit-status");
const deleteTodoTitle = $("#delete-todo-title");
const deleteConfirm = $("#delete-confirm");

/** Baca data dari localStorage */
function loadTodos() {
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Simpan data ke localStorage */
function saveTodos() {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}

/** Filter + sort daftar, lalu render ke DOM */
function renderTodos() {
  const query = todoSearch.value.trim().toLowerCase();
  const sort = todoSort.value;

  let items = todos.filter((t) => t.title.toLowerCase().includes(query));

  items = [...items].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.createdAt - b.createdAt;
      case "title-asc":
        return a.title.localeCompare(b.title, "id");
      case "title-desc":
        return b.title.localeCompare(a.title, "id");
      case "status":
        return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  // Alert jika belum ada todo sama sekali
  const noTodos = todos.length === 0;
  todoEmpty.classList.toggle("hidden", !noTodos);
  todoList.classList.toggle("hidden", noTodos);

  if (noTodos) {
    todoList.innerHTML = "";
    return;
  }

  // Kosongkan lalu bangun ulang lewat DOM
  todoList.innerHTML = "";

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className =
      "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600";
    li.textContent = "Tidak ada todo yang cocok dengan pencarian.";
    todoList.appendChild(li);
    return;
  }

  items.forEach((todo) => {
    const li = document.createElement("li");
    li.className =
      "flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 px-4 py-3";
    li.dataset.id = todo.id;

    const info = document.createElement("div");
    info.className = "flex-1 min-w-0";

    const titleEl = document.createElement("p");
    titleEl.className = "font-medium text-slate-900 truncate";
    titleEl.textContent = todo.title;

    const badge = document.createElement("span");
    badge.className = `inline-flex mt-1 text-xs font-semibold px-2 py-0.5 rounded-md ${STATUS_STYLE[todo.status] || ""}`;
    badge.textContent = todo.status;

    info.append(titleEl, badge);

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-1.5 shrink-0";

    // Tombol ubah → buka modal edit
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
    editBtn.innerHTML = '<i class="ti ti-pencil"></i> Ubah';
    editBtn.addEventListener("click", () => openEditModal(todo.id));

    // Tombol hapus → buka modal konfirmasi
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50";
    deleteBtn.innerHTML = '<i class="ti ti-trash"></i> Hapus';
    deleteBtn.addEventListener("click", () => openDeleteModal(todo.id));

    actions.append(editBtn, deleteBtn);
    li.append(info, actions);
    todoList.appendChild(li);
  });
}

/** Tampilkan / sembunyikan modal (pakai flex agar center) */
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

/** Buka modal ubah: isi field dengan data todo */
function openEditModal(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  editingId = id;
  editTitle.value = todo.title;
  editStatus.value = todo.status;
  openModal(modalEdit);
  editTitle.focus();
}

/** Buka modal hapus: tampilkan judul todo yang akan dihapus */
function openDeleteModal(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  deletingId = id;
  deleteTodoTitle.textContent = `"${todo.title}"`;
  openModal(modalDelete);
}

/** Tutup modal ubah */
function closeEditModal() {
  editingId = null;
  editForm.reset();
  closeModal(modalEdit);
}

/** Tutup modal hapus */
function closeDeleteModal() {
  deletingId = null;
  closeModal(modalDelete);
}

// Tutup lewat tombol Batal / X / klik backdrop
$all("[data-close-modal='edit']").forEach((btn) => {
  btn.addEventListener("click", closeEditModal);
});
$all("[data-close-modal='delete']").forEach((btn) => {
  btn.addEventListener("click", closeDeleteModal);
});
modalEdit.querySelector(".modal-backdrop").addEventListener("click", closeEditModal);
modalDelete.querySelector(".modal-backdrop").addEventListener("click", closeDeleteModal);

// Escape menutup modal yang terbuka
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!modalEdit.classList.contains("hidden")) closeEditModal();
  if (!modalDelete.classList.contains("hidden")) closeDeleteModal();
});

/** Simpan perubahan dari modal edit */
editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = editTitle.value.trim();
  if (!title || !editingId) return;

  const todo = todos.find((t) => t.id === editingId);
  if (todo) {
    todo.title = title;
    todo.status = editStatus.value;
    saveTodos();
    renderTodos();
  }

  closeEditModal();
});

/** Konfirmasi hapus dari modal */
deleteConfirm.addEventListener("click", () => {
  if (!deletingId) return;

  todos = todos.filter((t) => t.id !== deletingId);
  saveTodos();
  renderTodos();
  closeDeleteModal();
});

/** Form utama: hanya untuk menambah todo baru */
todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = todoTitle.value.trim();
  const status = todoStatus.value;
  if (!title) return;

  todos.push({
    id: crypto.randomUUID(),
    title,
    status,
    createdAt: Date.now(),
  });

  saveTodos();
  todoForm.reset();
  todoStatus.value = "Todo";
  renderTodos();
});

todoSearch.addEventListener("input", renderTodos);
todoSort.addEventListener("change", renderTodos);

renderTodos();

/* ========== MAGIC NUMBER ========== */

const MAGIC_TOP_KEY = "pabwe-p3-magic-top";

let secretNumber = 0;
let attempts = 0;
let gameOver = false;

const magicForm = $("#magic-form");
const magicGuess = $("#magic-guess");
const magicAttempts = $("#magic-attempts");
const magicTopScore = $("#magic-top-score");
const magicFeedback = $("#magic-feedback");
const magicReset = $("#magic-reset");

/** Ambil top score (jumlah tebakan terbaik = terkecil) */
function getTopScore() {
  const v = localStorage.getItem(MAGIC_TOP_KEY);
  return v ? Number(v) : null;
}

function showTopScore() {
  const top = getTopScore();
  magicTopScore.textContent = top === null ? "—" : `${top} tebakan`;
}

/** Tampilkan pesan feedback ke pemain */
function setMagicFeedback(message, type = "info") {
  const styles = {
    info: "border-slate-200 bg-slate-50 text-slate-700",
    high: "border-orange-200 bg-orange-50 text-orange-900",
    low: "border-sky-200 bg-sky-50 text-sky-900",
    win: "border-lime-200 bg-lime-50 text-lime-900",
  };
  const icons = {
    info: "ti-info-circle",
    high: "ti-arrow-up",
    low: "ti-arrow-down",
    win: "ti-trophy",
  };

  magicFeedback.className = `rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${styles[type]}`;
  magicFeedback.innerHTML = `<i class="ti ${icons[type]} text-lg mt-0.5 shrink-0"></i><span>${message}</span>`;
}

/** Mulai / restart: acak angka 1–1000 */
function startMagicGame() {
  secretNumber = Math.floor(Math.random() * 1000) + 1;
  attempts = 0;
  gameOver = false;
  magicAttempts.textContent = "0";
  magicGuess.value = "";
  magicGuess.disabled = false;
  setMagicFeedback("Silakan mulai menebak!", "info");
  showTopScore();
  // console.log("Secret:", secretNumber); // buka untuk debugging
}

/** Cek apakah input tebakan adalah bilangan bulat (bukan desimal / teks) */
function isWholeNumberInput(value) {
  const raw = String(value).trim();
  // Hanya digit 0–9 (tolak 1.5, 1e2, 01.0, spasi di tengah, dll.)
  if (!/^\d+$/.test(raw)) return false;
  const n = Number(raw);
  return Number.isInteger(n);
}

magicForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (gameOver) return;

  const raw = magicGuess.value.trim();

  // Pastikan tebakan benar-benar bilangan bulat
  if (!isWholeNumberInput(raw)) {
    setMagicFeedback("Tebakan harus bilangan bulat (contoh: 42), bukan desimal.", "info");
    magicGuess.focus();
    return;
  }

  const guess = Number(raw);
  if (guess < 1 || guess > 1000) {
    setMagicFeedback("Masukkan bilangan bulat antara 1 sampai 1000.", "info");
    magicGuess.focus();
    return;
  }

  attempts += 1;
  magicAttempts.textContent = String(attempts);

  if (guess > secretNumber) {
    // Tebakan lebih besar dari angka rahasia
    setMagicFeedback(`Tebakan ${guess} terlalu besar. Coba angka lebih kecil.`, "high");
  } else if (guess < secretNumber) {
    // Tebakan lebih kecil dari angka rahasia
    setMagicFeedback(`Tebakan ${guess} terlalu kecil. Coba angka lebih besar.`, "low");
  } else {
    // Benar!
    gameOver = true;
    magicGuess.disabled = true;

    const top = getTopScore();
    let msg = `Benar! Angkanya ${secretNumber}. Kamu butuh ${attempts} tebakan.`;

    // Update top score jika lebih baik (lebih sedikit tebakan)
    if (top === null || attempts < top) {
      localStorage.setItem(MAGIC_TOP_KEY, String(attempts));
      showTopScore();
      msg += " Rekor baru!";
    }

    setMagicFeedback(msg, "win");
  }

  magicGuess.value = "";
  magicGuess.focus();
});

magicReset.addEventListener("click", startMagicGame);
startMagicGame();

/* ========== PASSWORD CHECKER ========== */
/* Penilaian mengikuti praktik modern (NIST/OWASP-inspired):
 * panjang lebih penting dari sekadar komposisi; password umum & pola lemah dihukum. */

const passwordInput = $("#password-input");
const passwordToggle = $("#password-toggle");
const strengthBar = $("#password-strength-bar");
const strengthLabel = $("#password-strength-label");
const strengthHint = $("#password-strength-hint");

/** Password yang sering bocor / mudah ditebak (contoh edukatif) */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "123456", "12345678", "123456789",
  "1234567890", "qwerty", "qwerty123", "abc123", "admin", "admin123",
  "welcome", "welcome1", "iloveyou", "letmein", "monkey", "dragon",
  "master", "login", "passw0rd", "p@ssw0rd", "p@ssword", "changeme",
  "indonesia", "jakarta", "sayang", "rahasia", "password!",
]);

const SEQUENCES = [
  "0123456789",
  "abcdefghijklmnopqrstuvwxyz",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

/** Kriteria checklist UI */
const passwordRules = {
  length: (pw) => pw.length >= 12, // rekomendasi modern (OWASP sering ≥12)
  upper: (pw) => /[A-Z]/.test(pw),
  lower: (pw) => /[a-z]/.test(pw),
  number: (pw) => /[0-9]/.test(pw),
  special: (pw) => /[^A-Za-z0-9]/.test(pw), // sembarang non-alfanumerik
  noCommon: (pw) => pw.length > 0 && !hasWeakPattern(pw),
};

const STRENGTH_META = [
  { label: "Belum diisi", bar: "w-0 bg-slate-300", text: "text-slate-500", hint: "" },
  {
    label: "Sangat lemah",
    bar: "w-1/5 bg-rose-500",
    text: "text-rose-600",
    hint: "Mudah ditebak atau terlalu pendek. Hindari password umum.",
  },
  {
    label: "Lemah",
    bar: "w-2/5 bg-orange-500",
    text: "text-orange-600",
    hint: "Masih rentan. Perpanjang dan hindari pola berurutan.",
  },
  {
    label: "Cukup",
    bar: "w-3/5 bg-amber-500",
    text: "text-amber-600",
    hint: "Layak untuk akun biasa, tapi masih bisa diperkuat.",
  },
  {
    label: "Kuat",
    bar: "w-4/5 bg-lime-500",
    text: "text-lime-700",
    hint: "Sudah baik: panjang dan beragam karakter.",
  },
  {
    label: "Sangat kuat",
    bar: "w-full bg-emerald-500",
    text: "text-emerald-700",
    hint: "Sesuai praktik modern untuk akun penting.",
  },
];

/** Deteksi urutan keyboard / alfabet / angka */
function hasSequence(pw) {
  const lower = pw.toLowerCase();
  for (const seq of SEQUENCES) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const chunk = seq.slice(i, i + 4);
      const rev = [...chunk].reverse().join("");
      if (lower.includes(chunk) || lower.includes(rev)) return true;
    }
  }
  return false;
}

/** Karakter sama berulang ≥3 kali (aaa, 111) */
function hasRepeatedChars(pw) {
  return /(.)\1{2,}/.test(pw);
}

/** Password umum atau pola lemah */
function hasWeakPattern(pw) {
  const lower = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;
  // Variasi sederhana: password123!, qwerty!
  for (const common of COMMON_PASSWORDS) {
    if (lower.includes(common) && common.length >= 5) return true;
  }
  if (hasSequence(pw) || hasRepeatedChars(pw)) return true;
  return false;
}

/** Estimasi ukuran charset (untung diversity / entropi kasar) */
function charsetSize(pw) {
  let size = 0;
  if (/[a-z]/.test(pw)) size += 26;
  if (/[A-Z]/.test(pw)) size += 26;
  if (/[0-9]/.test(pw)) size += 10;
  if (/[^A-Za-z0-9]/.test(pw)) size += 33; // perkiraan simbol umum
  return size;
}

/**
 * Skor kekuatan 0–5 (bukan sekadar jumlah centang).
 * Panjang & entropi diutamakan; pola lemah menurunkan skor.
 */
function scorePasswordStrength(pw) {
  if (!pw) return 0;

  const len = pw.length;
  const pool = charsetSize(pw);
  // Entropi kasar: log2(pool^length) ≈ length * log2(pool)
  const entropy = pool > 1 ? len * Math.log2(pool) : 0;

  let score = 1; // mulai dari sangat lemah jika ada isi

  // Panjang (faktor utama standar modern)
  if (len >= 8) score = 2;
  if (len >= 12) score = 3;
  if (len >= 16) score = 4;
  if (len >= 20) score = 5;

  // Bonus keragaman charset (minimal 3 kelas karakter)
  const classes =
    Number(/[a-z]/.test(pw)) +
    Number(/[A-Z]/.test(pw)) +
    Number(/[0-9]/.test(pw)) +
    Number(/[^A-Za-z0-9]/.test(pw));
  if (classes >= 3 && score < 5) score += 1;
  if (classes >= 4 && len >= 12 && score < 5) score += 1;

  // Naikkan/turunkan berdasarkan entropi
  if (entropy < 28) score = Math.min(score, 1);
  else if (entropy < 36) score = Math.min(score, 2);
  else if (entropy < 50) score = Math.min(score, 3);
  else if (entropy < 70) score = Math.min(score, 4);

  // Penalti keras untuk password umum / pola lemah
  if (hasWeakPattern(pw)) score = Math.min(score, 1);
  if (len < 8) score = Math.min(score, 1); // di bawah batas NIST minimum

  return Math.max(0, Math.min(5, score));
}

/** Update centang kriteria + progress bar kekuatan */
function checkPassword() {
  const pw = passwordInput.value;

  Object.entries(passwordRules).forEach(([rule, test]) => {
    const ok = test(pw);
    const item = document.querySelector(`.criterion[data-rule="${rule}"]`);
    if (!item) return;

    const icon = item.querySelector("i");
    item.classList.toggle("text-emerald-700", ok);
    item.classList.toggle("text-slate-500", !ok);
    icon.className = `ti ${ok ? "ti-circle-check-filled text-emerald-600" : "ti-circle"} text-base shrink-0`;
  });

  const score = scorePasswordStrength(pw);
  const meta = STRENGTH_META[score];

  strengthBar.className = `h-full rounded-full transition-all duration-300 ${meta.bar}`;
  strengthLabel.className = `font-semibold ${meta.text}`;
  strengthLabel.textContent = meta.label;
  strengthHint.textContent = meta.hint;
}

passwordInput.addEventListener("input", checkPassword);

/** Toggle tampil / sembunyikan password */
passwordToggle.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  passwordToggle.innerHTML = `<i class="ti ${show ? "ti-eye-off" : "ti-eye"} text-lg"></i>`;
  passwordToggle.setAttribute("aria-label", show ? "Sembunyikan password" : "Tampilkan password");
});

checkPassword();

