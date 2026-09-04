# V6.1 — Keranjang Peminjaman Aset

## Alur warga
1. Buka Aset & Inventaris.
2. Klik **Tambah Keranjang** pada beberapa aset.
3. Buka Keranjang, atur jumlah setiap aset.
4. Isi satu periode, alamat, keperluan, dan tanda tangan.
5. Kirim. Semua item tersimpan sebagai satu dokumen `loans`.

## Surat resmi
Dashboard Admin → Peminjaman Aset → Preview / PDF. Surat memuat kop resmi, tabel seluruh aset, total biaya/deposit, kewajiban peminjam, dan tanda tangan Peminjam + Bendahara + Ketua RT.

## Agar tanda tangan muncul pada PDF
Di Dashboard Admin → Pengaturan, simpan ulang tanda tangan Bendahara dan Ketua RT setelah upgrade V6.1. Sistem akan menyimpan URL sekaligus Drive File ID sehingga Apps Script dapat memasukkan gambar tanda tangan private ke PDF.
