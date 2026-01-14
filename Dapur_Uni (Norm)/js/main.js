// ======================================================
// main.js — Dapur UNI
// ------------------------------------------------------
// Script global untuk interaksi umum website
// (navbar, smooth scroll, footer, animasi, header scroll)
// ======================================================

/* ======================================================
 * DOM READY
 * ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  /* --------------------------------------
   * NAVBAR — Active Link Otomatis
   * -------------------------------------- */
  const navLinkElements = document.querySelectorAll(".nav-links a");
  const currentPage = window.location.pathname.split("/").pop();

  navLinkElements.forEach((link) => {
    const href = link.getAttribute("href");

    if (href === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  /* --------------------------------------
   * SMOOTH SCROLL — Anchor (#)
   * -------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");

      if (targetId.startsWith("#")) {
        e.preventDefault();

        document.querySelector(targetId)?.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });

  /* --------------------------------------
   * FOOTER — Auto Tahun
   * -------------------------------------- */
  const footer = document.querySelector("footer p");

  if (footer) {
    const year = new Date().getFullYear();
    footer.innerHTML = `© ${year} Dapur UNI | Masakan Enak, Harga Terjangkau`;
  }

  /* --------------------------------------
   * ANIMASI MASUK — [data-animate]
   * -------------------------------------- */
  const animateElements = document.querySelectorAll("[data-animate]");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  animateElements.forEach((el) => observer.observe(el));
});

/* ======================================================
 * HEADER — Scrolled Toggle (WhatsApp-like)
 * ====================================================== */
(function () {
  const header = document.querySelector(".header"); // header fixed
  if (!header) return;

  const SCROLL_THRESHOLD = 12; // nilai eksisting, tidak diubah
  let ticking = false;

  function checkScroll() {
    const scrollY = window.scrollY || window.pageYOffset;

    if (scrollY > SCROLL_THRESHOLD) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(checkScroll);
      ticking = true;
    }
  }

  // Initial state
  checkScroll();

  window.addEventListener("scroll", onScroll, { passive: true });
})();

function showToast(message, duration = 2000) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

const promoBanner = document.getElementById("promoBanner");
const promoImage = "assets/promo.webp";

// Tampilkan banner jika file promo tersedia
fetch(promoImage, { method: "HEAD" })
  .then((res) => {
    if (res.ok) {
      promoBanner.hidden = false;
    }
  })
  .catch(() => {
    // Jika file tidak ada, banner tetap tersembunyi
  });
