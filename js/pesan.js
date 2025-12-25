// ======================================================
// pesan.js
// ------------------------------------------------------
// CORE ORDER FORM LOGIC — Dapur UNI
//
// TANGGUNG JAWAB UTAMA:
// - Manajemen state menu & cart
// - Sinkronisasi cart ⇄ UI ⇄ localStorage
// - Validasi form (strict)
// - Submit order ke Google Sheets
// - Generate WhatsApp message
//
// PERINGATAN:
// - File ini sangat sensitif terhadap perubahan.
// - Jangan mengubah logika / urutan eksekusi.
// ======================================================

/* ======================================================
 * GLOBAL STATE
 * ====================================================== */
const state = {
  menuMaster: [],
  cart: JSON.parse(localStorage.getItem("dapuruni_cart") || "[]"),
  menuReady: false,
};

/* ======================================================
 * DOM REFERENCES (diisi saat DOMContentLoaded)
 * ====================================================== */
let menuContainer,
  tambahMenuBtn,
  kirimBtn,
  setujuCheckbox,
  kotaSelect,
  kecamatanSelect,
  kelurahanSelect,
  tanggalInput,
  optDelivery,
  optPickup;

/* ======================================================
 * API — LOAD MENU MASTER
 * ====================================================== */
/**
 * Mengambil menu dari Google Sheets (Apps Script)
 * - Mengisi state.menuMaster
 * - Menormalisasi ID menu
 * - Menghidrasi row yang sudah ada
 * - Menyelaraskan cart lama
 */
async function loadMenuMaster() {
  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbz-iIQh_tN3QrLadGNm7sGIoyzF28dFgF__2zSJ35mWPqs613E7sZAXi6Vss9_-4TaJ0Q/exec?action=getMenu"
    );

    const json = await res.json();
    const menuArray = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
      ? json.data
      : [];

    state.menuMaster = menuArray.map((m) => ({
      ...m,
      id: String(m.id),
    }));

    state.menuReady = true;

    // Simpan cache dengan format objek (agar sinkron dengan menu-api.js)
    localStorage.setItem(
      "dapuruni_menu_cache",
      JSON.stringify({
        time: Date.now(),
        data: state.menuMaster,
      })
    );

    // PAKSA RE-RENDER SEMUA SELECT YANG SUDAH ADA DI UI
    document.querySelectorAll(".menu-nama").forEach((select) => {
      populateSelect(select);
    });

    // Isi ulang nilai id yang terpilih
    hydrateExistingRows();

    // Update total harga
    updateEstimasiUI();
  } catch (err) {
    console.error("Fetch menu gagal:", err);
  }
}

/* ======================================================
 * INPUT SANITIZER
 * ====================================================== */
function sanitizeText(str) {
  return String(str).replace(/\s+/g, " ").trim();
}

/* ======================================================
 * UTIL — RESOLVE MENU ID
 * ====================================================== */
/**
 * Digunakan untuk backward compatibility cart lama
 * (yang mungkin hanya menyimpan title / id berbeda)
 */
function resolveMenuIdFromItem(item) {
  if (item.menuId) return String(item.menuId);
  if (!item.title) return "";

  const found = state.menuMaster.find(
    (m) => m.title.trim() === String(item.title).trim()
  );

  return found ? String(found.id) : "";
}

/* ======================================================
 * CART NORMALIZATION
 * ====================================================== */
/**
 * Menyatukan format cart dari:
 * - modal lama
 * - cache localStorage
 * - data menu terbaru
 */
function normalizeCart(rawCart) {
  if (!Array.isArray(rawCart)) return [];

  const normalized = [];

  rawCart.forEach((item) => {
    const menuId = item.menuId || item.id || resolveMenuIdFromItem(item);
    if (!menuId) return;

    const menu = state.menuMaster.find((m) => m.id === String(menuId));
    if (!menu) return;

    const pax = Number(item.pax) || Number(item.qty) || menu.minPax;

    normalized.push({
      menuId: String(menu.id),
      title: menu.title,
      pax: Math.max(pax, menu.minPax),
      minPax: menu.minPax,
      price: menu.price,
    });
  });

  return normalized;
}

