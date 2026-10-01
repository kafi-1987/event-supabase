# 📘 Panduan SIEVENT — Langkah demi Langkah (Mudah Sekali!)

**Bayangkan sebuah restoran:**
- 🍳 **Dapur** = Google Apps Script (`Kode.gs`) → tempat data dimasak dan disimpan di Google Sheets.
- 🍽️ **Meja makan** = GitHub Pages (folder `sievent`) → tempat orang melihat tampilan website.

Kita bangun **dapur dulu**, baru **meja makan**. Kerjakan satu langkah, centang ✅, baru lanjut.

---

## BAGIAN A — Membangun Dapur (Google Apps Script)

**A1.** Buka https://script.google.com lalu klik **Proyek baru** (New project).

**A2.** Di sisi kiri ada file `Code.gs`. Klik namanya → ganti nama jadi `Kode`.

**A3.** Buka file **Kode.gs** yang saya berikan (klik kanan → buka dengan Notepad). Tekan **Ctrl+A** (pilih semua) → **Ctrl+C** (salin).

**A4.** Kembali ke editor Apps Script. Hapus semua isi lama, lalu **Ctrl+V** (tempel). Klik ikon 💾 **Simpan**.

**A5. Jalankan setup — HANYA SEKALI!**
1. Di bagian atas ada kotak pilihan fungsi. Pilih **setupAppEnvironment**.
2. Klik ▶ **Jalankan**.
3. Muncul kotak izin → klik **Tinjau izin** → pilih akun Google Anda → **Lanjutan** → **Buka (tidak aman)** → **Izinkan**. (Aman kok, ini skrip milik Anda sendiri.)
4. Tunggu sampai di bawah muncul tulisan **✅ Selesai!**

> ⚠️ Jangan klik Jalankan dua kali. Kalau terlanjur, hapus folder `📁 SIEVENT` di Google Drive, lalu ulangi A5.

**A6.** Cek Google Drive Anda: ada folder **📁 SIEVENT** berisi file **🗃️ Database SIEVENT**. Buka file itu → ada 8 tab (Kegiatan, Peserta, dst). Berhasil! 🎉

**A7. Buka pintu dapur (Deploy):**
1. Klik **Terapkan** (Deploy) → **Penerapan baru** (New deployment).
2. Klik ikon ⚙ → pilih **Aplikasi web**.
3. **Jalankan sebagai:** *Saya (Me)*. **Yang memiliki akses:** *Siapa saja (Anyone)*.
4. Klik **Terapkan** → **salin URL** yang berakhiran `/exec`. Simpan di Notepad!

**A8.** Tes: tempel URL itu di browser, tambahkan `?action=listEvents` di ujung. Kalau muncul tulisan `{"success":true,...` → dapur siap. ✅

*(Opsional, untuk e-sertifikat PDF: buat Google Slides **landscape** berisi teks `{{nama}}`, `{{kegiatan}}`, `{{tanggal}}`, `{{nomor}}`, `{{kode}}`. Salin ID-nya dari URL (teks panjang di antara `/d/` dan `/edit`), tempel ke tab **AppConfig** → baris `TEMPLATE_DEFAULT_ID`.)*

**A9. Pasang "alarm" otomatis (untuk membuat & mengirim sertifikat bertahap).**
1. Pilih fungsi **pasangTrigger** → klik ▶ **Jalankan** (cukup sekali).
2. Selesai! Mulai sekarang, setiap 10 menit komputer Google akan membuat PDF sertifikat dan mengirimnya ke email peserta, sedikit demi sedikit, supaya kuota email harian tidak habis.

> 💡 Pembukaan & penutupan pendaftaran/presensi **tidak butuh alarm**: sistem membaca jam WITA setiap kali halaman dibuka, jadi otomatis tepat waktu.

**A10. Sudah pernah memasang versi sebelumnya?** Tidak perlu `setupAppEnvironment` lagi (jangan diulang!). Cukup: hapus isi lama `Kode.gs` → tempel `Kode.gs` yang baru → Simpan → jalankan `pasangTrigger` → **Terapkan → Kelola penerapan → ✏ → Versi baru → Terapkan**. Lalu unggah ulang folder `sievent` dengan perintah di bagian "Cara Update".

