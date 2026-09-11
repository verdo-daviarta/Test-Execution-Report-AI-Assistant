import type { GenerationPayload } from '../../shared/generation';
export interface ProviderRequest { promptText: string; screenshot?: string | null }
export interface ProviderAdapter { generate(request: ProviderRequest): Promise<GenerationPayload> }
