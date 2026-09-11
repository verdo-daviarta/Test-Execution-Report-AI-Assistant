const COVERAGE_TYPES = ['Positive', 'Negative', 'Validation', 'Boundary'] as const;
type CoverageType = (typeof COVERAGE_TYPES)[number];

function normalizeCoverageType(value: unknown): CoverageType | undefined {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('positive') || normalized.startsWith('positif')) return 'Positive';
  if (normalized.startsWith('negative') || normalized.startsWith('negatif')) return 'Negative';
  if (normalized.startsWith('validation') || normalized.startsWith('validasi')) return 'Validation';
  if (normalized.startsWith('boundary') || normalized.startsWith('batas')) return 'Boundary';
  return undefined;
}

function inferCoverageType(testCase: any): CoverageType | undefined {
  const content = `${testCase.scenario || ''} ${testCase.step || ''} ${testCase.expectedResult || ''}`.toLowerCase();
  if (/(injection|saniti[sz]|special character|data type|format)/.test(content)) return 'Validation';
  if (/(invalid|incorrect|empty|missing|declin|error|fail|lockout|forbidden)/.test(content)) return 'Negative';
  if (/(minimum|maximum|threshold|limit|overflow|length)/.test(content)) return 'Boundary';
  return undefined;
}

export function applyCoverageTypes(payload: any, requestedCoverages: unknown): any {
  const selected = Array.from(new Set(
    (Array.isArray(requestedCoverages) ? requestedCoverages : [])
      .map(normalizeCoverageType)
      .filter((coverage): coverage is CoverageType => Boolean(coverage))
  ));
  const allowed: CoverageType[] = selected.length > 0 ? selected : ['Positive', 'Negative'];
  const cases = (payload.scenarios || []).flatMap((scenario: any) => scenario.testCases || []);
  const aiCoverage = cases.map((testCase: any) => normalizeCoverageType(testCase.coverageType));
  const isSingleRepeatedLabel = allowed.length > 1 && new Set(aiCoverage.filter(Boolean)).size <= 1;
  const assigned = new Set<CoverageType>();
  let fallbackIndex = 0;

  return {
    ...payload,
    scenarios: (payload.scenarios || []).map((scenario: any) => ({
      ...scenario,
      testCases: (scenario.testCases || []).map((testCase: any) => {
        const aiValue = normalizeCoverageType(testCase.coverageType);
        let coverageType = !isSingleRepeatedLabel && aiValue && allowed.includes(aiValue) ? aiValue : undefined;
        coverageType ||= inferCoverageType(testCase);
        if (!coverageType || !allowed.includes(coverageType)) {
          coverageType = allowed.find((coverage) => !assigned.has(coverage)) || allowed[fallbackIndex % allowed.length];
          fallbackIndex += 1;
        }
        assigned.add(coverageType);
        return { ...testCase, coverageType };
      }),
    })),
  };
}
