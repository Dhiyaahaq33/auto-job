"""
=============================================================
  AUTO JOB APPLY BOT - All-in-One
  Platforms: LinkedIn, Indeed, Jobstreet, Glints, Kalibrr
  Deploy: Railway VPS / Any Linux Server
  Author: Nova (AI Business Assistant)
=============================================================

SETUP:
  1. pip install -r requirements (lihat INSTALL section di bawah)
  2. Isi config di bagian CONFIG
  3. Taruh cv.pdf di folder yang sama
  4. python job_bot.py

INSTALL (jalankan di terminal):
  pip install selenium playwright requests beautifulsoup4 python-dotenv schedule undetected-chromedriver fake-useragent loguru

UNTUK RAILWAY:
  - Tambahkan buildpack: heroku/python
  - Set environment variables di Railway dashboard
  - Tambahkan Procfile: worker: python job_bot.py
"""

# ============================================================
# IMPORTS
# ============================================================
import os
import sys
import time
import json
import random
import logging
import schedule
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    import undetected_chromedriver as uc
except ImportError:
    print("[ERROR] Install dulu: pip install selenium undetected-chromedriver")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from loguru import logger
except ImportError:
    import logging as logger
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


# ============================================================
# CONFIG - EDIT BAGIAN INI
# ============================================================
CONFIG = {
    # --- Data Pribadi ---
    "nama_lengkap":     os.getenv("NAMA", "Nama Kamu"),
    "email":            os.getenv("EMAIL", "email@kamu.com"),
    "password":         os.getenv("PASSWORD", "passwordkamu"),
    "no_hp":            os.getenv("NO_HP", "08123456789"),
    "lokasi":           os.getenv("LOKASI", "Jakarta"),
    "linkedin_email":   os.getenv("LINKEDIN_EMAIL", ""),
    "linkedin_pass":    os.getenv("LINKEDIN_PASS", ""),
    "indeed_email":     os.getenv("INDEED_EMAIL", ""),
    "indeed_pass":      os.getenv("INDEED_PASS", ""),
    "glints_email":     os.getenv("GLINTS_EMAIL", ""),
    "glints_pass":      os.getenv("GLINTS_PASS", ""),

    # --- Target Pekerjaan ---
    "kata_kunci":       ["Python Developer", "Backend Engineer", "Data Analyst"],  # Edit sesuai kebutuhan
    "tipe_kerja":       ["remote", "full-time"],   # remote / full-time / part-time
    "gaji_min":         5000000,   # dalam Rupiah (0 = tidak filter)
    "lokasi_kerja":     ["Jakarta", "Remote", "Surabaya"],

    # --- File ---
    "cv_path":          "./cv.pdf",
    "cover_letter_path": "./cover_letter.txt",  # opsional

    # --- Bot Settings ---
    "max_apply_per_hari":   30,     # Batas apply per hari (hindari ban)
    "delay_min_detik":      5,      # Jeda minimum antar aksi (detik)
    "delay_max_detik":      15,     # Jeda maksimum
    "headless":             True,   # True = tanpa browser GUI (untuk VPS)
    "run_schedule":         True,   # True = jalankan otomatis tiap hari
    "jam_mulai":            "09:00",# Format HH:MM

    # --- Platform Toggle ---
    "aktifkan_linkedin":    True,
    "aktifkan_indeed":      True,
    "aktifkan_jobstreet":   True,
    "aktifkan_glints":      True,
    "aktifkan_kalibrr":     False,  # Kalibrr perlu setup tambahan
}

# ============================================================
# COVER LETTER TEMPLATE (auto-generate jika file tidak ada)
# ============================================================
COVER_LETTER_TEMPLATE = """
Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position at {company_name}.

With my background in {skills}, I am confident in my ability to contribute meaningfully to your team.

I am particularly drawn to this opportunity because of the chance to {value_proposition}.
I am eager to bring my skills and passion to your organization.

Thank you for considering my application. I look forward to the opportunity to discuss how my background, skills, and enthusiasm can contribute to your team.

Best regards,
{nama}
""".strip()

# ============================================================
# TRACKER - Simpan history apply (hindari double apply)
# ============================================================
TRACKER_FILE = "applied_jobs.json"

def load_tracker():
    if Path(TRACKER_FILE).exists():
        with open(TRACKER_FILE, "r") as f:
            return json.load(f)
    return {"applied": [], "total_hari_ini": 0, "tanggal": str(datetime.now().date())}