/* ======================================================
 * INIT — DOM READY
 * ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // DOM binding
  menuContainer = document.getElementById("menuContainer");
  tambahMenuBtn = document.getElementById("tambahMenu");
  kirimBtn = document.getElementById("kirimBtn");
  setujuCheckbox = document.getElementById("setuju");

  kotaSelect = document.getElementById("kota");
  kecamatanSelect = document.getElementById("kecamatan");
  kelurahanSelect = document.getElementById("kelurahan");
  tanggalInput = document.getElementById("tanggal");

  optDelivery = document.getElementById("optDelivery");
  optPickup = document.getElementById("optPickup");

  // clear error saat input
  document.getElementById("alamat").addEventListener("input", () => {
    clearError("alamatError");
  });
  document
    .getElementById("nama")
    .addEventListener("input", () => clearError("namaError"));
  document
    .getElementById("noWa")
    .addEventListener("input", () => clearError("waError"));
  tanggalInput.addEventListener("change", () => clearError("tanggalError"));
  setujuCheckbox.addEventListener("change", () => clearError("setujuError"));

  /* ----------------------------------
   * CACHE FIRST (menu)
   * ---------------------------------- */
  const cached = localStorage.getItem("dapuruni_menu_cache");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Cek apakah data di dalam properti .data atau array langsung
      const dataOnly = Array.isArray(parsed) ? parsed : parsed.data;

      if (Array.isArray(dataOnly)) {
        state.menuMaster = dataOnly.map((m) => ({
          ...m,
          id: String(m.id),
        }));
        state.menuReady = true;
      }
    } catch (e) {
      console.warn("Cache parsing failed");
    }
  }
  /* ----------------------------------
   * INITIAL CART SYNC
   * ---------------------------------- */
  state.cart = normalizeCart(state.cart);

  // Bersihkan container sebelum render ulang baris dari cart
  menuContainer.innerHTML = "";

  if (state.cart.length) {
    state.cart.forEach(addRowFromCart);
  } else {
    addEmptyRow();
  }

  // Update UI harga awal
  updateEstimasiUI();

  /* ----------------------------------
   * BACKGROUND FETCH MENU
   * ---------------------------------- */
  loadMenuMaster();

  /* ----------------------------------
   * EVENTS
   * ---------------------------------- */
  tambahMenuBtn.addEventListener("click", addEmptyRow);
  kirimBtn.addEventListener("click", submitOrder);

  setupToggle();
  setupTanggal();
  setupWilayah();

  updateEstimasiUI();
  updateDeliveryNote();
});

/* ======================================================
 * ROW MANAGEMENT
 * ====================================================== */
function addEmptyRow() {
  menuContainer.appendChild(createRow());
}

function addRowFromCart(item) {
  menuContainer.appendChild(createRow(item));
}

/**
 * Mengisi ulang select & input berdasarkan cart lama
 * Dipanggil setelah menu master siap
 */
function hydrateExistingRows() {
  document.querySelectorAll(".menu-item").forEach((row, idx) => {
    const select = row.querySelector(".menu-nama");
    const input = row.querySelector(".menu-jumlah");
    const item = state.cart[idx];
    if (!item) return;

    const resolvedId = resolveMenuIdFromItem(item);
    populateSelect(select);

    requestAnimationFrame(() => {
      select.value = resolvedId;
    });

    item.menuId = resolvedId;

    if (input && item.minPax) {
      input.min = item.minPax;
    }
  });

  persistCart();
}

/* ======================================================
 * CART PERSISTENCE & CALCULATION
 * ====================================================== */
function persistCart() {
  localStorage.setItem("dapuruni_cart", JSON.stringify(state.cart));
  updateEstimasiUI();
}

function hitungEstimasiHarga() {
  return state.cart.reduce((sum, m) => {
    const pax = Number(m.pax) || 0;
    const price = Number(m.price) || 0;
    return sum + pax * price;
  }, 0);
}

function formatRupiah(num) {
  return "Rp " + num.toLocaleString("id-ID");
}

/* ======================================================
 * ROW CREATION
 * ====================================================== */
function createRow(cartItem = null) {
  const row = document.createElement("div");
  row.className = "menu-item";

  const select = document.createElement("select");
  select.className = "menu-nama";
  populateSelect(select);

  const input = document.createElement("input");
  input.type = "number";
  input.className = "menu-jumlah";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "hapusMenu";
  btn.textContent = "✖";

  if (cartItem) {
    const resolvedId = resolveMenuIdFromItem(cartItem);

    requestAnimationFrame(() => {
      select.value = resolvedId;
    });

    cartItem.menuId = resolvedId;
    input.value = cartItem.pax || "";
    input.min = cartItem.minPax || 1;
  } else {
    input.placeholder = "Jumlah";
  }

  select.addEventListener("change", () =>
    onMenuChange(select, input, cartItem)
  );
  input.addEventListener("input", () => onPaxChange(select, input));
  btn.addEventListener("click", () => removeRow(row));

  row.append(select, input, btn);
  return row;
}

function populateSelect(select) {
  // Simpan nilai lama sebelum dikosongkan (agar tidak reset ke default)
  const oldValue = select.value;

  select.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = state.menuReady ? "Pilih Menu" : "Memuat menu...";
  select.appendChild(defaultOpt);

  if (state.menuReady) {
    state.menuMaster.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = String(m.id);
      opt.textContent = m.title;
      select.appendChild(opt);
    });
    // Kembalikan nilai yang dipilih sebelumnya jika ada
    if (oldValue) select.value = oldValue;
  }
}

