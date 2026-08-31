# Kajian dan Rekomendasi Perbaikan — AI SIT Assistant

Dokumen ini disusun berdasarkan tinjauan langsung terhadap source code (server.ts, src/App.tsx, komponen React, dan utils/storage.ts). Setiap poin ditandai tingkat urgensinya.

**Catatan**: kode yang ditinjau saat ini masih memanggil Gemini API. Jika masih ada kode yang memanggil Gemini API lakukan migrasi ke OpenAI/GPT.

## 1. Persistensi Data Hanya di localStorage (Urgensi Tinggi)

Seluruh riwayat generate disimpan lewat `utils/storage.ts` dengan `localStorage`. Konsekuensinya, data hilang saat cache browser dibersihkan, tidak bisa diakses dari perangkat lain, dan tidak ada backup. Untuk tool yang dipakai tim QA secara berkelanjutan, ini adalah risiko kehilangan data kerja.

**Rekomendasi**: pindahkan penyimpanan ke database sederhana (SQLite untuk single-instance, atau PostgreSQL bila akan multi-user), dengan endpoint CRUD di server.ts menggantikan fungsi storage.ts saat ini.

## 2. Endpoint /api/generate Tidak Punya Autentikasi maupun Rate Limiting (Urgensi Tinggi)

Endpoint ini terbuka tanpa validasi identitas pemanggil dan tanpa pembatasan jumlah request. Siapa pun yang mengakses server bisa memicu pemanggilan OpenAI API berulang kali, menghabiskan kuota atau biaya API tanpa kendali.

**Rekomendasi**: tambahkan autentikasi minimal (API key internal atau session-based), serta rate limiting per user/IP menggunakan middleware seperti express-rate-limit.

## 3. Nama Model OpenAI yang Dipanggil Perlu Diverifikasi

Setelah migrasi, pastikan nama model OpenAI yang dipanggil di server.ts (misalnya `gpt-4o` atau varian lain) sesuai dengan model yang benar-benar aktif dan tersedia untuk akun API Anda. Penamaan model dan ketersediaannya bisa berubah, dan pemanggilan model yang tidak valid akan gagal di production meski berjalan mulus saat development dengan fallback mocker aktif.

**Rekomendasi**: verifikasi nama model di dokumentasi resmi OpenAI, pastikan model yang dipilih mendukung structured output (JSON schema) sekaligus input gambar (vision) karena aplikasi ini butuh keduanya, dan tambahkan penanganan error yang jelas ketika API mengembalikan model-not-found atau kombinasi fitur yang tidak didukung model tersebut.

## 4. Fallback Mocker Tidak Diberi Tanda ke Pengguna (Urgensi Sedang)

Ketika `OPENAI_API_KEY` kosong atau placeholder, server otomatis memakai `generateFallbackScenarios` yang menyusun test case dummy, namun response yang dikirim ke frontend formatnya identik dengan hasil AI sungguhan. Pengguna berpotensi mengira hasil dummy ini adalah keluaran AI yang valid.

**Rekomendasi**: sertakan flag seperti `isMock: true` pada response, lalu tampilkan badge peringatan di Result Editor supaya pengguna sadar hasil tersebut bukan dari model AI.

## 5. Tidak Ada Riwayat Perubahan pada Hasil Edit (Urgensi Sedang)

ResultEditor mengizinkan edit dan hapus scenario/test case secara langsung, lalu menimpa item lama lewat `updateHistoryItem`. Tidak ada jejak audit siapa mengubah apa dan kapan, serta versi sebelum edit tidak tersimpan.

**Rekomendasi**: simpan snapshot versi sebelumnya (atau minimal `lastEditedAt`) setiap kali `handleSaveResult` dipanggil, supaya perubahan bisa ditelusuri atau dibatalkan.

## 6. Potensi ID Collision pada Data yang Digenerate Cepat

ID untuk history, scenario, dan test case dibentuk memakai `Date.now()` (contoh: `gen-${Date.now()}`, `tc-gen-${idx}-${cIdx}-${Date.now()}`). Jika beberapa item dibuat dalam milidetik yang sama, ID bisa bertabrakan.

**Rekomendasi**: ganti dengan `crypto.randomUUID()` yang lebih andal untuk keunikan ID.

## 7. Payload Screenshot Base64 Dikirim Utuh ke Server

Body limit di Express diset `50mb` untuk mengakomodasi screenshot base64 hingga 10MB dari sisi client. Ini cukup besar untuk request bolak-balik dan berpotensi lambat pada koneksi terbatas, apalagi tanpa kompresi gambar di sisi client sebelum upload.