def save_tracker(data):
    with open(TRACKER_FILE, "w") as f:
        json.dump(data, f, indent=2)

def sudah_diapply(tracker, job_id):
    return job_id in tracker["applied"]

def catat_apply(tracker, job_id, info=""):
    tracker["applied"].append(job_id)
    tracker["total_hari_ini"] += 1
    logger.info(f"✅ Applied: {job_id} | {info} | Total hari ini: {tracker['total_hari_ini']}")
    save_tracker(tracker)

def reset_daily_counter(tracker):
    today = str(datetime.now().date())
    if tracker["tanggal"] != today:
        tracker["total_hari_ini"] = 0
        tracker["tanggal"] = today
        save_tracker(tracker)
    return tracker

# ============================================================
# WEBDRIVER SETUP
# ============================================================
def buat_driver(headless=True):
    """Buat Chrome driver dengan anti-detection."""
    options = uc.ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-notifications")
    options.add_argument("--lang=id-ID")

    try:
        driver = uc.Chrome(options=options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver
    except Exception as e:
        logger.error(f"Gagal buat driver: {e}")
        logger.info("Mencoba fallback ke selenium biasa...")
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        return webdriver.Chrome(options=chrome_options)

def jeda(min_s=None, max_s=None):
    """Random delay untuk meniru perilaku manusia."""
    mn = min_s or CONFIG["delay_min_detik"]
    mx = max_s or CONFIG["delay_max_detik"]
    time.sleep(random.uniform(mn, mx))

def ketik_lambat(element, teks, delay=0.05):
    """Mengetik karakter per karakter seperti manusia."""
    element.clear()
    for char in teks:
        element.send_keys(char)
        time.sleep(random.uniform(0.03, delay))

def tunggu_element(driver, by, selector, timeout=10):
    try:
        return WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((by, selector))
        )
    except TimeoutException:
        return None

def klik_safe(driver, element):
    try:
        driver.execute_script("arguments[0].scrollIntoView(true);", element)
        time.sleep(0.5)
        element.click()
        return True
    except Exception:
        try:
            driver.execute_script("arguments[0].click();", element)
            return True
        except Exception as e:
            logger.warning(f"Gagal klik: {e}")
            return False

