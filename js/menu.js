// ======================================================
// menu.js
// ------------------------------------------------------
// MENU PAGE LOGIC — Dapur UNI
//
// TANGGUNG JAWAB:
// - Render grid menu (lazy batch rendering)
// - Menangani modal detail menu
// - Mengelola cart ringan (khusus halaman menu)
// - Sinkronisasi cart ke localStorage
//
// CATATAN KRITIS:
// - File ini berelasi langsung dengan UI & UX
// - Jangan mengubah timing, event, atau struktur DOM
// ======================================================

/* ======================================================
 * GLOBAL STATE
 * ====================================================== */

// Data menu global (diisi dari menu-api.js)
let menuData = [];

// Referensi konten modal (dipakai lintas fungsi)
let modalContentGlobal = null;

// Menu yang sedang aktif di modal
let currentMenu = null;

// Cart lokal khusus halaman menu
let cart = [];

/* ======================================================
 * STORAGE
 * ====================================================== */
function saveCartToStorage() {
  localStorage.setItem("dapuruni_cart", JSON.stringify(cart));
}

/* ======================================================
 * IMAGE URL NORMALIZATION (GOOGLE DRIVE)
 * ====================================================== */
/**
 * Normalisasi URL gambar Google Drive agar bisa ditampilkan langsung.
 * Mendukung:
 * - drive.google.com/file/d/ID
 * - drive.google.com/uc?id=ID
 */
function normalizeImageUrl(url) {
  if (!url) return "assets/menu/placeholder.jpg";

  url = String(url).trim().replace(/&amp;/g, "&");

  // Format: drive.google.com/file/d/ID
  let match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (match) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }

  // Format: drive.google.com/uc?id=ID
  match = url.match(/drive\.google\.com\/uc\?id=([^&]+)/);
  if (match) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }

  return url;
}

/**
 * Helper tambahan untuk menentukan ukuran gambar Drive.
 * Digunakan untuk membedakan thumbnail vs modal image.
 */
function withDriveSize(url, size) {
  if (!url) return url;
  return `${url}=w${size}`;
}

/* ======================================================
 * DOM READY — EVENT BINDING
 * ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("menuGrid");
  const modal = document.getElementById("menuModal");

  modalContentGlobal = document.querySelector(".menu-modal-content");

  // Pastikan modal tersembunyi saat awal
  if (modal) modal.style.display = "none";

  /* ----------------------------------
   * EVENT DELEGATION — DETAIL BUTTON
   * ---------------------------------- */
  if (grid) {
    grid.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-detail")) {
        const id = parseInt(e.target.dataset.id, 10);
        openModalById(id, menuData, modalContentGlobal);
      }
    });
  }

  /* ----------------------------------
   * MODAL ACTION BUTTONS
   * ---------------------------------- */
  const btnAddCart = document.getElementById("btnAddCart");
  const btnOrderNow = document.getElementById("btnOrderNow");

  if (btnAddCart) {
    btnAddCart.addEventListener("click", () => {
      if (addCurrentToCart()) {
        closeModal();
        alert("Menu ditambahkan ke keranjang.");
      }
    });
  }

  if (btnOrderNow) {
    btnOrderNow.addEventListener("click", () => {
      if (!currentMenu) return;

      const paxSelect = document.getElementById("paxSelect");
      const selectedPax = Number(paxSelect?.value || currentMenu.minPax || 0);

      if (!selectedPax || selectedPax <= 0) {
        alert("Silakan pilih jumlah porsi (pax) terlebih dahulu.");
        return;
      }

      addCurrentToCart();
      saveCartToStorage();
      closeModal();

      // Navigasi ke halaman pemesanan
      window.location.href = "pesan.html";
    });
  }
});

/* ======================================================
 * INIT MENU GRID (BATCH RENDERING)
 * ====================================================== */
/**
 * Dipanggil oleh menu-api.js setelah data menu siap.
 * Menggunakan batch rendering untuk performa & UX.
 */
function initMenuPage(data) {
  menuData = data;

  const grid = document.getElementById("menuGrid");
  if (!grid) return;

  grid.innerHTML = "";

  let index = 0;
  const batchSize = 4; // nilai eksisting (jangan diubah)

  function renderBatch() {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < batchSize && index < menuData.length; i++, index++) {
      const menu = menuData[index];

      const card = document.createElement("div");
      card.className = "menu-card";

      const imgSrc = withDriveSize(normalizeImageUrl(menu.img), 600);
      const isFirstItem = index === 0;

      card.innerHTML = `
      <img 
        src="${imgSrc}" 
        alt="${menu.title}"
        loading="${isFirstItem ? "eager" : "lazy"}"
        fetchpriority="${isFirstItem ? "high" : "auto"}"
        decoding="async"
      >
      <div class="menu-info">
        <div class="menu-top">
          <h3>${menu.title}</h3>
          <span class="kategori">${menu.category}</span>
        </div>
        <div class="menu-bottom">
          <p class="pax">Min. ${menu.minPax} pax</p>
          <p class="harga">
            Rp${Number(menu.price).toLocaleString("id-ID")} ${menu.priceUnit}
          </p>
        </div>
      </div>
      <button class="btn-detail" data-id="${menu.id}">Lihat Detail</button>
    `;

      fragment.appendChild(card);
    }

    grid.appendChild(fragment);

    if (index < menuData.length) {
      requestAnimationFrame(renderBatch);
    }
  }

  renderBatch();
}

