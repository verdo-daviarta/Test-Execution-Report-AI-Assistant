import type { GenerationInput, GenerationResult, ProviderName } from '../../shared/generation';
import type { ProviderAdapter } from '../providers/contracts';
import { applyCoverageTypes } from './coverage';
import { generateFallbackScenarios } from './fallback';

const COVERAGE_TYPES = ['Positive', 'Negative', 'Validation', 'Boundary'];

export class GenerationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function createGenerationService(
  adapters: Partial<Record<ProviderName, ProviderAdapter>>,
  defaultProvider: string = 'openai',
) {
  return async (input: GenerationInput): Promise<GenerationResult> => {
    if (!input || typeof input.moduleName !== 'string' || !input.moduleName.trim()) {
      throw new GenerationError('Module Name is required.');
    }
    const {
      moduleName, requirement = '', businessRules = '',
      coverages = ['Positive', 'Negative'], screenshot,
    } = input;
    const provider = input.provider || defaultProvider;
    if (provider !== 'openai' && provider !== 'gemini') {
      throw new GenerationError('Unsupported AI provider. Use openai or gemini.');
    }
    if (
      typeof requirement !== 'string' || typeof businessRules !== 'string' ||
      !Array.isArray(coverages) || coverages.some(c => !COVERAGE_TYPES.includes(c))
    ) {
      throw new GenerationError('Invalid generation parameters.');
    }
    if (screenshot != null && (
      typeof screenshot !== 'string' ||
      (screenshot !== '' && !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(screenshot))
    )) {
      throw new GenerationError('Invalid screenshot data URL.');
    }

    // Preserve offline mode only for an unconfigured provider, not failed API calls.
    const adapter = adapters[provider];
    if (!adapter) {
      return {
        scenarios: generateFallbackScenarios(moduleName, requirement, businessRules, coverages),
        isMock: true,
        provider,
      };
    }

    let promptText = `Analyze this QA specification and identify comprehensive Test Execution Report test cases.

Module Name: ${moduleName}
Requirement: ${requirement || "None specified"}
Business Rules: ${businessRules || "None specified"}
Requested Coverage levels: ${coverages?.join(", ") || "Positive, Negative"}

Guidelines:
1. Divide testing into logical Scenario blocks (aim for 2 to 4 scenarios) corresponding to key testing areas matching requested coverages.
2. For each Scenario, generate 2-4 comprehensive step-by-step Test Cases. Across the complete response, include at least one test case for every requested coverage level.
3. Keep descriptions professional and realistic.
4. Each testCase MUST have:
   - testId: e.g. "TC-001", "TC-002"
   - scenario: Brief descriptive action/focus.
   - step: Clear, bulleted/numbered guidelines inside a single string separated by newlines \\n.
   - expectedResult: Clear criteria for verification achievements.
   - coverageType: exactly one of the requested coverage levels: Positive, Negative, Validation, or Boundary.

Every generated test case must be classified accurately with coverageType.`;

    if (screenshot) {
      promptText += "\n\nA UI screenshot is attached. Analyze its visible components and match them in the generated steps.";
    }

    const payload = await adapter.generate({ promptText, screenshot });
    if (!payload || !Array.isArray(payload.scenarios) || payload.scenarios.some(s =>
      !s || typeof s.name !== 'string' || typeof s.description !== 'string' ||
      !Array.isArray(s.testCases) || s.testCases.some(t =>
        !t || ['testId', 'scenario', 'step', 'expectedResult'].some(k => typeof t[k] !== 'string')
      )
    )) {
      throw new GenerationError('Invalid AI response.', 502);
    }
    return { ...applyCoverageTypes(payload, coverages), isMock: false, provider };
  };
}