/* ======================================================
 * STATE UPDATES (MENU & PAX)
 * ====================================================== */
function onMenuChange(select, input) {
  const menuId = String(select.value);
  if (!menuId) return;

  const menu = state.menuMaster.find((m) => m.id === menuId);
  if (!menu) return;

  input.min = menu.minPax;
  input.value = menu.minPax;

  state.cart = state.cart.filter((c) => c.menuId !== menuId);

  state.cart.push({
    menuId,
    title: menu.title,
    pax: menu.minPax,
    minPax: menu.minPax,
    price: menu.price,
  });

  persistCart();
}

const MAX_PAX_PER_MENU = 300;

function onPaxChange(select, input) {
  if (!input.value) return;

  const menuId = String(select.value);
  const item = state.cart.find((c) => c.menuId === menuId);
  if (!item) return;

  let pax = Number(input.value);
  pax = Math.max(pax, item.minPax);
  pax = Math.min(pax, MAX_PAX_PER_MENU);

  item.pax = pax;
  input.value = pax;

  persistCart();
}

function removeRow(row) {
  const select = row.querySelector(".menu-nama");
  const menuId = select?.value;

  if (menuId) {
    state.cart = state.cart.filter((c) => c.menuId !== menuId);
    persistCart();
  }

  row.remove();

  if (!menuContainer.querySelector(".menu-item")) {
    addEmptyRow();
  }
}

/* ======================================================
 * FINAL FORM VALIDATION
 * ====================================================== */
function showError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = message;
  el.classList.add("active");

  const input = el.previousElementSibling;
  if (input) input.classList.add("error");
}

function clearError(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = "";
  el.classList.remove("active");

  const input = el.previousElementSibling;
  if (input) input.classList.remove("error");
}

function validateFormStrict() {
  // (LOGIC TIDAK DIUBAH — hanya dikelompokkan & dikomentari)
  const nama = document.getElementById("nama").value;
  const wa = document.getElementById("noWa").value;

  clearError("namaError");
  clearError("waError");

  if (nama.length < 3 || nama.length > 50) {
    showError("namaError", "Nama harus 3–50 karakter.");
    return false;
  }

  if (!/^[A-Za-zÀ-ÿ.\s]+$/.test(nama)) {
    showError("namaError", "Nama hanya boleh huruf dan spasi.");
    return false;
  }

  if (!/^(08|62)[0-9]{8,13}$/.test(wa)) {
    showError("waError", "Nomor WhatsApp tidak valid.");
    return false;
  }

  const alamat = document.getElementById("alamat").value.trim();
  const isDelivery = optDelivery.classList.contains("active");

  clearError("alamatError");

  if (isDelivery && alamat.length < 10) {
    showError("alamatError", "Alamat wajib diisi untuk pengantaran.");
    return false;
  }

  const tanggal = tanggalInput.value;
  clearError("tanggalError");

  if (!tanggal) {
    showError("tanggalError", "Tanggal acara wajib dipilih.");
    return false;
  }

  const pembayaran = document.getElementById("pembayaran").value;
  clearError("pembayaranError");

  if (!pembayaran) {
    showError("pembayaranError", "Silakan pilih metode pembayaran.");
    return false;
  }

  return true;
}

console.log("FINAL CART:", state.cart);

/* ======================================================
 * SUBMIT ORDER + WHATSAPP
 * ====================================================== */

// error reset awal (dipertahankan)
clearError("setujuError");
clearError("menuError");

/**
 * FUNGSI PALING KRITIS
 * Jangan refactor tanpa regression test
 */
