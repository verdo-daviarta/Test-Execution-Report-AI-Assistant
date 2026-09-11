# System Design Document

## 1. Status Implementasi

Dokumen ini menggambarkan source code setelah perbaikan. Provider dapat dipilih per request antara OpenAI dan Google Gemini melalui SDK resmi masing-masing, dengan fallback lokal, autentikasi API key internal opsional, dan rate limiting in-memory. Database multi-user belum diterapkan.

## 2. Arsitektur Saat Ini

```text
Browser
  React 19 + TypeScript + Vite UI
  ├─ NewGeneration: input, coverage, screenshot -> base64
  ├─ LoadingScreen: progress/status visual
  ├─ ResultEditor: edit, add/delete, local optimizer, CSV download
  ├─ HistoryList: search, sort, pagination, delete
  └─ localStorage: ai_sit_assistant_history
          |
          | POST /api/generate (JSON; limit 50 MB)
          v
Express server.ts (port 3000)
  ├─ validasi moduleName
  ├─ provider=openai -> OPENAI_API_KEY -> OpenAI Chat Completions
  ├─ provider=gemini -> GEMINI_API_KEY -> Gemini generateContent
  └─ fallback generator bila key provider terpilih kosong
```

Pada development, Express menjalankan Vite dalam middleware mode. Pada production, Express menyajikan `dist` dan fallback SPA route. Tidak ada service layer, repository, database, queue, atau cache server.

## 3. Data Flow Generate

1. `NewGeneration` menyimpan `moduleName`, `requirement`, `businessRules`, `coverages`, dan screenshot sebagai data URL.
2. Module Name divalidasi di client; server juga memvalidasinya.
3. `App.handleGenerate` mengirim JSON ke `POST /api/generate` dengan `Content-Type: application/json`.
4. Express menerima payload hingga 50 MB. Jika API key tidak tersedia atau bernilai placeholder, server menunggu sekitar 2,5 detik lalu memanggil `generateFallbackScenarios`.
5. Jika API key tersedia, server menyusun prompt teks. Screenshot dipotong dari data URL menjadi base64 dan `inlineData` dengan MIME type image; parts dikirim ke `GoogleGenAI.models.generateContent`.
6. OpenAI Chat Completions dipanggil dengan `response_format.type: json_schema`; tiap scenario wajib memiliki `name`, `description`, `testCases`, dan tiap test case wajib memiliki `testId`, `scenario`, `step`, `expectedResult`.
7. Server melakukan `JSON.parse(response.text)` dan mengembalikan hasil. Error provider atau parse menghasilkan HTTP 500.
8. Client menghitung jumlah test case, menambahkan ID berbasis UUID, membuat `HistoryItem` berstatus `COMPLETED`, lalu memanggil `addHistoryItem`.
9. `storage.ts` menulis seluruh history ke `localStorage`. Item baru dipilih dan Result Editor ditampilkan.

Catatan: screenshot tidak disalin ke `HistoryItem` baru walaupun tipe memiliki `screenshotUrl`; regenerate pada sesi aktif dapat memakai parameter tersimpan di state, sedangkan fallback dari item terpilih mengirim `screenshot: null`.

## 4. Data Model

Sumber kebenaran tipe berada di `src/types.ts`.

### TestCase

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | `string` | ID internal UI. |
| `testId` | `string` | ID tampilan seperti `TC-001`. |
| `scenario` | `string` | Target/fokus test case. |
| `step` | `string` | Langkah eksekusi; dapat mengandung newline. |
| `expectedResult` | `string` | Kriteria hasil yang diharapkan. |

### Scenario

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | `string` | ID internal scenario. |
| `name` | `string` | Nama scenario. |
| `count` | `number` | Jumlah test case; diperbarui pada operasi add/delete tertentu. |
| `description` | `string` | Ringkasan scenario. |
| `testCases` | `TestCase[]` | Daftar test case. |

### HistoryItem

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | `string` | ID generation berbasis UUID. |
| `date` | `string` | String tanggal/waktu tampilan. |
| `moduleName` | `string` | Modul yang dianalisis. |
| `scenarioCount` | `number` | Jumlah scenario. |
| `testCaseCount` | `number` | Total test case. |
| `status` | union | `COMPLETED`, `ARCHIVED`, `FAILED`, atau `IN_PROGRESS`. |
| `scenarios` | `Scenario[]` | Hasil terstruktur. |
| `requirement` | `string?` | Input requirement opsional. |
| `businessRules` | `string?` | Input aturan bisnis opsional. |
| `coverages` | `string[]?` | Coverage yang dipilih. |
| `screenshotUrl` | `string?` | Tersedia pada tipe, tetapi tidak diisi oleh generation saat ini. |

## 5. Komponen dan Dependency

