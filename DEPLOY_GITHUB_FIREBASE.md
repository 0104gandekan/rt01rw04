# Panduan Deploy V6 — GitHub Pages + Firebase + Google Drive

## A. Firebase

1. Buka Firebase Console → Create project.
2. Project Settings → Your apps → Web → Register app.
3. Salin `firebaseConfig` ke `docs/js/firebase-config.js`.
4. Authentication → Sign-in method → aktifkan **Email/Password**.
5. Firestore Database → Create database → Production mode.
6. Install Firebase CLI di PC:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
7. Dari folder `firebase/`:
   ```bash
   firebase use --add
   firebase deploy --only firestore:rules,firestore:indexes
   ```

Security Rules membatasi admin memakai role pada `users/{uid}`. Email bootstrap Super Admin hanya `arjune@gandekan.id` dan harus sudah terverifikasi.

## B. Google Apps Script + Drive

1. Buat Apps Script standalone baru.
2. Buat file dengan nama yang sama seperti folder `apps-script/`.
3. Edit `Config.gs`:
   ```javascript
   const V6_SETUP = {
     FIREBASE_PROJECT_ID: 'project-id-anda',
     FIREBASE_WEB_API_KEY: 'firebase-web-api-key'
   };
   ```
4. Jalankan `setupV6()` satu kali dan beri izin Drive/Documents/UrlFetch.
5. Deploy → New deployment → Web app:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Salin URL yang berakhir `/exec` ke:
   `docs/js/firebase-config.js` → `APPS_SCRIPT_URL`.
7. Tes URL `/exec` di browser. Harus menampilkan JSON service V6.

Apps Script hanya dipakai saat upload/PDF/push, bukan ketika beranda dibuka.

## C. Setup Push Notification (opsional)

Notifikasi dalam aplikasi tetap berfungsi tanpa langkah ini. Untuk push browser/PWA:

1. Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → buat VAPID key.
2. Isi `FIREBASE_VAPID_KEY` di `docs/js/firebase-config.js`.
3. Buat Service Account Firebase/GCP yang memiliki izin Firebase Cloud Messaging.
4. Apps Script → Project Settings → Script Properties tambahkan:
   - `FCM_CLIENT_EMAIL`
   - `FCM_PRIVATE_KEY` (private_key service account; newline boleh `\n`)
5. `FIREBASE_PROJECT_ID` sudah dibuat oleh `setupV6()`.

Jika FCM belum dikonfigurasi, update Ronda/Posyandu/Kegiatan tetap otomatis muncul pada pusat notifikasi di aplikasi.

## D. GitHub Pages

1. Buat repository GitHub.
2. Upload seluruh isi paket V6 ke branch `main`.
3. GitHub → Settings → Pages → Source: **GitHub Actions**.
4. Workflow `.github/workflows/pages.yml` akan menerbitkan folder `docs/`.

URL aplikasi kira-kira:
`https://USERNAME.github.io/NAMA-REPO/`

Dashboard admin:
`https://USERNAME.github.io/NAMA-REPO/admin.html`

Setup admin pertama:
`https://USERNAME.github.io/NAMA-REPO/bootstrap-admin.html`

Diagnostik:
`https://USERNAME.github.io/NAMA-REPO/diagnostics.html`

## E. Membuat Super Admin pertama

1. Buka `bootstrap-admin.html` segera setelah deploy.
2. Email harus `arjune@gandekan.id`.
3. Masukkan password admin yang telah Anda tentukan.
4. Klik **Buat Akun Firebase Admin**.
5. Buka inbox email tersebut dan verifikasi.
6. Kembali ke halaman setup → **Login Setelah Verifikasi Email**.
7. Klik **Aktifkan SUPER_ADMIN**.
8. Klik **Isi Data Awal RT**.

Password tidak pernah ditulis di file GitHub.

## F. Register warga

Warga membuka Akun Warga → Register:
- NIK 16 digit
- Nama
- Email
- WhatsApp
- Password

Firebase mengirim email verifikasi. Akun Firestore berstatus `MENUNGGU`. Admin membuka Dashboard → **Akun Warga** → Setujui. Setelah status `AKTIF` dan email terverifikasi, warga dapat login.

## G. Notifikasi update otomatis

Saat admin menyimpan perubahan bermakna pada:
- `RONDA_JADWAL`
- `POSYANDU`
- `KEGIATAN`

Frontend admin otomatis menulis dokumen pada koleksi `notifications`. Pusat notifikasi dan badge warga berubah realtime. Jika FCM aktif, V6 juga meminta Apps Script mengirim push ke token perangkat.

## H. Penyimpanan Drive

Apps Script otomatis membuat:

```text
RT01_RW04_DIGITAL/
  Pengurus/YYYY/MM/
  Ronda/YYYY/MM/Dokumentasi/
  Posyandu/YYYY/MM/
  Kegiatan/YYYY/MM/
  Aduan/YYYY/MM/
  Asset/YYYY/MM/
  Dokumen/YYYY/MM/
  Surat/YYYY/MM/
  Laporan/YYYY/MM/
  Signature/YYYY/MM/
  Branding/YYYY/MM/
  Warga/YYYY/MM/
```

File publik seperti foto pengurus/kegiatan/aset dapat diberi link publik. File sensitif seperti aduan, tanda tangan, dan dokumentasi ronda tetap private.