/* ======================================================
 * MODAL HANDLING
 * ====================================================== */
function openModalById(id, data, modalContent) {
  const menu = data.find((item) => Number(item.id) === Number(id));
  if (!menu) return;

  currentMenu = menu;

  document.getElementById("modalTitle").innerText = menu.title || "";

  // Gambar resolusi besar hanya dimuat saat modal dibuka
  document.getElementById("modalImage").src = withDriveSize(
    normalizeImageUrl(menu.img || ""),
    1000
  );

  document.getElementById("modalDesc").innerText = menu.desc || "";
  document.getElementById("modalPrice").innerText = `Harga: Rp${Number(
    menu.price
  ).toLocaleString("id-ID")} ${menu.priceUnit}`;
  document.getElementById("modalPortion").innerText = menu.portion || "";

  // Daftar menu makanan
  const foodList = document.getElementById("modalFood");
  foodList.innerHTML = "";
  if (menu.food && menu.food.length > 0) {
    menu.food.forEach((item) => {
      const li = document.createElement("li");
      li.innerText = item;
      foodList.appendChild(li);
    });
  }

  document.getElementById("modalCategory").innerText = menu.category || "";
  document.getElementById("modalTags").innerText = menu.tags
    ? menu.tags.join(", ")
    : "";

  /* ----------------------------------
   * PAX SELECT
   * ---------------------------------- */
  const paxSelect = document.getElementById("paxSelect");
  paxSelect.innerHTML = "";

  const minPax = Number(menu.minPax) || 2;
  const step = 5;
  const maxPax = 300;

  // hitung angka awal yang rapi (kelipatan 5)
  const start = minPax % step === 0 ? minPax : Math.ceil(minPax / step) * step;

  // pastikan minPax tetap muncul sebagai default
  const optMin = document.createElement("option");
  optMin.value = minPax;
  optMin.innerText = `${minPax} Pax`;
  paxSelect.appendChild(optMin);

  for (let val = start; val <= maxPax; ) {
    if (val !== minPax) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.innerText = `${val} Pax`;
      paxSelect.appendChild(opt);
    }

    // step dinamis
    if (val < 100) {
      val += 5;
    } else if (val < 200) {
      val += 10;
    } else {
      val += 20;
    }
  }

  paxSelect.value = minPax;

  /* ----------------------------------
   * SHOW MODAL + ANIMATION
   * ---------------------------------- */
  const modal = document.getElementById("menuModal");
  modal.style.display = "flex";

  if (window.innerWidth <= 768) {
    modalContent.style.transform = "translateY(100%)";
    modalContent.style.transition = "transform 0.3s ease";
    setTimeout(() => (modalContent.style.transform = "translateY(0)"), 10);
  } else {
    modalContent.style.opacity = 0;
    modalContent.style.transition = "opacity 0.3s ease";
    setTimeout(() => (modalContent.style.opacity = 1), 10);
  }
}

/* ======================================================
 * CART & UTILITIES
 * ====================================================== */
/**
 * Menambahkan menu aktif ke cart lokal.
 * Digunakan untuk:
 * - Add to Cart
 * - Order Now
 */
function addCurrentToCart() {
  if (!currentMenu) return false;

  const paxSelect = document.getElementById("paxSelect");
  const selectedPax = Number(paxSelect.value);

  if (!selectedPax || selectedPax <= 0) return false;

  const exists = cart.find(
    (item) => item.id === currentMenu.id && item.pax === selectedPax
  );
  if (exists) return true;

  cart.push({
    id: currentMenu.id,
    title: currentMenu.title,
    pax: selectedPax,
    price: Number(currentMenu.price) || 0,
    priceUnit: currentMenu.priceUnit || "/pax",
  });

  saveCartToStorage();
  return true;
}

/* ======================================================
 * MODAL CLOSE HANDLING
 * ====================================================== */
function closeModal() {
  const modal = document.getElementById("menuModal");
  const modalContent = document.querySelector(".menu-modal-content");

  if (window.innerWidth <= 768) {
    modalContent.style.transform = "translateY(100%)";
    setTimeout(() => (modal.style.display = "none"), 300);
  } else {
    modalContent.style.opacity = 0;
    setTimeout(() => (modal.style.display = "none"), 300);
  }
}

/* ======================================================
 * GLOBAL CLICK — CLOSE MODAL
 * ====================================================== */
window.onclick = function (event) {
  const modal = document.getElementById("menuModal");
  if (event.target === modal) closeModal();
};