# ============================================================
# LINKEDIN BOT
# ============================================================
class LinkedInBot:
    def __init__(self, driver, tracker):
        self.driver = driver
        self.tracker = tracker
        self.logged_in = False

    def login(self):
        email = CONFIG["linkedin_email"] or CONFIG["email"]
        password = CONFIG["linkedin_pass"] or CONFIG["password"]
        if not email or not password:
            logger.warning("LinkedIn: Kredensial kosong, skip.")
            return False

        try:
            logger.info("LinkedIn: Login...")
            self.driver.get("https://www.linkedin.com/login")
            jeda(2, 4)

            email_field = tunggu_element(self.driver, By.ID, "username")
            if not email_field:
                return False
            ketik_lambat(email_field, email)

            pass_field = self.driver.find_element(By.ID, "password")
            ketik_lambat(pass_field, password)
            jeda(1, 2)

            pass_field.send_keys(Keys.RETURN)
            jeda(3, 5)

            if "feed" in self.driver.current_url or "mynetwork" in self.driver.current_url:
                logger.success("LinkedIn: Login berhasil!")
                self.logged_in = True
                return True
            else:
                logger.warning("LinkedIn: Login gagal atau perlu verifikasi manual.")
                return False
        except Exception as e:
            logger.error(f"LinkedIn login error: {e}")
            return False

    def apply_easy_apply(self, keyword):
        if not self.logged_in:
            return

        logger.info(f"LinkedIn: Mencari '{keyword}'...")
        search_url = (
            f"https://www.linkedin.com/jobs/search/"
            f"?keywords={keyword.replace(' ', '%20')}"
            f"&f_AL=true"  # Easy Apply filter
            f"&f_WT=2"     # Remote
        )
        self.driver.get(search_url)
        jeda(3, 5)

        jobs = self.driver.find_elements(By.CSS_SELECTOR, ".job-search-card")
        if not jobs:
            jobs = self.driver.find_elements(By.CSS_SELECTOR, "[data-job-id]")

        logger.info(f"LinkedIn: Ditemukan {len(jobs)} lowongan untuk '{keyword}'")

        for job in jobs[:10]:  # Max 10 per keyword
            if self.tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
                logger.warning("Batas apply harian tercapai.")
                return

            try:
                job_id = job.get_attribute("data-job-id") or job.get_attribute("data-entity-urn")
                if not job_id:
                    continue

                if sudah_diapply(self.tracker, f"linkedin_{job_id}"):
                    continue

                klik_safe(self.driver, job)
                jeda(2, 3)

                easy_apply_btn = tunggu_element(self.driver, By.CSS_SELECTOR, ".jobs-apply-button--top-card", timeout=5)
                if not easy_apply_btn:
                    continue

                btn_text = easy_apply_btn.text.lower()
                if "easy apply" not in btn_text and "lamar" not in btn_text:
                    continue

                klik_safe(self.driver, easy_apply_btn)
                jeda(2, 3)

                self._isi_form_linkedin()

                catat_apply(self.tracker, f"linkedin_{job_id}", keyword)
                jeda(3, 7)

            except Exception as e:
                logger.warning(f"LinkedIn: Gagal apply job {job_id}: {e}")
                continue

    def _isi_form_linkedin(self):
        """Isi form Easy Apply LinkedIn secara otomatis."""
        max_steps = 5
        for step in range(max_steps):
            jeda(1, 2)

            # Upload CV jika ada tombol upload
            try:
                upload_btn = self.driver.find_element(By.CSS_SELECTOR, "input[type='file']")
                if upload_btn and Path(CONFIG["cv_path"]).exists():
                    upload_btn.send_keys(str(Path(CONFIG["cv_path"]).absolute()))
                    jeda(1, 2)
            except NoSuchElementException:
                pass

            # Isi field teks yang kosong
            try:
                inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='text']:not([value])")
                for inp in inputs:
                    placeholder = inp.get_attribute("placeholder") or ""
                    label = placeholder.lower()
                    if "phone" in label or "telepon" in label or "hp" in label:
                        ketik_lambat(inp, CONFIG["no_hp"])
                    elif "city" in label or "kota" in label or "location" in label:
                        ketik_lambat(inp, CONFIG["lokasi"])
                    jeda(0.3, 0.7)
            except Exception:
                pass

            # Cari tombol Next / Submit
            submitted = False
            for selector in ["button[aria-label='Submit application']",
                              "button[aria-label='Review your application']",
                              "button.artdeco-button--primary"]:
                try:
                    btn = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if btn and btn.is_displayed():
                        klik_safe(self.driver, btn)
                        jeda(1, 2)
                        submitted = True
                        break
                except NoSuchElementException:
                    continue

            if not submitted:
                break

            # Cek apakah sudah submitted
            if "application submitted" in self.driver.page_source.lower():
                logger.info("LinkedIn: Aplikasi terkirim!")
                # Tutup modal
                try:
                    close = self.driver.find_element(By.CSS_SELECTOR, "button[aria-label='Dismiss']")
                    klik_safe(self.driver, close)
                except Exception:
                    pass
                break