**A11. Aktifkan "pemanas" supaya cepat (WAJIB setelah update ini).**
1. Di editor Apps Script pilih fungsi **pasangTrigger** → ▶ **Jalankan** (boleh diulang, tidak membuat alarm ganda).
2. Sekarang ada dua alarm: sertifikat (tiap 10 menit) dan **warmCache** (tiap 1 menit) yang menyiapkan daftar kegiatan lebih dulu, jadi pengunjung pertama tidak menunggu Google membaca Sheets.
3. Setelah deploy ulang (**Terapkan → Kelola penerapan → ✏ → Versi baru**), tunggu 1–2 menit lalu coba.

**Cara mengukur sendiri:** buka situs → tekan F12 → tab **Network** → muat ulang (Ctrl+Shift+R). Lihat baris `exec?action=listEvents`: kolom *Time* = waktu server. Muat ulang sekali lagi: data kini tampil dari penyimpanan browser (hampir seketika), dan data baru diambil diam-diam di belakang.

---

## BAGIAN B — Isi Alamat Dapur di Meja Makan

**B1.** Ekstrak file **sievent.zip** (klik kanan → *Extract All*). Muncul folder **`sievent`**.

**B2.** Buka `sievent` → `js` → klik kanan **config.js** → buka dengan Notepad.

**B3.** Ubah baris ini, tempel URL `/exec` dari A7 di antara tanda kutip:
```js
const GAS_URL = "https://script.google.com/macros/s/XXXX/exec";
```
Simpan (**Ctrl+S**).

---

## BAGIAN C — Pasang Meja Makan (GitHub Pages)

**C1. Pasang Git.** Buka https://git-scm.com/download/win → unduh → install, klik **Next** terus (pengaturan bawaan sudah benar).

**C2. Buat akun GitHub** di https://github.com (kalau belum punya). Username Anda akan jadi bagian alamat website.

**C3. Kenalkan diri ke Git (cukup sekali seumur komputer).** Buka **PowerShell**, ketik satu per satu, tekan Enter:
```powershell
git config --global user.name "Nama Anda"
git config --global user.email "email@akun-github-anda.com"
```

**C4. Buat "gudang" (repository).** Di github.com klik **+** → **New repository**.
- Nama: `sievent`
- Pilih **Public**
- ❌ **JANGAN** centang README / .gitignore / license
- Klik **Create repository**. Biarkan halamannya terbuka.

**C5. Masuk ke folder yang BENAR.** 🚨 Bagian paling sering salah!
1. Buka File Explorer, masuk ke folder **`sievent`** (yang ada `index.html` di dalamnya).
2. Klik kotak alamat di atas, ketik `powershell`, tekan Enter.
3. Ketik `dir` lalu Enter. **Harus terlihat `index.html`, `css`, dan `js`.**
   - Kalau yang terlihat `backend` / `frontend` → Anda terlalu tinggi. Masuk satu folder ke dalam.
   - Kalau ada file berakhiran `.gs` → pindahkan keluar (jangan ikut ke GitHub).

**C6. Kirim ke GitHub — satu perintah, tunggu hasilnya:**
```powershell
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/sievent.git
git push -u origin main
```
(Ganti `USERNAME` dengan username GitHub Anda. Perhatikan titik setelah `git add`.)

**C7. Saat diminta Password:** GitHub tidak menerima password biasa, harus **Token**.
1. Buka https://github.com/settings/tokens → **Generate new token (classic)**.
2. Note: `git-push` · Expiration: `90 days` · centang ✅ **repo** → **Generate token**.
3. **Salin token** (`ghp_...`) — hanya tampil sekali!
4. Kembali ke PowerShell: Username = username GitHub, Password = **tempel token** (klik kanan).

> 💡 Saat menempel token, layar terlihat **kosong**. Itu NORMAL. Tekan Enter saja.

Berhasil kalau muncul `Writing objects: 100%` dan `[new branch] main -> main`. ✅

**C8. Nyalakan website:** di repo GitHub → **Settings** → **Pages** →
- Source: *Deploy from a branch*
- Branch: **main** · **/ (root)** → **Save**
- Centang ✅ **Enforce HTTPS**

