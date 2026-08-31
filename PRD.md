# Product Requirements Document (PRD)

## 1. Ringkasan Produk

AI SIT Assistant adalah aplikasi web internal untuk membantu QA engineer atau SIT tester menyusun rancangan skenario dan test case System Integration Testing dari nama modul, requirement, business rules, pilihan coverage, dan screenshot UI opsional. Hasil AI dapat ditinjau, diedit, disimpan ke history browser, dan diekspor sebagai CSV yang kompatibel dengan spreadsheet.

## 2. Problem Statement

Penyusunan test case SIT secara manual membutuhkan waktu, rawan melewatkan variasi positive, negative, validation, atau boundary, dan menghasilkan format yang tidak konsisten. Aplikasi ini mempercepat pembuatan draft terstruktur, kemudian memberi QA kontrol untuk melakukan review dan koreksi sebelum hasil digunakan.

## 3. Target User

- QA engineer yang membuat cakupan SIT dari requirement dan aturan bisnis.
- SIT tester yang memerlukan langkah eksekusi dan expected result dalam format konsisten.

Tidak ada bukti di kode bahwa aplikasi telah mendukung akun, role-based access, kolaborasi, atau persetujuan formal.

## 4. Tujuan dan Non-Tujuan

### Tujuan

- Menghasilkan draft scenario dan test case berdasarkan input QA.
- Mendukung empat pilihan coverage: Positive, Negative, Validation, dan Boundary.
- Memungkinkan review, edit, tambah, hapus, dan pencarian scenario/test case.
- Menyimpan hasil pada history lokal browser dan mengekspornya ke CSV.

### Scope In

- Form generation dengan Module Name wajib; Requirement dan Business Rules opsional.
- Pemilihan coverage dengan default Positive dan Negative.
- Upload satu screenshot berformat image hingga 10 MB; dikirim sebagai base64 ke backend.
- Generate melalui `POST /api/generate`, termasuk fallback lokal saat API key OpenAI tidak tersedia.
- Editor hasil untuk mengubah field test case, menambah/menghapus baris, menambah/menghapus scenario, dan menyimpan perubahan.
- Regenerate berdasarkan parameter generation yang tersedia.
- History dengan pencarian, sorting berbasis ID, pagination lima item per halaman, membuka hasil, dan menghapus item.
- Export CSV untuk test case pada scenario aktif.

### Scope Out

- Login, autentikasi, otorisasi, dan audit trail.
- Database/server-side persistence, sinkronisasi antar-browser, dan kolaborasi multi-user.
- Import requirement dari sistem lain, integrasi test management, eksekusi test case, atau pelaporan defect.
- Jaminan bahwa output AI benar, lengkap, bebas duplikasi, atau siap dieksekusi tanpa review.
- Pengaturan Settings dan Support yang berfungsi; pada UI saat ini keduanya hanya tombol tampilan.
- Optimasi AI server-side: tombol optimizer saat ini melakukan rewrite lokal berbasis string, bukan panggilan model.

## 5. Alur Utama, User Stories, dan Acceptance Criteria

### A. Generate baru

**User story:** Sebagai QA, saya ingin memasukkan spesifikasi dan coverage agar mendapatkan draft SIT.

**Acceptance criteria:**

1. Pengguna tidak dapat submit bila Module Name kosong dan melihat pesan validasi.
2. Pengguna dapat mengisi requirement, business rules, coverage, dan screenshot opsional.
3. File non-image atau image di atas 10 MB ditolak.
4. Saat submit, aplikasi mengirim parameter ke `/api/generate` dan menampilkan loading screen.
5. Respons `scenarios` diubah menjadi `HistoryItem` berstatus `COMPLETED`, dihitung jumlah scenario/test case-nya, disimpan ke localStorage, lalu dibuka di Result Editor.
6. Bila server gagal, pengguna melihat pesan error dan hasil tidak dianggap berhasil.
7. Bila `OPENAI_API_KEY` tidak tersedia, server mengembalikan fallback lokal setelah delay simulasi dan menandainya sebagai mock.

### B. Review dan edit hasil

**User story:** Sebagai SIT tester, saya ingin mengoreksi hasil agar sesuai kebutuhan eksekusi.

**Acceptance criteria:**

