// ======================================================
// menu-api.js
// ------------------------------------------------------
// Data loader Menu — Dapur UNI
// ======================================================

// URL Web App Google Apps Script
const MENU_API_URL =
  "https://script.google.com/macros/s/AKfycbz-iIQh_tN3QrLadGNm7sGIoyzF28dFgF__2zSJ35mWPqs613E7sZAXi6Vss9_-4TaJ0Q/exec";

// Cache config
const CACHE_KEY = "dapuruni_menu_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

/* ======================================================
 * FETCH MENU DATA (CACHE-AWARE)
 * ====================================================== */
async function fetchMenuData() {
  // -------------------------------
  // 1. Cek cache dulu
  // -------------------------------
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);

      if (
        parsed &&
        Array.isArray(parsed.data) &&
        Date.now() - parsed.time < CACHE_TTL
      ) {
        menuData = parsed.data;

        if (typeof initMenuPage === "function") {
          initMenuPage(menuData);
        }

        console.log("Menu loaded from cache");
        return; // STOP — tidak fetch
      }
    }
  } catch (err) {
    console.warn("Cache menu rusak, fetch ulang", err);
  }

  // -------------------------------
  // 2. Fetch dari server
  // -------------------------------
  try {
    const res = await fetch(`${MENU_API_URL}?action=getMenu`);

    if (!res.ok) {
      throw new Error("Gagal mengambil data menu dari server");
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("Format data menu tidak valid");
    }

    menuData = data;

    // Render menu
    if (typeof initMenuPage === "function") {
      initMenuPage(menuData);
    }

    // Simpan cache
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        time: Date.now(),
        data: menuData,
      })
    );

    console.log("Menu loaded from server & cached");
  } catch (err) {
    console.error(err);

    alert(
      "Terjadi kesalahan saat memuat data menu. Silakan coba reload halaman."
    );
  }
}

/* ======================================================
 * INIT
 * ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  fetchMenuData();
});
