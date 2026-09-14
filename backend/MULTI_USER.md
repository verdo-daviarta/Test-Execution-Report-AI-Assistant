# Multi-user lokal: satu workspace bersama

## Konsep

Empat akun lokal: `qa1`, `qa2`, `qa3`, `qa4`.
Semua memakai metode autentikasi yang sama dan permission `member`.
Password setiap akun berbeda dan dibuat acak; tidak ada password default di source.

Setiap anggota dapat generate (Gemini/OpenAI), membaca History/Project,
membuat, mengedit, menghapus, dan mengekspor data. Semua berbagi workspace yang sama.
Belum ada workspace privat, pemisahan tim, admin, registrasi publik, atau pembatasan per Project.
Label `workspaceId: shared` adalah identitas workspace tunggal, bukan implementasi membership multi-team.

## Alur

1. Browser membuka aplikasi dan memeriksa `GET /api/auth/me`.
2. Jika session tidak tersedia, halaman login tampil; UI workspace belum dimuat.
3. `POST /api/auth/login` memverifikasi username/password di server.
4. Server mengirim cookie session opaque, HttpOnly, SameSite=Strict, berlaku absolut 8 jam.
5. API client mengirim cookie otomatis dan CSRF token pada header untuk operasi perubahan data.
6. Logout menghapus session di SQLite dan cookie browser. Login ulang merotasi session browser tersebut.

