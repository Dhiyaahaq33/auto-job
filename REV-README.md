# TUKANG LAMAR OTOMATIS
### AUTO JOB APPLY BOT (D:\BOT\AUTO JOB)

---

## Apa Ini?

Ini adalah bot yang melamar kerja secara otomatis buat kamu. Jadi daripada capek-capek buka LinkedIn, Indeed, Jobstreet, Glints, dan Kalibrr satu-satu terus isi form lamaran manual, bot ini yang jalanin browser (pakai Selenium), cari lowongan, isi data diri, upload CV, dan submit lamaran — semuanya otomatis, terjadwal, dan bisa jalan terus-menerus di server (misalnya Railway).

Semua logika ada dalam satu file Python (`job_bot.py`), gaya single-file seperti bot-bot lain di folder BOT ini.

## Fitur Utama

- Auto-apply ke 5 platform lowongan kerja sekaligus: LinkedIn, Indeed, Jobstreet, Glints, Kalibrr
- Pakai `undetected-chromedriver` supaya tidak gampang terdeteksi sebagai bot oleh website
- Isi otomatis data diri (nomor HP, lokasi) dan upload CV (`cv.pdf`)
- Batas jumlah lamaran per hari (anti-spam / anti-banned)
- Delay acak antar aksi supaya perilakunya terlihat seperti manusia
- Bisa dijadwalkan otomatis (pakai library `schedule`) untuk jalan di jam tertentu tiap hari
- Logging rapi pakai `loguru`
- Siap deploy ke Railway (worker process, bukan web server)

## Teknologi yang Dipakai

- Python
- Selenium + undetected-chromedriver (kontrol browser)
- BeautifulSoup (parsing halaman web)
- python-dotenv (baca konfigurasi dari file `.env`)
- schedule (penjadwalan otomatis)
- fake-useragent, loguru

## Cara Instalasi

1. Pastikan Python sudah aktif (di laptop ini pakai Python 3.11 di `C:\Users\izayy\AppData\Local\Programs\Python\Python311`).
2. Buka folder proyek:
   ```powershell
   cd "D:\BOT\AUTO JOB"
   ```
3. (Disarankan) buat virtual environment dulu:
   ```powershell
   python -m venv venv
   venv\Scripts\activate
   ```
4. Install semua library yang dibutuhkan (belum ada `requirements.txt`, jadi install manual sesuai yang tertulis di dalam file `job_bot.py`):
   ```powershell
   pip install selenium playwright requests beautifulsoup4 python-dotenv schedule undetected-chromedriver fake-useragent loguru
   ```
5. Google Chrome harus sudah terpasang di laptop (dipakai sebagai browser otomatis oleh Selenium). Kalau belum ada, install lewat winget:
   ```powershell
   winget install Google.Chrome
   ```
6. Buat file `.env` di folder ini berisi kredensial login kamu, contoh:
   ```
   EMAIL=email_kamu@gmail.com
   PASSWORD=password_kamu
   LINKEDIN_EMAIL=
   LINKEDIN_PASS=
   INDEED_EMAIL=
   GLINTS_EMAIL=
   ```
   (Belum ada file `.env.example` di folder ini — bikin sendiri file `.env` baru berdasarkan variabel-variabel di atas.)
7. Taruh file CV kamu dengan nama `cv.pdf` di folder yang sama dengan `job_bot.py`.

## Cara Menjalankan

```powershell
python job_bot.py
```

Bot akan langsung jalan dan menjadwalkan proses lamar-melamar otomatis sesuai jam yang diatur di dalam script.

Kalau mau deploy ke Railway supaya jalan terus 24 jam tanpa laptop nyala:
1. Push folder ini ke GitHub repo
2. Di Railway, buat project baru dari repo tersebut, pilih buildpack `heroku/python`
3. Set semua environment variable (EMAIL, PASSWORD, dll) di dashboard Railway
4. Tambahkan file `Procfile` berisi: `worker: python job_bot.py`

## Catatan Penting

- **Tidak ada file `.env` atau `.env.example` yang tersimpan di folder ini** — jadi tidak ada kredensial yang bocor di proyek ini. Tapi HARUS diingat: begitu kamu bikin file `.env` sendiri berisi email/password asli, JANGAN sampai ke-commit ke Git (folder ini sudah punya `.gitignore`, tapi tetap cek dulu isinya meng-exclude `.env`).
- Otomatisasi melamar kerja di LinkedIn/Indeed dkk berpotensi melanggar Terms of Service platform tersebut — akun bisa kena banned/suspend kalau terdeteksi bot. Gunakan dengan hati-hati dan batasi jumlah lamaran per hari.
- Belum ada `requirements.txt` di folder ini — sebaiknya dibuatkan supaya instalasi lebih mudah ke depannya.

## Kebutuhan API LLM

- **Butuh API LLM?** Tidak untuk fitur yang ada sekarang — `job_bot.py` murni automation Selenium buat isi form lamaran otomatis, tidak ada pemrosesan bahasa alami. Tapi ini berpotensi ditingkatkan pakai LLM buat generate jawaban screening question/cover letter otomatis.
- **Bisa pakai API Claude (Anthropic)?** Belum dipakai saat ini, tapi kalau mau tambah fitur generate jawaban essay/cover letter otomatis, Claude Haiku 4.5 cocok (cepat & murah) buat isi jawaban singkat, atau Claude Sonnet 5 untuk cover letter yang lebih personal.

## Instalasi & Eksekusi Offline

- **Bisa instalasi offline?** Tidak — `pip install selenium playwright requests beautifulsoup4 python-dotenv schedule undetected-chromedriver fake-useragent loguru` dan `winget install Google.Chrome` sama-sama butuh internet untuk narik package/installer. Setelah pernah terinstall sekali, ada peluang install ulang dari pip cache lokal, tapi belum tentu semua dependency ke-cache lengkap (terutama `undetected-chromedriver` yang kadang download driver Chrome tambahan saat runtime).
- **Bisa dijalankan offline (setelah terinstall)?** Tidak — fungsi utama bot ini adalah membuka browser dan melamar kerja lewat situs LinkedIn, Indeed, Jobstreet, Glints, dan Kalibrr secara live, jadi wajib online setiap kali dijalankan. Tanpa internet, Selenium/Chrome tidak bisa memuat halaman apapun dan bot langsung gagal di langkah pertama.