async function submitOrder() {
  if (!validateFormStrict()) return;

  if (!setujuCheckbox.checked) {
    showError("setujuError", "Anda harus menyetujui syarat & ketentuan.");
    return;
  }

  if (!state.cart.length) {
    showError("menuError", "Silakan pilih menu terlebih dahulu.");
    return;
  }

  const estimasiHarga = hitungEstimasiHarga();

  const orderData = {
    orderId: "ORD-" + Date.now(),
    namaPemesan: document.getElementById("nama").value,
    noWa: document.getElementById("noWa").value,
    tanggalAcara: tanggalInput.value,
    jamAcara: document.getElementById("jam").value,
    tipePengiriman: optDelivery.classList.contains("active")
      ? "Delivery"
      : "Pickup",
    kota: kotaSelect.value,
    kecamatan: kecamatanSelect.value,
    kelurahan: kelurahanSelect.value,
    alamat: document.getElementById("alamat").value,
    menuData: state.cart,
    totalPax: state.cart.reduce((s, m) => s + Number(m.pax), 0),
    metodeBayar: document.getElementById("pembayaran").value,
    catatan: document.getElementById("catatan").value,
  };

  try {
    await fetch(
      "https://script.google.com/macros/s/AKfycbz-iIQh_tN3QrLadGNm7sGIoyzF28dFgF__2zSJ35mWPqs613E7sZAXi6Vss9_-4TaJ0Q/exec?action=submitOrder",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(orderData),
      }
    );
  } catch (err) {
    console.error("Gagal simpan order:", err);
  }

  const menuText = state.cart
    .map((m) => `- ${m.title} (${m.pax} pax)`)
    .join("\n");

  const waText = `
Halo Admin Dapur UNI,
Saya ingin melakukan pemesanan catering dengan detail berikut:

Nama Pemesan: ${orderData.namaPemesan}
Tanggal Acara: ${orderData.tanggalAcara}
Jam Acara: ${orderData.jamAcara}
Metode Pengiriman: ${orderData.tipePengiriman}

Alamat Pengiriman:
${orderData.alamat}

Pesanan:
${menuText}

Total Pax: ${orderData.totalPax}
Estimasi Total Harga: ${formatRupiah(estimasiHarga)}
Metode Pembayaran: ${orderData.metodeBayar}

Catatan Tambahan:
${orderData.catatan || "-"}
`.trim();

  window.open(
    "https://wa.me/6281315421428?text=" + encodeURIComponent(waText),
    "_blank"
  );
}

/* ======================================================
 * REALTIME INPUT GUARD
 * ====================================================== */
document.addEventListener("input", (e) => {
  if (e.target.id === "nama") {
    e.target.value = e.target.value.replace(/[^A-Za-zÀ-ÿ.\s]/g, "");
  }

  if (e.target.id === "noWa") {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  }
});

/* ======================================================
 * UI HELPERS
 * ====================================================== */

/**
 * CATATAN:
 * Terdapat DUPLIKASI event listener optDelivery / optPickup
 * Jangan dihapus — kemungkinan hasil iterasi historis
 * dan berpengaruh ke behavior tertentu.
 */
function setupToggle() {
  const alamatInput = document.getElementById("alamat");

  optDelivery.addEventListener("click", () => {
    optDelivery.classList.add("active");
    optPickup.classList.remove("active");
    alamatInput.required = true;
  });

  optPickup.addEventListener("click", () => {
    optPickup.classList.add("active");
    optDelivery.classList.remove("active");
    alamatInput.required = false;
  });

  // listener tambahan (dipertahankan)
  optDelivery.addEventListener("click", () => {
    optDelivery.classList.add("active");
    optPickup.classList.remove("active");
    alamatInput.required = true;
    updateDeliveryNote();
  });

  optPickup.addEventListener("click", () => {
    optPickup.classList.add("active");
    optDelivery.classList.remove("active");
    alamatInput.required = false;
    updateDeliveryNote();
  });

  alamatInput.required = optDelivery.classList.contains("active");
}

function setupTanggal() {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 5);

  tanggalInput.min = minDate.toISOString().split("T")[0];

  tanggalInput.addEventListener("input", () => {
    const d = new Date(tanggalInput.value).getDay();
    if (d === 0 || d === 6) {
      showError("tanggalError", "Tanggal tidak boleh Sabtu / Minggu.");
      tanggalInput.value = "";
    }
  });
}

function setupWilayah() {
  let wilayah = {};

  fetch("data/wilayahData.json")
    .then((r) => r.json())
    .then((d) => (wilayah = d));

  kotaSelect.addEventListener("change", () => {
    kecamatanSelect.innerHTML = `<option value="">Pilih Kecamatan</option>`;
    kelurahanSelect.innerHTML = `<option value="">Pilih Kelurahan</option>`;
    Object.keys(wilayah[kotaSelect.value] || {}).forEach((k) => {
      kecamatanSelect.append(new Option(k, k));
    });
  });

  kecamatanSelect.addEventListener("change", () => {
    kelurahanSelect.innerHTML = `<option value="">Pilih Kelurahan</option>`;
    (wilayah[kotaSelect.value]?.[kecamatanSelect.value] || []).forEach((k) => {
      kelurahanSelect.append(new Option(k, k));
    });
  });
}

function updateEstimasiUI() {
  const el = document.getElementById("estimasiHarga");
  if (!el) return;

  el.textContent = formatRupiah(hitungEstimasiHarga());
}

function updateDeliveryNote() {
  const note = document.getElementById("deliveryNote");
  if (!note) return;

  note.style.display = optDelivery.classList.contains("active")
    ? "block"
    : "none";
}
