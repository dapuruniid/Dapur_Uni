// ======================================================
// menu-api.js
// ------------------------------------------------------
// Data loader Menu — Dapur UNI
// Strategy: Stale-While-Revalidate (SWR)
// ======================================================

// URL Web App Google Apps Script
const MENU_API_URL =
  "https://script.google.com/macros/s/AKfycbz-iIQh_tN3QrLadGNm7sGIoyzF28dFgF__2zSJ35mWPqs613E7sZAXi6Vss9_-4TaJ0Q/exec";

// Cache config
const CACHE_KEY = "dapuruni_menu_cache_v1";

// TTL normal (user biasa)
const DEFAULT_TTL = 10 * 60 * 1000; // 10 menit

// Mode realtime / debug (?nocache)
const CACHE_TTL = location.search.includes("nocache") ? 0 : DEFAULT_TTL;

/* ======================================================
 * FETCH MENU DATA (SWR)
 * ====================================================== */
async function fetchMenuData() {
  let cachedPayload = null;

  // ---------------------------------
  // 1. RENDER DARI CACHE (JIKA ADA)
  // ---------------------------------
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);

      if (parsed && Array.isArray(parsed.data)) {
        cachedPayload = parsed;

        // Render cepat (tidak menunggu server)
        if (typeof initMenuPage === "function") {
          initMenuPage(parsed.data);
        }

        // Jika TTL = 0 (mode realtime), lanjut fetch
        if (CACHE_TTL > 0 && Date.now() - parsed.time < CACHE_TTL) {
          return; // Cache masih fresh → stop di sini
        }
      }
    }
  } catch (err) {
    console.warn("Cache menu rusak, lanjut fetch", err);
  }

  // ---------------------------------
  // 2. FETCH DARI SERVER (BACKGROUND)
  // ---------------------------------
  try {
    const res = await fetch(`${MENU_API_URL}?action=getMenu`);

    if (!res.ok) {
      throw new Error("Gagal mengambil data menu dari server");
    }

    const freshData = await res.json();

    if (!Array.isArray(freshData)) {
      throw new Error("Format data menu tidak valid");
    }

    // Cek apakah data berubah
    const isDifferent =
      !cachedPayload ||
      JSON.stringify(freshData) !== JSON.stringify(cachedPayload.data);

    if (isDifferent) {
      // Update cache
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          time: Date.now(),
          data: freshData,
        })
      );

      // Re-render hanya jika berbeda
      if (typeof initMenuPage === "function") {
        initMenuPage(freshData);
      }

      console.log("Menu updated from server");
    } else {
      console.log("Menu server sama dengan cache");
    }
  } catch (err) {
    console.error(err);

    // Jika tidak ada cache sama sekali → baru alert
    if (!cachedPayload) {
      alert(
        "Terjadi kesalahan saat memuat data menu. Silakan coba reload halaman."
      );
    }
  }
}

/* ======================================================
 * INIT
 * ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  fetchMenuData();
});