Tunggu 1–2 menit, refresh. Alamat website Anda: `https://USERNAME.github.io/sievent/` 🎉

---

## BAGIAN D — Coba Website Anda

1. Buka alamat website. Kartu kegiatan harus muncul (data dari Google Sheets).
2. Klik kegiatan → **Daftar** → isi form → muncul ✓ **Pendaftaran Berhasil**. Cek tab **Peserta** di Sheets: datanya masuk!
3. Login admin: `#/login` → username `admin`, password `Admin#12345`.
4. **Ganti password:** masuk panel admin → menu **Pengaturan Sistem** → *Ganti Kata Sandi Admin*.

## Isi Menu Admin (ringkas)
- **Kelola Kegiatan:** tambah/ubah kegiatan, cover (unggah atau link), jadwal WITA, kuota, template Slides (otomatis ditolak jika portrait), duplikat, arsip, hapus.
- **Manajemen Peserta:** cari, tambah manual, batalkan, ekspor CSV.
- **Presensi:** lihat % kehadiran, tandai hadir manual.
- **Evaluasi:** ubah/tambah pertanyaan, salin dari kegiatan lain, lihat skor & komentar.
- **E-Sertifikat:** proses batch, kirim ulang, cabut/pulihkan.
- **Laporan:** 4 jenis laporan, ekspor CSV (bisa dibuka di Excel).
- **Pengaturan:** identitas, template default (kosong = dibuat otomatis), izin pembatalan, tambah akun admin, ganti kata sandi.
- **Waiting list:** kegiatan penuh menampilkan tombol *Masuk Waiting List*; kalau ada yang membatalkan, antrean tertua otomatis naik jadi peserta.
- **Broadcast:** menu Peserta → 📣 Broadcast (email memakai kuota harian yang sama dengan sertifikat; WhatsApp lewat tautan).
- **Kiosk QR (Presensi):** menu Presensi → *Buka Layar Kiosk*, tampilkan di layar meja registrasi. **Impor Zoom:** unggah CSV laporan peserta Zoom, email yang cocok ditandai hadir (waktu hadir = waktu impor).
- **Laporan berkala:** menu Laporan → aktifkan jadwal Jumat 17:00. ⚠ Buka Apps Script → ⚙ **Setelan Proyek** → *Zona waktu* → pilih **(GMT+08:00) Makassar**, supaya jam 17:00 benar-benar WITA.
- **Zona Bahaya** (Pengaturan): hentikan/aktifkan pemrosesan sertifikat, sinkronkan ulang struktur Sheets, bersihkan cache.
- **QR di sertifikat/kiosk** dimuat dari internet (cdnjs); tanpa internet, kotak QR tampil kosong.
- **Excel:** tombol *Unduh Excel (.xlsx)* butuh internet (memuat pustaka dari CDN).

## Cara Update
Ubah file → di PowerShell dalam folder `sievent`:
```powershell
git add .
git commit -m "Perubahan"
git push
```
Tekan **Ctrl+Shift+R** di browser kalau tampilan masih lama.

Jika kode `Kode.gs` diubah: **Terapkan → Kelola penerapan → ✏ → Versi baru → Terapkan**.

---

## 🆘 Kalau Ada Masalah

| Yang terlihat | Artinya | Obat |
|---|---|---|
| Ada pita kuning "MODE DEMO" | `GAS_URL` masih kosong | Isi `js/config.js` (B3), push ulang |
| Halaman 404 | Folder salah di-push | Di repo GitHub harus terlihat `index.html` di depan. Kalau tidak: ulangi C5 dari folder yang benar, lalu `git push -u origin main --force` |
| Halaman polos tanpa warna | Folder `css`/`js` tidak ikut | Jangan upload lewat tombol web GitHub; pakai C6 |
| `Password authentication is not supported` | Butuh token | Kerjakan C7 |
| `remote origin already exists` | Sudah tersambung | Lewati, langsung `git push` |
| `LF will be replaced by CRLF` | Hanya peringatan | Abaikan |
| Data kosong / "Failed to fetch" | Deploy belum "Anyone" atau URL salah | Ulangi A7, pastikan akses **Siapa saja**, tempel URL `/exec` baru |
