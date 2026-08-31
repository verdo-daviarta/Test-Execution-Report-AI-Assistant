import { HistoryItem, Scenario } from '../types';

export const initialScenarios: Scenario[] = [
  {
    id: 'sc-1',
    name: 'Login Success',
    count: 8,
    description: 'Standard user login flow...',
    testCases: [
      {
        id: 'tc-1-1',
        testId: 'TC-001',
        scenario: 'Verify standard user authentication',
        step: '1. Navigate to /login\n2. Enter valid email\n3. Enter valid password\n4. Click Submit',
        expectedResult: 'User is redirected to /dashboard and a session token is issued.'
      },
      {
        id: 'tc-1-2',
        testId: 'TC-002',
        scenario: 'Cookie Persistence Check',
        step: '1. Authenticate user\n2. Close browser\n3. Reopen browser\n4. Navigate to /home',
        expectedResult: 'User session remains active without re-login.'
      },
      {
        id: 'tc-1-3',
        testId: 'TC-003',
        scenario: 'Concurrent Login Conflict',
        step: '1. Login user on Browser A\n2. Login same user on Browser B\n3. Refresh Browser A',
        expectedResult: 'Browser A should either remain logged in or redirect based on security policy.'
      },
      {
        id: 'tc-1-4',
        testId: 'TC-004',
        scenario: 'SQL Injection Attempt',
        step: '1. Enter \' OR 1=1 -- in email\n2. Enter arbitrary password\n3. Click Submit',
        expectedResult: 'Application handles input safely, no authentication occurs.'
      }
    ]
  },
  {
    id: 'sc-2',
    name: 'Invalid Password',
    count: 5,
    description: 'Incorrect password error handling...',
    testCases: [
      {
        id: 'tc-2-1',
        testId: 'TC-005',
        scenario: 'Incorrect Password Validation',
        step: '1. Navigate to /login\n2. Enter valid email\n3. Enter incorrect password\n4. Click Submit',
        expectedResult: 'Display error message "Invalid email or password" and stay on login page.'
      },
      {
        id: 'tc-2-2',
        testId: 'TC-006',
        scenario: 'Empty Password Field Validation',
        step: '1. Navigate to /login\n2. Enter valid email\n3. Leave password field blank\n4. Click Submit',
        expectedResult: 'Display inline validation error: "Password is required".'
      },
      {
        id: 'tc-2-3',
        testId: 'TC-007',
        scenario: 'Password Length Validation (Too Short)',
        step: '1. Navigate to /login\n2. Enter valid email\n3. Enter 3-character password\n4. Click Submit',
        expectedResult: 'Display error indicating minimum password length requirements.'
      }
    ]
  },
  {
    id: 'sc-3',
    name: 'MFA Required',
    count: 12,
    description: 'Multi-factor authentication challenge...',
    testCases: [
      {
        id: 'tc-3-1',
        testId: 'TC-008',
        scenario: 'Verify standard MFA challenge on login',
        step: '1. Enter valid email & password\n2. Click Submit\n3. Verify prompt for 6-digit MFA OTP\n4. Enter correct OTP\n5. Click Verify',
        expectedResult: 'Authentication succeeds, user is redirected to dashboard.'
      },
      {
        id: 'tc-3-2',
        testId: 'TC-009',
        scenario: 'Invalid MFA OTP handling',
        step: '1. Enter valid credentials and proceed to MFA\n2. Enter incorrect 6-digit code "123456"\n3. Click Verify',
        expectedResult: 'Display error "Invalid authentication code" and prompt again.'
      }
    ]
  },
  {
    id: 'sc-4',
    name: 'Account Locked',
    count: 4,
    description: 'Policy for multiple failed attempts...',
    testCases: [
      {
        id: 'tc-4-1',
        testId: 'TC-010',
        scenario: 'Lockout on maximum failed attempts',
        step: '1. Enter valid email\n2. Enter incorrect password 5 consecutive times\n3. Click Submit on 5th attempt',
        expectedResult: 'Account is automatically locked for 15 minutes. Show warning to user.'
      }
    ]
  },
  {
    id: 'sc-5',
    name: 'SSO Redirection',
    count: 6,
    description: 'External identity provider flow...',
    testCases: [
      {
        id: 'tc-5-1',
        testId: 'TC-011',
        scenario: 'Redirect to Google Identity Provider',
        step: '1. Click "Sign in with Google"\n2. Verify external redirect to account selection\n3. Complete external consent\n4. Verify post-login redirect back to App URL',
        expectedResult: 'SSO token is parsed, account is linked, and redirect to dashboard succeeds.'
      }
    ]
  }
];

