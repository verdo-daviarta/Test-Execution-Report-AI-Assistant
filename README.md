# Test Execution Report AI Assistant

Aplikasi web untuk membantu tim QA menyusun draft **Test Execution Report** secara cepat dan terstruktur menggunakan AI.

Pengguna dapat memasukkan spesifikasi modul, requirement, business rules, pilihan coverage, dan screenshot UI. Hasil generation dapat ditinjau, diedit, disimpan dalam history, dan diekspor ke CSV.

## Fitur Utama

- Generate scenario dan test case dari requirement QA.
- Pilihan coverage: Positive, Negative, Validation, dan Boundary.
- Analisis screenshot UI secara multimodal.
- Pemilihan provider AI langsung dari form:
  - OpenAI
  - Google Gemini
- Fallback generator lokal jika API key provider tidak tersedia.
- Result Editor untuk mengedit, menambah, dan menghapus scenario/test case.
- Pencarian dan filter scenario.
- Regenerate hasil dan export CSV.
- History generation dan Project tersimpan di SQLite pada server.

## Teknologi

- React 19, TypeScript, Vite, dan Tailwind CSS
- Express
- OpenAI SDK
- Google Generative AI SDK
- Vitest

## Persyaratan

- Node.js 20 atau versi lebih baru.
- API key OpenAI atau Google Gemini.

## Instalasi

```bash
git clone https://github.com/verdo-daviarta/Test-Execution-Report-AI-Assistant.git
cd Test-Execution-Report-AI-Assistant
npm install
```

## Konfigurasi Environment

Buat file `.env` di root project:

```env
AI_PROVIDER="gemini"

OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"

GEMINI_API_KEY="AIza..."
GEMINI_MODEL="gemini-2.0-flash"

# Opsional: proteksi endpoint backend
INTERNAL_API_KEY=""
```

Provider yang dipilih dari form akan digunakan untuk generation tersebut. `AI_PROVIDER` hanya digunakan sebagai provider default.

Jangan menulis API key di source code. File `.env` sudah dikecualikan dari Git melalui `.gitignore`.

## Menjalankan Development

```bash
npm run dev
```

Buka aplikasi pada `http://localhost:3000`.

## Build Production

```bash
npm run lint
npm test
npm run build
npm start
```

## Alur Penggunaan

1. Buka menu **New Generation**.
2. Isi nama modul, requirement, dan business rules.
3. Pilih coverage yang diperlukan.
4. Pilih provider OpenAI atau Google Gemini.
5. Tambahkan screenshot UI jika diperlukan.
6. Klik **Generate Test Scenarios**.
7. Review dan edit hasil pada **Result Editor**.
8. Simpan perubahan atau export scenario aktif ke CSV.
9. Buka menu **History** untuk melihat generation sebelumnya.

## API Endpoint

### `POST /api/generate`

Contoh request:

```json
{
  "moduleName": "Payment Gateway",
  "provider": "openai",
  "requirement": "User dapat menyelesaikan pembayaran.",
  "businessRules": "Transaksi ditolak jika pembayaran gagal.",
  "coverages": ["Positive", "Negative"],
  "screenshot": null
}
```

Nilai `provider` yang didukung: `openai` dan `gemini`.

## Penyimpanan Data

History dan Project disimpan di `data/test-execution-report.db` pada server. Perangkat yang mengakses backend yang sama memakai data bersama; muat ulang History untuk mengambil data terbaru. Autentikasi dan pembatasan akses berdasarkan anggota tim/project belum tersedia.

## Arsitektur

Frontend menggunakan API client, route generation meneruskan request ke service, dan adapter OpenAI/Gemini menyamakan kontrak internal. Lihat [arsitektur dan batas multi-user](backend/README.md) untuk struktur modul dan strategi pengujian.

## Keamanan

- Jangan commit file `.env`.
- Jangan membagikan API key ke repository publik.
- Screenshot yang diunggah akan dikirim ke provider AI yang dipilih.
- Gunakan `INTERNAL_API_KEY` untuk proteksi dasar endpoint backend.

## Status Project

Project ini merupakan assistant internal untuk mempercepat pembuatan draft Test Execution Report. Semua hasil AI tetap harus direview dan divalidasi oleh QA sebelum digunakan sebagai dokumen final.
