# The Fresh Laundry — Full-Stack Laundry Web Application, Customer Portal & Admin Dashboard

Aplikasi web pemesanan laundry profesional, pelacakan status waktu nyata, portal pelanggan, dan konsol administrasi operasional untuk **The Fresh Laundry**.

Dirancang untuk alur kerja deployment:
**Google AI Studio → GitHub → Supabase (PostgreSQL, Auth, RLS) → Vercel**

---

## 1. Keputusan Arsitektur Teknis (Architecture Decision)

Lingkungan runtime **Google AI Studio Build** menggunakan template proyek **React 19 + TypeScript + Vite 8 + Tailwind CSS v4** yang berjalan pada port `3000`. Sesuai aturan kompatibilitas pada spesifikasi:
- Proyek ini dibangun menggunakan arsitektur **React 19 + TypeScript + Vite + Supabase Client/Database** yang 100% kompatibel dengan pratinjau langsung Google AI Studio sekaligus siap di-deploy ke **Vercel** tanpa perubahan struktur build.
- Logika aplikasi dipisahkan secara tegas menjadi:
  - `src/types/domain.ts`: Definisi tipe data terstruktur (Pesanan, Layanan, Pembayaran, Profil, Alamat, Log Aktivitas).
  - `src/lib/pricing.ts`: Mesin kalkulasi harga otoritatif (validasi kuantitas minimum, add-ons, ongkos kirim, rekalkulasi berat aktual, dan state machine transisi status pesanan).
  - `src/lib/supabase.ts`: Integrasi klien Supabase PostgreSQL & Supabase Auth.
  - `src/context/AppContext.tsx`: Pengelola sesi, kontrol akses berbasis peran (RBAC Customer vs Admin), serta sinkronisasi data persisten.
  - `src/components/`: Komponen modular (`LandingPage`, `AuthView`, `OrderCreationFlow`, `CustomerPortal`, `AdminDashboard`, `BrandLogo`, `StatusIndicators`).
  - `supabase/migrations/0001_initial_schema.sql`: Skema lengkap database PostgreSQL, trigger pembuatan profil otomatis, kebijakan Row Level Security (RLS), indeks, dan data awal (seed).

---

## 2. Panduan Lengkap Deployment: Google AI Studio → GitHub → Supabase → Vercel