# ============================================================
# INDEED BOT
# ============================================================
class IndeedBot:
    def __init__(self, driver, tracker):
        self.driver = driver
        self.tracker = tracker
        self.logged_in = False

    def login(self):
        email = CONFIG["indeed_email"] or CONFIG["email"]
        password = CONFIG["indeed_pass"] or CONFIG["password"]

        try:
            logger.info("Indeed: Login...")
            self.driver.get("https://id.indeed.com/account/login")
            jeda(2, 4)

            email_field = tunggu_element(self.driver, By.ID, "ifl-InputFormField-3")
            if not email_field:
                email_field = tunggu_element(self.driver, By.CSS_SELECTOR, "input[type='email']")
            if email_field:
                ketik_lambat(email_field, email)

            jeda(1, 2)
            continue_btn = tunggu_element(self.driver, By.CSS_SELECTOR, "button[type='submit']")
            if continue_btn:
                klik_safe(self.driver, continue_btn)
                jeda(2, 3)

            pass_field = tunggu_element(self.driver, By.CSS_SELECTOR, "input[type='password']")
            if pass_field:
                ketik_lambat(pass_field, password)
                pass_field.send_keys(Keys.RETURN)
                jeda(3, 5)

            if "indeed.com" in self.driver.current_url and "login" not in self.driver.current_url:
                logger.success("Indeed: Login berhasil!")
                self.logged_in = True
                return True
        except Exception as e:
            logger.error(f"Indeed login error: {e}")
        return False

    def cari_dan_apply(self, keyword):
        logger.info(f"Indeed: Mencari '{keyword}'...")
        url = f"https://id.indeed.com/jobs?q={keyword.replace(' ', '+')}&l={CONFIG['lokasi']}&fromage=7"
        self.driver.get(url)
        jeda(3, 5)

        jobs = self.driver.find_elements(By.CSS_SELECTOR, ".job_seen_beacon")
        logger.info(f"Indeed: Ditemukan {len(jobs)} lowongan")

        for job in jobs[:8]:
            if self.tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
                return

            try:
                job_id = job.get_attribute("data-jk")
                if not job_id or sudah_diapply(self.tracker, f"indeed_{job_id}"):
                    continue

                title_el = job.find_element(By.CSS_SELECTOR, "h2.jobTitle span")
                job_title = title_el.text if title_el else keyword

                klik_safe(self.driver, job)
                jeda(2, 3)

                # Cari tombol apply
                apply_btn = None
                for sel in [".ia-continueButton", "button[id*='apply']", ".jobsearch-IndeedApplyButton-contentWrapper"]:
                    try:
                        apply_btn = self.driver.find_element(By.CSS_SELECTOR, sel)
                        if apply_btn and apply_btn.is_displayed():
                            break
                    except NoSuchElementException:
                        continue

                if not apply_btn:
                    continue

                klik_safe(self.driver, apply_btn)
                jeda(2, 3)

                # Isi form apply
                self._isi_form_indeed()
                catat_apply(self.tracker, f"indeed_{job_id}", job_title)
                jeda(3, 8)

            except Exception as e:
                logger.warning(f"Indeed: Error pada job: {e}")
                continue

    def _isi_form_indeed(self):
        """Isi form Indeed apply."""
        max_steps = 4
        for _ in range(max_steps):
            jeda(1, 2)

            # Upload CV
            try:
                file_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='file']")
                if Path(CONFIG["cv_path"]).exists():
                    file_input.send_keys(str(Path(CONFIG["cv_path"]).absolute()))
                    jeda(2, 3)
            except Exception:
                pass

            # Isi nomor HP
            try:
                phone_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='tel']")
                for inp in phone_inputs:
                    if not inp.get_attribute("value"):
                        ketik_lambat(inp, CONFIG["no_hp"])
            except Exception:
                pass

            # Klik Next / Continue / Submit
            advanced = False
            for sel in ["button[data-testid='continue-button']",
                        "button[type='submit']",
                        ".ia-continueButton",
                        "button.css-gu3h50"]:
                try:
                    btn = self.driver.find_element(By.CSS_SELECTOR, sel)
                    if btn and btn.is_displayed() and btn.is_enabled():
                        klik_safe(self.driver, btn)
                        jeda(1, 2)
                        advanced = True
                        break
                except Exception:
                    continue

            if not advanced:
                break

            if any(x in self.driver.page_source.lower() for x in ["application submitted", "lamaran terkirim", "thank you"]):
                logger.info("Indeed: Aplikasi terkirim!")
                break


# ============================================================
# JOBSTREET BOT
# ============================================================
class JobstreetBot:
    def __init__(self, driver, tracker):
        self.driver = driver
        self.tracker = tracker

    def cari_dan_apply(self, keyword):
        logger.info(f"Jobstreet: Mencari '{keyword}'...")
        url = f"https://www.jobstreet.co.id/id/{keyword.lower().replace(' ', '-')}-jobs"
        self.driver.get(url)
        jeda(3, 5)

        jobs = self.driver.find_elements(By.CSS_SELECTOR, "article[data-automation='normalJob']")
        if not jobs:
            jobs = self.driver.find_elements(By.CSS_SELECTOR, "[data-job-id]")

        logger.info(f"Jobstreet: Ditemukan {len(jobs)} lowongan")

        for job in jobs[:8]:
            if self.tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
                return

            try:
                job_id = job.get_attribute("data-job-id") or job.get_attribute("id")
                if not job_id or sudah_diapply(self.tracker, f"jobstreet_{job_id}"):
                    continue

                # Klik untuk buka job detail
                link = job.find_element(By.CSS_SELECTOR, "a[data-automation='jobTitle']")
                job_url = link.get_attribute("href")

                self.driver.execute_script("window.open(arguments[0]);", job_url)
                self.driver.switch_to.window(self.driver.window_handles[-1])
                jeda(2, 4)

                apply_btn = tunggu_element(self.driver, By.CSS_SELECTOR,
                                           "a[data-automation='job-detail-apply']", timeout=5)
                if apply_btn:
                    klik_safe(self.driver, apply_btn)
                    jeda(2, 3)

                    # Jobstreet akan redirect ke form apply
                    # Isi form dasar
                    self._isi_form()
                    catat_apply(self.tracker, f"jobstreet_{job_id}", keyword)

                self.driver.close()
                self.driver.switch_to.window(self.driver.window_handles[0])
                jeda(3, 6)

            except Exception as e:
                logger.warning(f"Jobstreet error: {e}")
                try:
                    if len(self.driver.window_handles) > 1:
                        self.driver.close()
                        self.driver.switch_to.window(self.driver.window_handles[0])
                except Exception:
                    pass
                continue

    def _isi_form(self):
        jeda(1, 2)
        # Upload CV jika ada
        try:
            file_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='file']")
            if Path(CONFIG["cv_path"]).exists():
                file_input.send_keys(str(Path(CONFIG["cv_path"]).absolute()))
                jeda(2)
        except Exception:
            pass

        # Submit
        try:
            submit = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            klik_safe(self.driver, submit)
            jeda(2)
        except Exception:
            pass


