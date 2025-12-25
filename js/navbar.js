// ======================================================
// navbar.js
// ------------------------------------------------------
// Tanggung jawab:
// - Toggle hamburger menu (mobile)
// - Sinkronisasi state hamburger & nav-links
// - Menutup menu saat link diklik
// - Menambahkan efek header.scrolled saat scroll
//
// Catatan:
// - Selector, class, dan perilaku WAJIB dipertahankan
// - File ini berinteraksi langsung dengan UI utama
// ======================================================

// Debug awal (dipertahankan karena mungkin masih dipakai)
console.log("hamburger:", document.getElementById("hamburger"));
console.log("navLinks:", document.getElementById("nav-links"));

/* ======================================================
 * DOM READY
 * ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  /* --------------------------------------
   * DOM REFERENCES
   * -------------------------------------- */
  const header = document.querySelector(".header");
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  /* --------------------------------------
   * HAMBURGER — Toggle Menu Mobile
   * -------------------------------------- */
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      // Toggle visibilitas menu
      navLinks.classList.toggle("show");

      // Sinkronisasi state hamburger
      const isOpen = navLinks.classList.contains("show");
      hamburger.classList.toggle("active", isOpen);
      hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  /* --------------------------------------
   * NAV LINKS — Auto Close Menu
   * -------------------------------------- */
  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      // Tutup menu saat navigasi
      navLinks.classList.remove("show");
      hamburger.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  /* --------------------------------------
   * HEADER — Scroll Effect
   * -------------------------------------- */
  window.addEventListener("scroll", () => {
    if (!header) return;

    if (window.scrollY > 10) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });
});
