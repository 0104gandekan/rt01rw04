# RT 01 RW 04 Digital V6.1 — Classic Fast Marketplace Asset Cart

# RT 01 RW 04 Digital V6 — Classic Fast Hybrid

Versi V6 mempertahankan UI Classic/V3 tetapi mengganti jalur data utama menjadi Firebase agar halaman tampil cepat.

## Arsitektur

```text
Warga / Admin
    │
    ▼
GitHub Pages (PWA statis)
    │
    ├── Firebase Authentication — login/register/reset password
    ├── Firestore — database realtime + notifikasi
    │
    └── Google Apps Script — hanya upload/PDF/push
              │
              ▼
          Google Drive
```

Tidak ada Cloudflare Worker. Beranda tidak menunggu Apps Script.

## Fitur utama

- UI Classic V3: hero, saldo/pemasukan/pengeluaran, 10 menu, sholat, ronda swipe, Posyandu swipe, kegiatan, aset, layanan, pengurus.
- Login/Register Firebase Authentication.
- Verifikasi akun warga oleh admin: MENUNGGU / AKTIF / DITOLAK / SUSPEND.
- Dashboard admin lengkap dan CRUD Firestore realtime.
- Notifikasi otomatis ketika Jadwal Ronda, Posyandu, atau Kegiatan dibuat/diubah.
- In-app notification + badge lonceng.
- Push notification FCM opsional.
- Foto/dokumen/surat/PDF disimpan ke Google Drive melalui Apps Script.
- Foto kegiatan, Posyandu, aset, dokumen dapat diupload langsung dari form admin.
- Dokumentasi ronda dan foto aduan masuk Drive.
- Generator PDF surat, peminjaman aset, laporan keuangan, laporan inventaris via Apps Script + Drive.
- Firestore offline persistence + Service Worker PWA.
- Fast-first rendering: UI/cache langsung tampil, Firestore menyegarkan data di belakang.

## File penting

- `docs/index.html` — frontend utama.
- `docs/js/firebase-config.js` — isi konfigurasi Firebase dan URL Apps Script `/exec`.
- `firebase/firestore.rules` — Security Rules.
- `apps-script/` — file Apps Script untuk Google Drive, PDF, dan push notification.
- `docs/bootstrap-admin.html` — setup admin pertama.
- `docs/diagnostics.html` — tes Firebase dan Apps Script.

## Admin awal

Email bootstrap sudah dibatasi di Security Rules ke:

`arjune@gandekan.id`

Password TIDAK disimpan di repository. Gunakan password admin yang telah Anda tentukan saat membuka `bootstrap-admin.html`.

## Urutan deploy cepat

1. Buat Firebase project + Web App.
2. Aktifkan Authentication Email/Password dan Firestore.
3. Isi `docs/js/firebase-config.js`.
4. Deploy `firebase/firestore.rules` dengan Firebase CLI.
5. Buat Apps Script baru, salin semua file dari `apps-script/`, isi `V6_SETUP`, jalankan `setupV6()`, deploy Web App sebagai `Execute as: Me`, `Who has access: Anyone`.
6. Masukkan URL Apps Script `/exec` ke `docs/js/firebase-config.js`.
7. Upload/push repository ke GitHub, Settings → Pages → Source: GitHub Actions.
8. Buka `/bootstrap-admin.html`, buat akun admin, verifikasi email, login, aktifkan SUPER_ADMIN, lalu seed data awal.
9. Buka `/diagnostics.html` untuk tes.

Baca `DEPLOY_GITHUB_FIREBASE.md` untuk panduan detail.

## Catatan keamanan file

- PDF surat/laporan dan tanda tangan dibuat **private** di Google Drive.
- Foto aduan dan dokumentasi ronda private.
- Foto pengurus/kegiatan/aset dapat dibuat public link karena memang tampil di frontend.
- Dokumen hanya dibuat public bila opsi `Publik` dicentang admin.
- Frontend tidak menyimpan password admin, private key FCM, atau kredensial Google Drive.
- Upload dari GitHub Pages ke Apps Script memakai hidden-iframe POST + Firebase ID token, sehingga tidak membutuhkan Cloudflare Worker atau CORS proxy.

## V6.1 — Marketplace Asset Loan Cart
- Peminjam dapat menambahkan beberapa jenis aset ke keranjang dan mengatur jumlah masing-masing.
- Satu checkout/form untuk seluruh aset, satu periode peminjaman, satu keperluan, dan satu tanda tangan peminjam.
- Firestore menyimpan array `Items` sekaligus ringkasan biaya sewa, deposit, dan total tagihan.
- Surat Pernyataan Peminjaman Aset memakai kop resmi dan tabel rincian semua aset.
- PDF surat memuat tanda tangan Peminjam, Bendahara, dan Ketua RT dari file Google Drive bila tanda tangan sudah disimpan.
- Kompatibel dengan pengajuan lama satu aset.


## V6.1.2
Preview pengajuan surat dan surat peminjaman, Doa Harian, jadwal Imsakiyah berdasarkan lokasi, serta Aduan Warga dengan pemilihan titik Leaflet telah diaktifkan. Terapkan ulang `firebase/firestore.rules` saat upgrade karena V6.1.2 menambah koleksi publik tersanitasi `complaintPublic`.
