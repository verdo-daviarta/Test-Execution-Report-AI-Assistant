export class ApiError extends Error {
  constructor(message: string, public status: number, public retryAfterSeconds?: number) {
    super(message);
  }
}
export async function responseError(response: Response): Promise<ApiError> {
  let message = await response.text();
  try { message = JSON.parse(message).error || 'API request failed.'; } catch { /* plain text response */ }
  let retryAfterSeconds: number | undefined;
  if (response.status === 429) {
    const raw = response.headers.get('Retry-After');
    const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : raw ? Math.ceil((Date.parse(raw) - Date.now()) / 1000) : 60;
    retryAfterSeconds = Number.isFinite(seconds) ? Math.max(1, seconds) : 60;
    message = 'Batas request tercapai. Tunggu ' + retryAfterSeconds + ' detik lalu klik Save Changes kembali. Draft Anda tetap tersedia.';
  }
  return new ApiError(message || 'API request failed.', response.status, retryAfterSeconds);
}
