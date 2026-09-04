# V6.0.0 Classic Fast Hybrid

- Cloudflare Worker dihapus dari runtime.
- Frontend GitHub Pages/PWA langsung tampil dari cache/static shell.
- Database utama pindah ke Firestore realtime.
- Login/register/reset password memakai Firebase Authentication.
- Email verification diwajibkan saat login.
- Firestore Security Rules dengan WARGA / ADMIN / SUPER_ADMIN.
- Super Admin bootstrap dibatasi ke `arjune@gandekan.id` dan email verified.
- Notifikasi realtime otomatis untuk perubahan Ronda, Posyandu, Kegiatan.
- Badge notifikasi + pusat notifikasi + mark read.
- FCM push notification opsional.
- Google Apps Script dipakai khusus Drive/PDF/push.
- Foto admin, dokumen, aduan, ronda, signature disimpan di Google Drive.
- PDF surat/peminjaman/laporan disimpan di Drive.
- Form admin Kegiatan/Posyandu/Aset/Dokumen mendapat upload langsung ke Drive.
- Diagnostik V6 dan halaman bootstrap admin.


## 6.1.0
- Marketplace-style asset cart.
- Multi-asset checkout into a single loan record and official loan letter.
- Quantity controls and automatic multi-item rental/deposit totals.
- Official loan PDF with letterhead and three signatures: borrower, treasurer, RT chairman.
- Signature and letter-logo Drive file IDs are stored for reliable private-image embedding in PDFs.
