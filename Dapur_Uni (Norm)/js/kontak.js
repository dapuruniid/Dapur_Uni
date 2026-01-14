// ======================================================
// kontak.js
// ------------------------------------------------------
// FORM KONTAK — Dapur UNI
//
// TANGGUNG JAWAB:
// - Validasi sederhana form kontak
// - Menyusun template pesan WhatsApp
// - Mengarahkan user ke WhatsApp (wa.me)
//
// CATATAN:
// - Jangan mengubah teks pesan atau URL WA
// - File ini langsung memengaruhi UX user
// ======================================================

/* ======================================================
 * DOM READY
 * ====================================================== */
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("formKontak");
  if (!form) return;

  /* ----------------------------------
   * SUBMIT HANDLER
   * ---------------------------------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    /* ----------------------------------
     * AMBIL NILAI INPUT
     * ---------------------------------- */
    const nama = document.getElementById("nama").value.trim();
    const kontak = document.getElementById("kontak").value.trim();
    const pesan = document.getElementById("pesan").value.trim();

    /* ----------------------------------
     * VALIDASI DASAR
     * ---------------------------------- */
    if (!nama || !kontak || !pesan) {
      showToast("Mohon lengkapi semua data terlebih dahulu");
      return;
    }

    if (pesan.length < 10) {
      showToast("Pesan terlalu singkat. Mohon jelaskan lebih detail");
      return;
    }

    /* ----------------------------------
     * TEMPLATE PESAN WHATSAPP
     * ----------------------------------
     * Catatan:
     * - Struktur teks & line break dipertahankan
     * - Aman untuk encodeURIComponent
     */
    const text =
      "Halo Dapur UNI,\n\n" +
      "Saya menghubungi melalui halaman Kontak di website.\n" +
      "Ingin bertanya dan minta informasi lebih lanjut.\n\n" +
      "Nama   : " +
      nama +
      "\n" +
      "Kontak : " +
      kontak +
      "\n\n" +
      "Pesan:\n" +
      pesan;

    /* ----------------------------------
     * OPEN WHATSAPP
     * ---------------------------------- */
    const url = "https://wa.me/6281315421428?text=" + encodeURIComponent(text);

    window.open(url, "_blank");
  });
});