1. Pengguna dapat memilih scenario, mencari berdasarkan nama/deskripsi, dan melihat tabel test case-nya.
2. Field `testId`, `scenario`, `step`, dan `expectedResult` dapat diedit inline.
3. Pengguna dapat menambah baris test case dan menghapus baris; setelah penghapusan, ID pada scenario aktif dinomori ulang.
4. Pengguna dapat menambah scenario dan menghapus scenario, tetapi tidak dapat menghapus scenario terakhir.
5. Save Changes memperbarui item yang sama di localStorage serta jumlah scenario/test case.
6. Perubahan yang belum disimpan tidak dijanjikan bertahan bila halaman ditutup atau item diganti.

### C. Regenerate

**User story:** Sebagai QA, saya ingin membuat ulang hasil ketika draft awal tidak sesuai.

**Acceptance criteria:**

1. Aplikasi meminta konfirmasi bahwa perubahan manual akan dibuang.
2. Regenerate memakai parameter generation terakhir bila tersedia.
3. Jika parameter terakhir tidak ada, aplikasi memakai metadata item terpilih; screenshot tidak ikut pada jalur fallback ini.
4. Hasil regenerate menjadi item history baru, bukan pembaruan in-place terhadap item lama.

### D. Export CSV

**User story:** Sebagai SIT tester, saya ingin mengunduh test case scenario aktif untuk dipakai di spreadsheet.

**Acceptance criteria:**

1. CSV berisi kolom `Test ID`, `Scenario`, `Steps`, dan `Expected Result`.
2. Nilai yang mengandung koma, kutip, atau newline di-escape dengan benar.
3. File diunduh dengan nama berdasarkan module dan scenario aktif.
4. Export hanya mencakup scenario aktif, bukan seluruh history atau seluruh scenario.

### E. Manajemen history

**User story:** Sebagai QA, saya ingin membuka kembali atau menghapus hasil generation sebelumnya.

**Acceptance criteria:**

1. History dibaca dari localStorage; bila key belum ada, data contoh diinisialisasi.
2. Pengguna dapat mencari module atau scenario, mengurutkan daftar, berpindah halaman, membuka editor, dan menghapus item setelah konfirmasi.
3. Penghapusan item terpilih mengembalikan tampilan ke New Generation.
4. Status `COMPLETED`, `ARCHIVED`, dan `FAILED` ditampilkan; aplikasi saat ini tidak menyediakan alur UI untuk mengubah status tersebut.

## 6. Success Metrics

Semua metrik berikut perlu diukur melalui studi penggunaan atau telemetry yang belum ada di kode:

- Median waktu dari input requirement hingga draft pertama dibanding baseline manual.
- Persentase generation yang menghasilkan output lalu disimpan atau diekspor.
- Rata-rata jumlah edit manual pada test case per generation sebagai proxy kecocokan output.
- Persentase test case yang dipakai QA setelah review.
- Tingkat kegagalan request dan proporsi penggunaan fallback.
- Jumlah generation yang berhasil diselesaikan per pengguna/per periode, bila identitas pengguna kelak tersedia.

## 7. Asumsi

- Output AI adalah draft dan selalu memerlukan review QA.
- localStorage cukup untuk prototipe atau penggunaan satu browser.
- Screenshot berisi informasi yang boleh dikirim ke provider AI; validasi keamanan data belum tersedia.
- Format CSV empat kolom cukup untuk tahap awal.
- Implementasi provider saat ini adalah OpenAI; fallback lokal tetap tersedia bila API key belum dikonfigurasi.

## 8. Pertanyaan Terbuka

- Apakah provider perlu dipindahkan dari Chat Completions ke Responses API pada iterasi berikutnya?
- Model, JSON schema, batas token, timeout, dan kebijakan retry apa yang disetujui?
- Apakah requirement atau screenshot dapat memuat data sensitif? Berapa lama data boleh disimpan?
- Apakah hasil perlu diekspor ke format atau platform test management tertentu?
- Apa definisi akurasi dan kriteria penerimaan minimum untuk scenario/test case AI?
- Apakah status ARCHIVED/FAILED/IN_PROGRESS perlu memiliki alur bisnis yang nyata?
- Apakah history perlu dipindahkan ke database dan dibagikan lintas anggota/tim?
- Batas ukuran dan perilaku yang diharapkan untuk localStorage serta screenshot seperti apa?