- React 19/React DOM: rendering dan state UI.
- TypeScript: tipe compile-time; tidak melakukan validasi runtime terhadap schema respons.
- Vite dan `@vitejs/plugin-react`: dev server/build frontend.
- Express: HTTP server, JSON parsing, endpoint generation, dan static serving.
- `openai`: integrasi provider aktual, structured output JSON Schema, dan input image melalui data URL.
- `dotenv`: pembacaan environment variable.
- `lucide-react` dan `motion`: ikon/animasi UI; tidak mengubah data flow generation.
- Browser localStorage: persistence history per browser/origin.

Penanganan kegagalan saat ini:

- `moduleName` kosong: HTTP 400 di server; client juga mencegah submit.
- API key OpenAI kosong: fallback generator lokal dan response diberi `isMock: true`.
- Error provider, respons non-JSON, atau parse error: HTTP 500 dan alert di client.
- JSON localStorage rusak: `getHistory` mencatat error dan mengembalikan `initialHistory`, tetapi tidak memperbaiki key yang rusak.
- Vite/Express/provider tidak memiliki retry, timeout eksplisit, circuit breaker, atau rate limiting.
- Tombol Cancel hanya mengubah state UI; fetch yang sedang berjalan tidak diabort.

### Perbedaan provider yang perlu didokumentasikan

Provider dipilih dari field `provider` pada request (`openai` atau `gemini`), dengan default `AI_PROVIDER`. OpenAI memakai `OPENAI_MODEL` dan `json_schema`, sedangkan Gemini memakai `GEMINI_MODEL` dan `responseSchema`. Screenshot dikirim sebagai `image_url` pada OpenAI atau `inlineData` pada Gemini. Error provider dikembalikan sebagai HTTP 500.

## 6. Known Limitations dan Risiko Teknis

- History hanya berada di localStorage: tidak portable, dapat hilang ketika storage/cache dibersihkan, dan kapasitas browser terbatas.
- Screenshot base64 dikirim penuh dalam request dan menambah ukuran payload sekitar overhead encoding; server hanya membatasi JSON 50 MB.
- Tidak ada autentikasi, otorisasi, validasi schema runtime, sanitasi input khusus, atau rate limiting pada `/api/generate`.
- API key digunakan server-side, tetapi endpoint publik pada server yang sama dapat disalahgunakan untuk memicu biaya provider.
- UUID digunakan untuk ID generation, scenario, dan test case; fallback ID memakai kombinasi nilai acak.
- Regenerate membuat item baru dan dapat membuang edit manual setelah konfirmasi.
- Cancel tidak membatalkan request backend dan hasil request yang selesai belakangan dapat tetap mengubah tampilan.
- Penyimpanan dilakukan sebagai satu blob seluruh history; konkurensi tab dan kegagalan quota tidak ditangani.
- `count` pada Scenario adalah field denormalisasi dan berisiko tidak konsisten bila dimodifikasi melalui jalur tertentu.
- Sorting history disebut berdasarkan tanggal pada UI, tetapi implementasi mengurutkan berdasarkan `id`, bukan timestamp yang benar-benar diparse.
- Statistik history memakai offset hard-coded (`items.length + 137`) dan storage `1.2 GB` tampilan, sehingga bukan metrik operasional nyata.
- Status `FAILED` dan `ARCHIVED` ada pada tipe/data contoh, tetapi alur generation tidak menyimpan kegagalan sebagai history dan tidak menyediakan archive action.
- Optimizer yang tampil sebagai fitur AI hanya melakukan rewrite string lokal dengan delay; tidak memvalidasi hasil atau memanggil provider.
- Initial data berisi contoh domain dan tanggal statis; history baru bercampur dengan data demo.
- Loading progress, estimated time, dan jumlah logic branches bersifat simulasi visual, bukan observability backend.
- README dan `.env.example` mengarah ke OpenAI; `OPENAI_MODEL`, `INTERNAL_API_KEY`, dan `VITE_INTERNAL_API_KEY` terdokumentasi.

## 7. Rekomendasi Arsitektur Tahap Berikutnya

Jika dipakai multi-user atau oleh banyak tim QA:

1. Pisahkan frontend, API service, dan provider adapter. Adapter menyamakan kontrak internal sehingga migrasi Gemini/OpenAI tidak tersebar di route.
2. Tambahkan database untuk user, project/team, generation, scenario, test case, revision, dan status; simpan screenshot pada object storage dengan metadata dan kebijakan retensi.
3. Tambahkan identity provider, role/permission, tenant isolation, audit log, dan versioning hasil agar edit/regenerate dapat dilacak.
4. Gunakan queue/worker untuk generation panjang, idempotency key, timeout, retry terbatas, dan status job yang dapat dipoll atau di-stream.
5. Terapkan schema validation runtime, sanitasi, payload limits yang terukur, rate limiting per user/team, secret management, dan redaction data sensitif.
6. Tambahkan observability: latency provider, token/cost, fallback rate, error rate, queue depth, serta metrik kualitas yang disepakati QA.
7. Ganti ID berbasis waktu dengan UUID/ULID dan pisahkan timestamp penyimpanan dari string tampilan.
8. Definisikan kontrak ekspor dan integrasi test management setelah kebutuhan stakeholder divalidasi.
