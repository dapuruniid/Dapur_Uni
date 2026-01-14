/**
 * ======================================================
 * jadwal.js
 * ------------------------------------------------------
 * Modul kalender jadwal pemesanan
 * ======================================================
 */

/* ======================================================
 * DOM REFERENCES
 * ====================================================== */
const calendarBody = document.getElementById("calendar-body");
const monthLabel = document.querySelector(".month-label");
const prevBtn = document.querySelector(".prev");
const nextBtn = document.querySelector(".next");
const calendarStatus = document.getElementById("calendarStatus");

/* ======================================================
 * GLOBAL STATE
 * ====================================================== */
const today = new Date();

let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

/**
 * Menyimpan daftar tanggal yang sudah full booking
 * Format tanggal: YYYY-MM-DD
 */
let fullBookDates = [];

/* ======================================================
 * CACHE CONFIG (NON-BREAKING)
 * ====================================================== */
const CACHE_KEY = "dapuruni_full_book_dates";
const CACHE_TTL = 30 * 60 * 1000; // 30 menit

/* ======================================================
 * API — LOAD FULL BOOK DATES
 * ====================================================== */
function loadBookedDates() {
  if (calendarStatus) {
    calendarStatus.textContent = "Memuat status ketersediaan tanggal...";
  }

  // ----------------------------------
  // 1. Cek cache dulu
  // ----------------------------------
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);

      if (
        parsed &&
        Array.isArray(parsed.data) &&
        Date.now() - parsed.time < CACHE_TTL
      ) {
        fullBookDates = parsed.data;
        renderCalendar(currentMonth, currentYear);

        if (calendarStatus) {
          calendarStatus.textContent =
            "Status ketersediaan tanggal telah diperbarui.";
        }

        return;
      }
    }
  } catch {
    // cache rusak → lanjut fetch
  }

  // ----------------------------------
  // 2. Fetch dari backend
  // ----------------------------------
  fetch(
    "https://script.google.com/macros/s/AKfycbz-iIQh_tN3QrLadGNm7sGIoyzF28dFgF__2zSJ35mWPqs613E7sZAXi6Vss9_-4TaJ0Q/exec?action=getBookedDates"
  )
    .then((res) => res.json())
    .then((data) => {
      fullBookDates = Array.isArray(data.fullBookDates)
        ? data.fullBookDates
        : [];

      // Simpan cache
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          time: Date.now(),
          data: fullBookDates,
        })
      );

      renderCalendar(currentMonth, currentYear);

      if (calendarStatus) {
        calendarStatus.textContent =
          "Status ketersediaan tanggal telah diperbarui.";
      }
    })
    .catch((err) => {
      console.error("Gagal load booked dates:", err);
      fullBookDates = [];
      renderCalendar(currentMonth, currentYear);

      if (calendarStatus) {
        calendarStatus.textContent =
          "Gagal memuat status ketersediaan tanggal. Silakan muat ulang halaman.";
      }
    });
}

/* ======================================================
 * CALENDAR RENDERING
 * ====================================================== */
function renderCalendar(month, year) {
  calendarBody.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  monthLabel.textContent = `${monthNames[month]} ${year}`;

  let date = 1;

  for (let week = 0; week < 6; week++) {
    const row = document.createElement("tr");

    for (let day = 0; day < 7; day++) {
      const cell = document.createElement("td");

      if (week === 0 && day < firstDay) {
        cell.textContent = "";
      } else if (date > daysInMonth) {
        cell.textContent = "";
      } else {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
          date
        ).padStart(2, "0")}`;

        cell.textContent = date;

        // Weekend
        if (day === 0 || day === 6) {
          cell.classList.add("weekend");
        }

        // Today
        if (
          date === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear()
        ) {
          cell.classList.add("today");
        }

        // Full booking
        if (fullBookDates.includes(dateStr)) {
          cell.classList.add("full");
        }

        date++;
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  }
}

/* ======================================================
 * MONTH NAVIGATION
 * ====================================================== */
prevBtn.addEventListener("click", () => {
  currentMonth--;

  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }

  renderCalendar(currentMonth, currentYear);
});

nextBtn.addEventListener("click", () => {
  currentMonth++;

  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }

  renderCalendar(currentMonth, currentYear);
});

/* ======================================================
 * INIT
 * ====================================================== */

// Render awal TANPA menunggu API (UX cepat)
renderCalendar(currentMonth, currentYear);

// Load booked dates di background
loadBookedDates();
