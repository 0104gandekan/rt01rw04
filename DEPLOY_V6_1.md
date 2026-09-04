# Deploy V6.1 Marketplace Asset Cart

## Upgrade dari V6.0

1. Backup repository GitHub dan project Apps Script.
2. Ganti `docs/index.html`, `docs/js/v6-api.js`, dan `docs/sw.js` dengan versi V6.1.
3. **Jangan timpa `docs/js/firebase-config.js` yang sudah berisi konfigurasi Firebase Anda.** Jika ingin, cukup ubah `APP_VERSION` menjadi `6.1.0` dan `PUBLIC_CACHE_KEY` menjadi `rt01-v61-public-cache`.
4. Di Apps Script, ganti `PdfService.gs` dengan versi V6.1 lalu Deploy → Manage deployments → Edit → New version.
5. Tidak ada perubahan Firestore Rules yang wajib untuk fitur keranjang karena dokumen `loans` tetap berada di koleksi yang sama.
6. Masuk Dashboard Admin → Pengaturan dan **simpan ulang tanda tangan Bendahara dan Ketua RT**. V6.1 menyimpan Drive File ID agar tanda tangan private dapat dimasukkan ke PDF surat.
7. Jika memakai logo kop, upload/simpan ulang logo kop agar `LETTER_LOGO_FILE_ID` ikut tersimpan.
8. Setelah GitHub Pages selesai deploy, lakukan hard refresh atau hapus cache PWA sekali.

## Alur baru peminjaman

Aset → Tambah Keranjang → tambah aset lain → atur jumlah → Keranjang → isi satu form → tanda tangan → kirim.

Satu dokumen Firestore `loans` menyimpan `Items[]`, jumlah jenis, total unit, biaya sewa, deposit, dan total tagihan. Admin dapat Preview dan membuat satu PDF Surat Pernyataan Peminjaman Aset untuk seluruh item.

## Persetujuan stok

Saat admin menyetujui melalui tombol PDF/persetujuan, V6.1 memvalidasi stok tiap aset dan mengurangi `Tersedia`. Jika status kemudian menjadi `SELESAI`, `DIKEMBALIKAN`, `DIBATALKAN`, atau `DITOLAK` setelah pernah disetujui, stok dikembalikan otomatis.
