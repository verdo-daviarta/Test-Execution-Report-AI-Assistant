# Arsitektur aplikasi

Tahap ini memisahkan kode dalam satu aplikasi/proses, bukan deployment microservice.

```text
React UI
  -> src/utils/api.ts
  -> backend/routes/generation.ts
  -> backend/services/generation.ts
  -> backend/providers/contracts.ts
       -> openai.ts
       -> gemini.ts

History / Project API -> backend/routes/{history,projects}.ts -> SQLite
server.ts -> konfigurasi environment, dependency wiring, middleware, Vite/static, listen
shared/generation.ts -> kontrak request/response tanpa dependency SDK
```

## Tanggung jawab

- Frontend hanya mengirim HTTP melalui API client; tidak mengimpor SDK AI atau database.
- Route generation menangani HTTP dan pemetaan error, tanpa percabangan SDK/provider.
- Service memilih adapter per request, memvalidasi input/output, menyusun prompt bersama, dan menormalkan coverage.
- Adapter memetakan kontrak internal ke SDK, termasuk screenshot dan structured output. Konfigurasi key/model disuntikkan dari bootstrap server.
- Factory database berada di `backend/database.ts`. `src/database.ts` hanya compatibility entry point untuk seed lama.
- Route History/Project menerima koneksi database sebagai dependency. Query SQL tetap berada pada modul route tersebut pada tahap ini; pemisahan repository/service persistence dapat dilakukan berikutnya.
- Schema dan lokasi database lama dipertahankan: `data/test-execution-report.db`. Tidak perlu reseed.

## Kontrak dan perilaku

Provider tetap `openai` atau `gemini`, dipilih per request tanpa mengubah konfigurasi global.
Form dan konfigurasi lokal sekarang menggunakan Gemini sebagai default. OpenAI tetap dapat dipilih secara eksplisit; key yang ada tidak diubah.
Output generation berisi `scenarios`, `provider`, dan `isMock`.

Key provider kosong mempertahankan fallback lokal dengan `isMock: true`, tanpa delay buatan.
Error provider yang sudah dikonfigurasi tidak memicu perpindahan provider atau fallback diam-diam.
Input tidak valid menghasilkan HTTP 400; kegagalan provider/output tidak valid menghasilkan HTTP 502 tanpa membocorkan pesan SDK mentah.
Detail dan daftar History kini menggunakan representasi nested yang konsisten.

OpenAI tetap memakai Chat Completions Structured Outputs; tidak ada migrasi model atau API dalam refactor ini.
Referensi: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Batas multi-user

Empat user lokal memiliki permission member yang sama dalam satu workspace bersama.
`backend/app.ts` memasang autentikasi sebelum route data; login/logout dan session SQLite tersedia.
History/Project hanya dapat diakses setelah login, tetapi belum ada isolasi per tim/project.
Browser tidak lagi menggunakan shared `INTERNAL_API_KEY` atau nilai `VITE_*` untuk autentikasi.
Lihat [konsep, akun awal, dan batas keamanan multi-user](MULTI_USER.md).

Tahap selanjutnya perlu team/project membership, relasi History ke project,
otorisasi server pada setiap operasi, migrasi data lama, dan kontrol konflik penyuntingan.
Jangan menganggap refactor ini sudah mengisolasi data antar tim.

## Validasi

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Test adapter memakai SDK mock (tanpa jaringan/kuota AI).
Test HTTP memakai SQLite in-memory dan port loopback sementara, bukan database aplikasi.
Server development yang sudah berjalan perlu di-restart manual agar memuat refactor.