export const initialHistory: HistoryItem[] = [
  {
    id: 'gen-842',
    date: 'Oct 24, 2023 · 14:32',
    moduleName: 'User Authentication flow',
    scenarioCount: 12,
    testCaseCount: 48,
    status: 'COMPLETED',
    scenarios: initialScenarios,
    requirement: 'User must be able to log in securely with email/password, support Google SSO, locked accounts, and require MFA when active.',
    businessRules: 'Lock account after 5 failed attempts. Codes expire after 3 minutes.',
    coverages: ['Positive', 'Negative', 'Validation', 'Boundary']
  },
  {
    id: 'gen-841',
    date: 'Oct 23, 2023 · 09:15',
    moduleName: 'Checkout API V2 Integration',
    scenarioCount: 8,
    testCaseCount: 32,
    status: 'COMPLETED',
    scenarios: [
      {
        id: 'sc-co-1',
        name: 'Normal Checkout Payment',
        count: 5,
        description: 'Happy path with credit card...',
        testCases: [
          {
            id: 'tc-co-1-1',
            testId: 'TC-201',
            scenario: 'Validate immediate card charge',
            step: '1. Fill checkout form\n2. Enter Stripe valid trial card\n3. Press Pay Now',
            expectedResult: 'Charge succeeds, webhook received, order state marked fulfilled.'
          }
        ]
      },
      {
        id: 'sc-co-2',
        name: 'Insufficient Funds Fail',
        count: 3,
        description: 'Card declined validation...',
        testCases: [
          {
            id: 'tc-co-2-1',
            testId: 'TC-202',
            scenario: 'Graceful decline message',
            step: '1. Enter low balance prepaid card\n2. Click pay now',
            expectedResult: 'Stripe returns code card_declined. Friendly UI toast explains lack of funds.'
          }
        ]
      }
    ],
    requirement: 'Support shopping cart item calculation, discount code lookups, stripe API gateway connection, and email dispatch.',
    businessRules: 'Cart totals calculated backend-side. Promo codes case insensitive.',
    coverages: ['Positive', 'Negative']
  },
  {
    id: 'gen-840',
    date: 'Oct 22, 2023 · 18:45',
    moduleName: 'Core Banking - Transaction Module',
    scenarioCount: 24,
    testCaseCount: 112,
    status: 'ARCHIVED',
    scenarios: [],
    requirement: 'ACH wire transfers and inter-bank transaction ledger records.',
    businessRules: 'Ledger inserts must use ACID double-entry properties.',
    coverages: ['Validation', 'Boundary']
  },
  {
    id: 'gen-839',
    date: 'Oct 20, 2023 · 11:02',
    moduleName: 'Search Optimization Layer',
    scenarioCount: 5,
    testCaseCount: 18,
    status: 'FAILED',
    scenarios: [],
    requirement: 'Elasticsearch query rewrite for autocomplete triggers.',
    businessRules: 'Response latency strictly under 50ms.',
    coverages: ['Positive', 'Boundary']
  },
  {
    id: 'gen-838',
    date: 'Oct 19, 2023 · 16:50',
    moduleName: 'Marketing Landing Assets',
    scenarioCount: 4,
    testCaseCount: 12,
    status: 'COMPLETED',
    scenarios: [],
    requirement: 'Main product page responsive sizing assets.',
    businessRules: 'Assets compressed below 200kb total bundle footprint.',
    coverages: ['Positive']
  }
];