**Rekomendasi**: kompres/resize gambar di browser sebelum dikirim (misalnya dibatasi ke lebar maksimum tertentu), dan pertimbangkan upload terpisah ke storage lalu kirim referensi URL, bukan base64 penuh dalam body JSON.

## 8. Belum Ada Skema Multi-User atau Kolaborasi Tim

Seluruh desain, dari penyimpanan lokal sampai tidak adanya konsep akun, mengasumsikan satu pengguna per browser. Untuk tim QA yang biasanya berbagi hasil test case satu sama lain, ini membatasi kegunaan aplikasi sebagai tool kolaboratif.

**Rekomendasi**: jika target penggunaan memang tim, ini yang paling perlu direncanakan lebih dulu sebelum investasi di fitur lain, karena berdampak ke seluruh arsitektur penyimpanan dan autentikasi.

## 9. Tidak Ditemukan Automated Test untuk Aplikasi Sendiri

Tidak ada file test (unit maupun integration) di dalam project, baik untuk endpoint `/api/generate` maupun komponen React. Ironis untuk aplikasi yang tujuannya membantu proses testing.

**Rekomendasi**: tambahkan minimal test untuk fungsi kritikal seperti `generateFallbackScenarios` dan `utils/storage.ts`, menggunakan Vitest yang kompatibel dengan stack Vite yang sudah dipakai.

## 10. Dialog Native Browser untuk Konfirmasi Regenerate

`handleRegenerate` di App.tsx memakai `confirm()` bawaan browser untuk konfirmasi sebelum menimpa hasil edit. Dialog native ini tidak bisa distyle, memblokir thread, dan pengalamannya terasa berbeda dari desain UI Tailwind yang sudah rapi di seluruh aplikasi.

**Rekomendasi**: ganti dengan modal konfirmasi kustom yang konsisten dengan desain sistem aplikasi.

## 11. Pertimbangan Teknis Migrasi dari Gemini ke OpenAI (Urgensi Tinggi, khusus proses migrasi)

Berdasarkan kode saat ini di server.ts, ada beberapa hal yang tidak bisa dipindah 1:1 dan perlu disesuaikan saat migrasi berlangsung.

- **Format structured output berbeda.** Kode sekarang memakai `responseSchema` dengan tipe dari `@google/genai` (`Type.OBJECT`, `Type.ARRAY`, dst). Di OpenAI, skema serupa didefinisikan lewat `response_format` dengan `json_schema` mengikuti standar JSON Schema biasa, sehingga seluruh definisi schema scenarios/testCases perlu ditulis ulang, bukan sekadar ganti nama package.
- **Cara mengirim gambar berbeda.** Saat ini screenshot dikirim sebagai `inlineData` dengan `mimeType` dan `data` base64 di dalam `parts`. Di OpenAI, gambar dikirim sebagai bagian dari `content` pada message user dengan tipe `image_url`, formatnya perlu disesuaikan termasuk cara membungkus data URL base64-nya.
- **Nama environment variable perlu konsisten.** Pastikan seluruh referensi `GEMINI_API_KEY` di server.ts, `.env.example`, dan pengecekan placeholder diganti total ke `OPENAI_API_KEY`, termasuk pesan warning di console yang saat ini masih menyebut Gemini.
- **Perilaku fallback mocker perlu diuji ulang.** Logika `generateFallbackScenarios` tidak bergantung pada provider AI manapun jadi seharusnya tetap berfungsi, tapi kondisi pengecekan placeholder key di baris pertama endpoint perlu diverifikasi ulang supaya tidak salah mendeteksi key OpenAI sebagai placeholder.

**Rekomendasi**: lakukan migrasi ini sebagai satu perubahan terisolasi di server.ts saja (tanpa menyentuh frontend, karena kontrak response JSON ke frontend tetap sama), lalu uji end-to-end dengan minimal satu contoh screenshot nyata sebelum dianggap selesai.

---

## Ringkasan Prioritas

| Prioritas | Item |
|---|---|
| Tinggi | Persistensi data (#1), keamanan endpoint (#2), pertimbangan teknis migrasi ke OpenAI (#11) |
| Sedang | Verifikasi model AI (#3), transparansi mock (#4), audit trail edit (#5) |
| Rendah–Sedang | ID collision (#6), ukuran payload gambar (#7), automated test (#9), dialog konfirmasi (#10) |
| Strategis | Desain multi-user (#8), sebaiknya diputuskan sebelum poin lain dikerjakan lebih jauh |
