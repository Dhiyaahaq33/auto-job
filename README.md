# Auto Job Apply Bot

Bot Python single-file untuk otomatisasi lamaran kerja (auto apply) di beberapa platform loker sekaligus: **LinkedIn, Indeed, Jobstreet, dan Glints**. Bot menggunakan Selenium/undetected-chromedriver untuk membuka browser, login ke masing-masing platform, mencari lowongan berdasarkan kata kunci, lalu mengisi dan mengirim form lamaran secara otomatis (termasuk upload CV). Dukungan Kalibrr sudah disiapkan di konfigurasi tetapi belum diimplementasikan (dinonaktifkan secara default).

Cocok dijalankan di server/VPS (misalnya Railway) dengan mode headless dan penjadwalan harian otomatis.

## Fitur Utama

- **Multi-platform**: LinkedIn (Easy Apply), Indeed, Jobstreet, dan Glints dalam satu script.
- **Auto login** ke tiap platform menggunakan kredensial dari environment variable.
- **Pencarian lowongan** berdasarkan daftar kata kunci, tipe kerja, dan lokasi yang bisa dikustomisasi.
- **Auto isi form lamaran**: upload CV (PDF), isi nomor HP/lokasi, generate/isi cover letter, klik tombol Next/Submit secara otomatis.
- **Tracker anti-duplikat**: menyimpan riwayat lowongan yang sudah dilamar di `applied_jobs.json` agar tidak melamar dua kali ke lowongan yang sama.
- **Batas apply harian** (`max_apply_per_hari`) untuk menghindari deteksi/ban dari platform.
- **Perilaku menyerupai manusia**: delay acak antar aksi dan pengetikan karakter per karakter (bukan instan).
- **Anti-deteksi bot**: menggunakan `undetected-chromedriver`, menonaktifkan flag `navigator.webdriver`, dengan fallback ke Selenium biasa jika gagal.
- **Mode headless** untuk dijalankan di server tanpa GUI.
- **Penjadwalan otomatis** (harian, jam tertentu) menggunakan library `schedule`, atau bisa dijalankan sekali (`--sekarang`).
- **Cek status**: melihat jumlah lamaran hari ini dan total keseluruhan (`--status`).

## Tech Stack

- **Python 3**
- **Selenium** + **undetected-chromedriver** — otomasi browser
- **schedule** — penjadwalan job harian
- **python-dotenv** — memuat konfigurasi dari file `.env`
- **loguru** (opsional, fallback ke `logging` bawaan jika tidak terpasang) — logging
- Library pendukung lain yang disebut di dokumentasi script: `requests`, `beautifulsoup4`, `fake-useragent` (untuk pengembangan lanjutan/fitur scraping tambahan)

## Instalasi

1. Clone repo ini:
   ```bash
   git clone https://github.com/Dhiyaahaq33/auto-job.git
   cd auto-job
   ```
2. Install dependency:
   ```bash
   pip install selenium playwright requests beautifulsoup4 python-dotenv schedule undetected-chromedriver fake-useragent loguru
   ```
3. Siapkan file CV dengan nama `cv.pdf` di folder yang sama dengan `job_bot.py`.
4. (Opsional) Buat file `cover_letter.txt` di folder yang sama jika ingin memakai cover letter custom (jika tidak ada, bot akan generate otomatis dari template bawaan).
5. Buat file `.env` di root project dan isi variabel-variabel di bagian **Konfigurasi Environment Variable** di bawah.

## Cara Menjalankan

- Jalankan sekali secara langsung (tanpa jadwal):
  ```bash
  python job_bot.py --sekarang
  ```
- Jalankan dengan mode terjadwal (default, berjalan tiap hari sesuai `jam_mulai` di konfigurasi):
  ```bash
  python job_bot.py
  ```
- Cek status lamaran hari ini tanpa menjalankan bot:
  ```bash
  python job_bot.py --status
  ```

### Deploy di Railway (atau VPS Linux lainnya)

- Tambahkan buildpack `heroku/python`.
- Set semua environment variable yang dibutuhkan di dashboard Railway.
- Tambahkan `Procfile` berisi:
  ```
  worker: python job_bot.py
  ```

## Konfigurasi Environment Variable

Semua nilai berikut dibaca dari environment variable (bisa lewat file `.env` lokal atau dashboard Railway). Jangan pernah commit kredensial asli ke repo.

| Variable | Keterangan |
|---|---|
| `NAMA` | Nama lengkap pelamar |
| `EMAIL` | Email default (fallback untuk semua platform) |
| `PASSWORD` | Password default (fallback untuk semua platform) |
| `NO_HP` | Nomor HP yang diisi otomatis ke form lamaran |
| `LOKASI` | Lokasi/kota pelamar |
| `LINKEDIN_EMAIL` | Email akun LinkedIn |
| `LINKEDIN_PASS` | Password akun LinkedIn |
| `INDEED_EMAIL` | Email akun Indeed |
| `INDEED_PASS` | Password akun Indeed |
| `GLINTS_EMAIL` | Email akun Glints |
| `GLINTS_PASS` | Password akun Glints |

Selain kredensial, ada juga pengaturan non-secret di dalam `CONFIG` pada `job_bot.py` yang bisa diedit langsung sesuai kebutuhan, antara lain: daftar kata kunci pencarian kerja, tipe kerja, lokasi target, gaji minimum, batas apply per hari, jam mulai jadwal, mode headless, dan toggle aktif/nonaktif per platform.

## Catatan Penting

- Bot ini melakukan otomasi login dan pengiriman lamaran nyata ke situs pihak ketiga (LinkedIn, Indeed, Jobstreet, Glints). Gunakan dengan bijak dan pahami risiko pelanggaran Terms of Service masing-masing platform (potensi suspend/ban akun).
- Pastikan CSS selector di masing-masing bot (LinkedIn, Indeed, Jobstreet, Glints) tetap sesuai dengan struktur halaman terbaru situs — situs pihak ketiga bisa berubah sewaktu-waktu sehingga selector perlu disesuaikan ulang.
- File `applied_jobs.json` (tracker riwayat lamaran) dibuat otomatis saat bot pertama kali berjalan.