# ============================================================
# GLINTS BOT
# ============================================================
class GlintsBot:
    def __init__(self, driver, tracker):
        self.driver = driver
        self.tracker = tracker
        self.logged_in = False

    def login(self):
        email = CONFIG["glints_email"] or CONFIG["email"]
        password = CONFIG["glints_pass"] or CONFIG["password"]

        try:
            logger.info("Glints: Login...")
            self.driver.get("https://glints.com/id/login")
            jeda(2, 4)

            email_field = tunggu_element(self.driver, By.CSS_SELECTOR, "input[type='email']")
            if email_field:
                ketik_lambat(email_field, email)

            pass_field = tunggu_element(self.driver, By.CSS_SELECTOR, "input[type='password']")
            if pass_field:
                ketik_lambat(pass_field, password)
                pass_field.send_keys(Keys.RETURN)
                jeda(3, 5)

            if "glints.com" in self.driver.current_url and "login" not in self.driver.current_url:
                logger.success("Glints: Login berhasil!")
                self.logged_in = True
                return True
        except Exception as e:
            logger.error(f"Glints login error: {e}")
        return False

    def cari_dan_apply(self, keyword):
        logger.info(f"Glints: Mencari '{keyword}'...")
        url = f"https://glints.com/id/opportunities/jobs/explore?keyword={keyword.replace(' ', '%20')}&locationName=Indonesia"
        self.driver.get(url)
        jeda(3, 5)

        jobs = self.driver.find_elements(By.CSS_SELECTOR, ".JobCardsc__JobcardContainer")
        if not jobs:
            jobs = self.driver.find_elements(By.CSS_SELECTOR, "[data-gtm-job-id]")

        logger.info(f"Glints: Ditemukan {len(jobs)} lowongan")

        for job in jobs[:8]:
            if self.tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
                return

            try:
                job_id = job.get_attribute("data-gtm-job-id") or job.get_attribute("data-id")
                if not job_id or sudah_diapply(self.tracker, f"glints_{job_id}"):
                    continue

                klik_safe(self.driver, job)
                jeda(2, 3)

                apply_btn = tunggu_element(self.driver, By.CSS_SELECTOR,
                                           "button.ApplyButton", timeout=5)
                if not apply_btn:
                    continue

                klik_safe(self.driver, apply_btn)
                jeda(2, 3)

                # Isi cover letter jika diminta
                try:
                    cover_textarea = self.driver.find_element(By.CSS_SELECTOR, "textarea")
                    if cover_textarea and not cover_textarea.get_attribute("value"):
                        cl = _buat_cover_letter(keyword, "Perusahaan")
                        ketik_lambat(cover_textarea, cl[:500])
                except Exception:
                    pass

                # Submit
                try:
                    submit = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                    klik_safe(self.driver, submit)
                    jeda(2)
                except Exception:
                    pass

                catat_apply(self.tracker, f"glints_{job_id}", keyword)
                self.driver.back()
                jeda(3, 6)

            except Exception as e:
                logger.warning(f"Glints error: {e}")
                try:
                    self.driver.back()
                except Exception:
                    pass
                continue


