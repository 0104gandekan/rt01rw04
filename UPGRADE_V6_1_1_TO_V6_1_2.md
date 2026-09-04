# Upgrade V6.1.1 → V6.1.2

## File yang diganti

1. `docs/index.html`
2. `docs/js/v6-api.js`
3. `docs/sw.js`
4. `firebase/firestore.rules`

`docs/js/firebase-config.js` **jangan ditimpa** pada instalasi yang sudah berjalan karena file tersebut berisi konfigurasi Firebase dan URL Apps Script milik Anda.

## Langkah deployment

1. Backup repository GitHub yang sedang aktif.
2. Ganti tiga file frontend di atas.
3. Deploy ulang `firebase/firestore.rules` karena V6.1.2 menambah koleksi `complaintPublic` untuk ringkasan aduan yang aman ditampilkan ke warga.
4. Tidak perlu membuat ulang Apps Script. Upload foto/dokumen/surat tetap menggunakan Apps Script + Google Drive yang sudah dipasang di V6.
5. Push perubahan ke GitHub Pages.
6. Setelah GitHub Pages selesai, buka aplikasi dan lakukan hard refresh. PWA V6.1.2 memakai cache baru `rt01-v612-feature-expansion-shell`.

## Catatan Aduan Lama

Aduan baru otomatis membuat ringkasan publik tanpa UID, nomor WhatsApp, atau foto privat. Untuk aduan lama, buka Dashboard Admin → **Aduan Warga** satu kali. V6.1.2 akan menyinkronkan ringkasan aman ke `complaintPublic`.

## Uji setelah deploy

- Jadwal Sholat: izinkan lokasi dan pastikan koordinat perangkat tampil.
- Imsakiyah: buka menu Imsakiyah dan cek tabel bulan berjalan.
- Doa Harian: buka Lainnya → Doa Harian dan coba pencarian.
- Pengajuan Surat: isi form lalu tekan Preview Surat.
- Peminjaman Aset: masukkan minimal dua aset, buka keranjang, isi data, lalu Preview Surat.
- Aduan: buka Aduan Warga → tekan ikon `+` → klik titik pada peta Leaflet → kirim aduan.