### Langkah 1 — Ekspor atau Sinkronisasi Proyek dari Google AI Studio ke GitHub
1. Di antarmuka Google AI Studio Build, klik tombol **Export / Download ZIP** atau fitur **Sync to GitHub** di pojok kanan atas.
2. Jika mengunduh ZIP, ekstrak folder proyek di komputer Anda.
3. Buat repositori baru di [GitHub](https://github.com/new) (misalnya `the-fresh-laundry`), biarkan kosong tanpa README awal.
4. Jalankan perintah Git berikut di terminal folder proyek Anda:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: The Fresh Laundry full-stack application"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/the-fresh-laundry.git
   git push -u origin main
   ```

### Langkah 2 — Menjaga Kerahasiaan Kredensial (Excluding Secrets from Git)
- File `.gitignore` sudah dikonfigurasi untuk mengabaikan `.env`, `.env.local`, dan `.env.production`.
- **JANGAN PERNAH** memasukkan kunci rahasia (`SUPABASE_SERVICE_ROLE_KEY`) ke dalam kode sumber atau mengunggah file `.env` ke GitHub. Gunakan `.env.example` hanya sebagai contoh nama variabel.

### Langkah 3 — Membuat dan Mengonfigurasi Proyek Supabase
1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan klik **New Project**.
2. Pilih organisasi, beri nama proyek `the-fresh-laundry`, buat kata sandi database yang kuat, dan pilih region terdekat (mis. **Southeast Asia - Singapore**).
3. Setelah proyek aktif, buka menu **Project Settings → API** dan salin:
   - `Project URL` → untuk variabel `VITE_SUPABASE_URL`
   - `anon` / `public` key → untuk variabel `VITE_SUPABASE_ANON_KEY`

### Langkah 4 — Menjalankan Migrasi Database PostgreSQL & Row Level Security (RLS)
1. Di Supabase Dashboard, buka menu **SQL Editor** di bilah kiri.
2. Klik **New Query**.
3. Salin seluruh isi file `supabase/migrations/0001_initial_schema.sql` dari proyek ini dan tempelkan ke SQL Editor.
4. Klik **Run**. Skrip ini akan membuat:
   - Tabel `profiles`, `user_roles`, `addresses`, `services`, `service_addons`, `orders`, `order_items`, `order_status_history`, `payments`, `business_settings`, dan `admin_activity_logs`.
   - Trigger otomatis `on_auth_user_created` yang memastikan setiap pendaftaran publik otomatis mendapat peran `customer` (tidak pernah bisa memilih `admin` sendiri).
   - Kebijakan **Row Level Security (RLS)** yang menjamin isolasi data antar pelanggan dan membatasi perubahan pembayaran/status hanya untuk Admin.

### Langkah 5 — Membuat Akun Admin Pertama Secara Aman
Pendaftaran dari halaman publik aplikasi selalu memberikan peran `customer`. Untuk menetapkan akun Anda sebagai **Admin Operasional**:
1. Daftar akun baru menggunakan email Anda melalui halaman **Masuk / Daftar** di aplikasi.
2. Buka **Supabase Dashboard → SQL Editor**, lalu jalankan perintah SQL berikut (ganti dengan alamat email Anda):
   ```sql
   UPDATE public.user_roles
   SET role = 'admin', updated_at = NOW()
   WHERE user_id = (
     SELECT id FROM public.profiles WHERE email = 'email-admin-anda@domain.com'
   );
   ```
3. Muat ulang aplikasi; akun Anda kini memiliki akses penuh ke **Dashboard Admin**.

### Langkah 6 — Mengonfigurasi Login Google OAuth (Opsional)
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru atau pilih proyek yang ada, lalu buka **APIs & Services → OAuth consent screen**.
3. Konfigurasikan layar persetujuan (User Type: External), isi nama aplikasi `The Fresh Laundry`, dan email dukungan.
4. Buka **Credentials → Create Credentials → OAuth client ID** (Application type: **Web application**).
5. Tambahkan **Authorized redirect URI** dari Supabase Anda:
   - `https://<PROJECT_REF_SUPABASE_ANDA>.supabase.co/auth/v1/callback`
6. Salin **Client ID** dan **Client Secret** dari Google Cloud, lalu buka **Supabase Dashboard → Authentication → Providers → Google**, aktifkan Google, dan tempelkan kredensial tersebut.
7. Di **Supabase Dashboard → Authentication → URL Configuration**:
   - Isi **Site URL** dengan URL produksi Vercel Anda (mis. `https://the-fresh-laundry.vercel.app`).
   - Tambahkan `http://localhost:3000/**` dan `https://*.vercel.app/**` ke daftar **Redirect URLs**.

### Langkah 7 — Deploy ke Vercel
1. Buka [Vercel Dashboard](https://vercel.com/new) dan masuk menggunakan akun GitHub Anda.
2. Pilih repositori `the-fresh-laundry` dan klik **Import**.
3. Vercel akan mendeteksi **Vite** secara otomatis:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Pada bagian **Environment Variables**, tambahkan variabel berikut:
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co` (Publik / Aman untuk Client)
   - `VITE_SUPABASE_ANON_KEY` = `<anon-public-key>` (Publik / Aman dengan RLS aktif)
   - `VITE_OAUTH_REDIRECT_URL` = `https://nama-proyek-anda.vercel.app`
5. Klik **Deploy**. Setelah pratinjau (Preview) berhasil diverifikasi, promosikan build ke **Production**.

---

## 3. Daftar Periksa Pengujian & Status Konfigurasi

### Fitur yang Telah Diimplementasikan
- [x] **Landing Page Bahasa Indonesia**: Navigasi responsif, Hero split, Keunggulan, Katalog Layanan dinamis, Tabel Harga transparan + Simulasi Estimasi Biaya, 6 Langkah Cara Kerja, Tentang Kami, FAQ interaktif, Kontak WhatsApp, Lokasi, dan Kebijakan Privasi/Ketentuan.
- [x] **Sistem Warna & Identitas Visual**: Deep Navy (`#102A67`), Royal Blue (`#3159D9`), Premium Purple (`#7452E8`), permukaan putih bersih (`#FFFFFF`), dan teks kontras terjaga (`#171B2C`) dengan logo vektor SVG khusus.
- [x] **Autentikasi & Pemisahan Peran (RBAC)**: Login email/password, pendaftaran pelanggan (terkunci pada peran `customer`), tombol Google OAuth Supabase, serta pemisahan ketat antara Portal Pelanggan dan Konsol Admin.
- [x] **Alur Pemesanan & Kalkulasi Otoritatif**: Validasi berat minimum per layanan, layanan tambahan (add-ons), aturan ongkos kirim gratis di atas batas transaksi, penyimpanan snapshot harga historis, serta pembedaan antara *Total Estimasi Awal* dan *Total Tagihan Akhir Terkonfirmasi*.
- [x] **Pelacakan Pesanan & Riwayat Audit**: Linimasa perubahan status lengkap beserta waktu dan nama petugas, serta perlindungan catatan internal admin agar tidak pernah bocor ke pelanggan.
- [x] **Dashboard Admin Lengkap**: Metrik nyata dari database, pencarian & filter pesanan, verifikasi timbangan aktual, pencatatan pembayaran (Belum Dibayar, Menunggu Verifikasi, Dibayar Sebagian, Lunas), CRUD layanan & harga, direktori pelanggan, log aktivitas admin, pengaturan bisnis, dan ekspor laporan CSV.

### Konfigurasi Eksternal yang Diperlukan Sebelum Produksi Penuh
- [ ] Menjalankan `supabase/migrations/0001_initial_schema.sql` pada proyek Supabase milik pemilik bisnis.
- [ ] Mengisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada pengaturan Environment Variables di Vercel.
- [ ] Mengonfigurasi Client ID & Secret Google Cloud jika ingin mengaktifkan tombol masuk Google OAuth secara langsung.
- [ ] Mengganti alamat contoh, nomor WhatsApp bisnis resmi, dan tarif layanan final melalui menu **Pengaturan & Layanan** di Dashboard Admin.