# ============================================================
# UTILITY
# ============================================================
def _buat_cover_letter(job_title, company_name):
    """Generate cover letter dari template."""
    if Path(CONFIG["cover_letter_path"]).exists():
        with open(CONFIG["cover_letter_path"], "r") as f:
            return f.read()

    return COVER_LETTER_TEMPLATE.format(
        job_title=job_title,
        company_name=company_name,
        skills="software development dan problem solving",
        value_proposition="berkontribusi dan berkembang bersama tim",
        nama=CONFIG["nama_lengkap"]
    )

def cek_cv():
    """Pastikan CV ada sebelum mulai."""
    cv_path = Path(CONFIG["cv_path"])
    if not cv_path.exists():
        logger.warning(f"⚠️  CV tidak ditemukan di: {cv_path.absolute()}")
        logger.warning("Buat file cv.pdf di folder yang sama dengan script ini.")
        return False
    logger.info(f"✅ CV ditemukan: {cv_path.absolute()}")
    return True

def tampil_status(tracker):
    """Tampilkan status apply hari ini."""
    print("\n" + "="*50)
    print(f"📊 STATUS APPLY - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"   Total apply hari ini : {tracker['total_hari_ini']}")
    print(f"   Batas per hari       : {CONFIG['max_apply_per_hari']}")
    print(f"   Total semua waktu    : {len(tracker['applied'])}")
    print("="*50 + "\n")


# ============================================================
# MAIN RUNNER
# ============================================================
def jalankan_bot():
    """Fungsi utama untuk menjalankan semua bot."""
    logger.info("🚀 Memulai Auto Job Apply Bot...")

    tracker = load_tracker()
    tracker = reset_daily_counter(tracker)

    if tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
        logger.warning("Batas apply harian sudah tercapai. Coba lagi besok.")
        return

    cek_cv()

    kata_kunci = CONFIG["kata_kunci"]
    driver = None

    try:
        driver = buat_driver(headless=CONFIG["headless"])

        # ---- LinkedIn ----
        if CONFIG["aktifkan_linkedin"] and CONFIG.get("linkedin_email") or CONFIG.get("email"):
            li_bot = LinkedInBot(driver, tracker)
            if li_bot.login():
                for kw in kata_kunci:
                    if tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
                        break
                    li_bot.apply_easy_apply(kw)
                    jeda(5, 10)

        # ---- Indeed ----
        if CONFIG["aktifkan_indeed"]:
            indeed_bot = IndeedBot(driver, tracker)
            indeed_bot.login()
            for kw in kata_kunci:
                if tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
                    break
                indeed_bot.cari_dan_apply(kw)
                jeda(5, 10)

        # ---- Jobstreet ----
        if CONFIG["aktifkan_jobstreet"]:
            js_bot = JobstreetBot(driver, tracker)
            for kw in kata_kunci:
                if tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
                    break
                js_bot.cari_dan_apply(kw)
                jeda(5, 10)

        # ---- Glints ----
        if CONFIG["aktifkan_glints"] and CONFIG.get("glints_email") or CONFIG.get("email"):
            glints_bot = GlintsBot(driver, tracker)
            if glints_bot.login():
                for kw in kata_kunci:
                    if tracker["total_hari_ini"] >= CONFIG["max_apply_per_hari"]:
                        break
                    glints_bot.cari_dan_apply(kw)
                    jeda(5, 10)

    except KeyboardInterrupt:
        logger.info("Bot dihentikan manual.")
    except Exception as e:
        logger.error(f"Error tidak terduga: {e}")
    finally:
        if driver:
            driver.quit()

    tampil_status(tracker)
    logger.info("✅ Bot selesai dijalankan.")


# ============================================================
# ENTRY POINT
# ============================================================
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Auto Job Apply Bot")
    parser.add_argument("--sekarang", action="store_true", help="Jalankan sekarang tanpa jadwal")
    parser.add_argument("--status", action="store_true", help="Tampilkan status saja")
    args = parser.parse_args()

    if args.status:
        tracker = load_tracker()
        tampil_status(tracker)
        sys.exit(0)

    if args.sekarang or not CONFIG["run_schedule"]:
        jalankan_bot()
    else:
        # Mode terjadwal
        jam = CONFIG["jam_mulai"]
        logger.info(f"⏰ Bot akan berjalan setiap hari pukul {jam}")
        schedule.every().day.at(jam).do(jalankan_bot)

        # Jalankan sekali langsung saat start
        jalankan_bot()

        while True:
            schedule.run_pending()
            time.sleep(60)