`GET /api/auth/me` mengembalikan user, CSRF token, dan waktu kedaluwarsa, bukan token session atau hash password.
Token session hanya tersedia pada cookie HttpOnly; database menyimpan digest SHA-256 token.
Password disimpan dengan salted scrypt (N=32768, r=8, p=3), bukan plaintext.
Pilihan ini mengikuti [profil scrypt OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Cookie mengikuti prinsip [session management OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Akun awal

Pada checkout ini, akun sudah dibuat melalui:

```powershell
npm.cmd run setup-users
```

Pada instalasi baru, jalankan sekali dari root repository.
Perintah ini menambahkan tabel autentikasi tanpa menghapus History/Project.
Jika user sudah ada, perintah berhenti tanpa mengubah password.
Jangan gunakan `npm run seed` untuk membuat akun: seed data lama mengganti History/Project.

Password awal tersedia hanya di:

```text
data/initial-user-credentials.txt
```

File ini berisi credential sensitif dalam plaintext untuk distribusi awal.
Tidak disertakan dalam Git, tidak dicetak ke terminal, dan diblokir dari Vite file server.
Buka sendiri melalui editor, bagikan setiap akun kepada pemiliknya lewat kanal privat,
simpan di password manager, lalu hapus file setelah distribusi.
Pembatasan akses file tetap bergantung pada ACL Windows host; jangan menaruhnya di folder yang dibagikan.
Password reset mandiri dan perubahan password melalui UI belum termasuk tahap ini.

## Menjalankan

```powershell
Set-Location "D:\Test-Execution-Report-AI-Assistant"
npm.cmd run dev
```

Jika npm belum dikenali, tambahkan lokasi Node.js ke PATH sesuai instalasi mesin Anda.
Buka `http://localhost:3000`, lalu login menggunakan salah satu akun.
Restart proses lama agar API lama yang belum memakai autentikasi tidak tetap berjalan.

Untuk mencoba dua akun bersamaan, gunakan dua perangkat, dua profil browser, atau jendela incognito.
Tab pada profil browser yang sama berbagi cookie login. Identitas diperiksa ulang saat kembali ke tab;
session kedaluwarsa atau HTTP 401 mengembalikan UI ke login.

## Proteksi yang disertakan

- Semua API kecuali login memerlukan session aktif; key API lama tidak dapat menggantikan login.
- Semua mutation memerlukan header aplikasi dan CSRF token, kecuali login yang memakai header aplikasi dan pemeriksaan Origin.
- Percobaan login dibatasi: 10 per username dan 20 per IP dalam 15 menit, tersimpan di SQLite; respons 429 menyertakan Retry-After.
- Maksimum 4 pemeriksaan password berjalan bersamaan.
- Payload login maksimum 8 KiB; endpoint lain mempertahankan batas 12 MiB yang sudah ada.
- Error login generik dan response API no-store.
- `INTERNAL_API_KEY`/`VITE_INTERNAL_API_KEY` tidak lagi dipakai untuk autentikasi browser.
- Database, file credential, dan modul backend tidak boleh diunduh melalui Vite development server.

Development HTTP hanya untuk mesin/LAN tepercaya; HTTP tidak mengenkripsi password atau cookie di jaringan.
Untuk deployment gunakan HTTPS. Cookie Secure aktif ketika `NODE_ENV=production` atau `AUTH_COOKIE_SECURE=true`.
Jangan menonaktifkan Secure untuk mengakali production HTTP.
Jika memakai TLS reverse proxy, konfigurasi origin/proxy tepercaya harus dituntaskan sebelum deployment;
pemeriksaan Origin saat ini membandingkan protokol dan Host yang dilihat Express.

## Batas dan tahap selanjutnya

Nama tester pada case baru diambil dari session server saat penyimpanan, bukan dari nama kiriman browser/AI.
Nama tersebut disimpan sebagai snapshot dan dipertahankan saat pengguna lain membuka, mengedit,
atau menyalin case dari History ke Project. Case tambahan memakai nama pembuat case tambahan itu.
Kolom Nama Tester bersifat read-only; UI dan CSV tidak lagi mengisi nama tetap untuk nilai kosong.
Data lama tidak diubah otomatis karena pembuat aslinya belum tentu dapat dipulihkan.
Ini belum merupakan audit userId lengkap atau riwayat perubahan.

Rate limit API per user terautentikasi dipisahkan: generate AI 10, editing 120,
dan read 300 request per menit. Anggota pada IP yang sama tidak berbagi kuota user.
Limiter API ini in-memory per proses; deployment multi-instance memerlukan penyimpanan limiter bersama.
Rate limiting per team, validasi semua schema, redaction, dan secret management lanjutan tetap pekerjaan tahap kedua.
Belum ada audit pembuat/pengubah, notifikasi realtime, atau kontrol konflik edit.
Pengguna yang mengedit data sama secara bersamaan masih dapat saling menimpa perubahan terakhir.

## Pengujian

### Test case manual

Add New Test Case Row menambahkan draft lokal kosong tanpa request API atau AI.
Isi Test ID, Scenario Target, Execution Steps, Expected Outcome, lalu pilih coverage
POSITIVE, NEGATIVE, VALIDATION, atau BOUNDARY. Save Changes menyimpan ke database;
menutup halaman sebelum Save berhasil dapat menghilangkan draft.
Nama tester ditentukan dari session pembuat di server dan tidak dapat diedit.
Penanda isManual disimpan melalui migrasi kolom tambahan tanpa menghapus data lama.
Coverage hasil generate AI tetap read-only; coverage manual dapat diedit setelah reload.
Save hanya mengirim scenario project yang berubah, secara berurutan, bukan semua scenario sekaligus.
Jika salah satu request gagal, pengiriman berhenti dan draft tetap tersedia untuk retry.
Penyimpanan beberapa scenario belum merupakan satu transaksi atomik lintas request.
UI menunggu response sukses sebelum menampilkan konfirmasi dan menghormati Retry-After pada 429.

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Test HTTP menggunakan aplikasi API yang sama dengan server, SQLite in-memory,
hash password nyata, dan session cookie nyata. Provider AI memakai mock.
Pengujian UI mencakup render markup login/sidebar, API client, dan alur Add Row/Save dalam jsdom; bukan E2E browser nyata.
Test file server development memeriksa HTTP 403 untuk file sensitif.
