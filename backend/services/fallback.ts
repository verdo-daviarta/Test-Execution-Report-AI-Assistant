export function generateFallbackScenarios(
  moduleName: string,
  requirement: string,
  businessRules: string,
  coverages: string[]
) {
  const selected = coverages && coverages.length > 0 ? coverages : ["Positive", "Negative"];
  const scenarios: any[] = [];
  let codeIndex = 1;

  if (selected.includes("Positive")) {
    scenarios.push({
      name: "Positive Happy Path",
      description: `Verification of valid standard operations for ${moduleName}...`,
      testCases: [
        {
          testId: `TC-0${codeIndex++ < 10 ? '0' + (codeIndex-1) : (codeIndex-1)}`,
          scenario: `Verify default behavior for ${moduleName}`,
          step: `1. Open form view\n2. Provide input for requirement: "${requirement || 'Enter complete requested forms information'}"\n3. Click primary action button`,
          expectedResult: `Process runs successfully and matches rules: "${businessRules || 'Standard confirmation is shown.'}"`,
          coverageType: 'Positive'
        },
        {
          testId: `TC-0${codeIndex++ < 10 ? '0' + (codeIndex-1) : (codeIndex-1)}`,
          scenario: "Verify persistent session state",
          step: "1. Form complete state loaded\n2. Terminate active application browser view\n3. Relaunch session screen",
          expectedResult: "Original form configurations and saved states load gracefully without re-entry.",
          coverageType: 'Positive'
        }
      ]
    });
  }

  if (selected.includes("Negative")) {
    scenarios.push({
      name: "Negative Edge Cases",
      description: "Validation handling for missing, corrupted, or erroneous entries...",
      testCases: [
        {
          testId: `TC-0${codeIndex++ < 10 ? '0' + (codeIndex-1) : (codeIndex-1)}`,
          scenario: "Empty fields restriction flow",
          step: "1. Access workspace\n2. Clear primary input parameters\n3. Click Submit",
          expectedResult: "Form denies submission. Correct form outlines are flagged and validation toasts display error warnings.",
          coverageType: 'Negative'
        },
        {
          testId: `TC-0${codeIndex++ < 10 ? '0' + (codeIndex-1) : (codeIndex-1)}`,
          scenario: "Violation of defined business rules",
          step: `1. Insert deliberately incorrect values violating business logic\n2. Click Action Button`,
          expectedResult: `System catches discrepancy and triggers proper handler warning matching rule specifications.`,
          coverageType: 'Negative'
        }
      ]
    });
  }

  if (selected.includes("Validation") && scenarios.length < 3) {
    scenarios.push({
      name: "Data Type Validation check",
      description: "Ensure that type mismatch, special symbols, and empty constraints fail cleanly...",
      testCases: [
        {
          testId: `TC-0${codeIndex++ < 10 ? '0' + (codeIndex-1) : (codeIndex-1)}`,
          scenario: "Symbol Injection and string character sanitization checks",
          step: "1. For parameters inputs, inject common dangerous code characters like SQL quotes ' OR 1=1 or script tags <script>\n2. Click Submit / Generate action",
          expectedResult: "Safe sanitization techniques escape inputs cleanly without database side-effects.",
          coverageType: 'Validation'
        }
      ]
    });
  }

  if (selected.includes("Boundary") && scenarios.length < 4) {
    scenarios.push({
      name: "Boundary Constraints",
      description: "Validation of extreme minimum, maximum and buffer thresholds...",
      testCases: [
        {
          testId: `TC-0${codeIndex++ < 10 ? '0' + (codeIndex-1) : (codeIndex-1)}`,
          scenario: "Buffer threshold sizing overflow",
          step: "1. Paste extremely heavy content (larger than normal capacity ranges) inside fields\n2. Press processing triggers",
          expectedResult: "The system prevents crash patterns, either clipping values or outputting a prompt warning.",
          coverageType: 'Boundary'
        }
      ]
    });
  }

  return scenarios;
}
