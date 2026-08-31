import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  // Global Middlewares
  app.use(express.json({ limit: "12mb" }));

  app.use('/api', (req, res, next) => {
    const configuredKey = process.env.INTERNAL_API_KEY?.trim();
    if (configuredKey && req.header('x-api-key') !== configuredKey) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    const now = Date.now();
    const clientKey = req.ip || 'unknown';
    const current = requestCounts.get(clientKey);
    if (!current || current.resetAt <= now) {
      requestCounts.set(clientKey, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (current.count >= 30) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }
    current.count += 1;
    return next();
  });

  // API Route - Generate Test Execution Report using OpenAI
  app.post("/api/generate", async (req: any, res: any) => {
    try {
      const { moduleName, requirement, businessRules, coverages, screenshot } = req.body;
      const provider = req.body.provider || process.env.AI_PROVIDER || 'openai';

      if (!moduleName) {
        return res.status(400).json({ error: "Module Name is required." });
      }

      if (provider !== 'openai' && provider !== 'gemini') {
        return res.status(400).json({ error: 'Unsupported AI provider. Use openai or gemini.' });
      }
      const apiKey = (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY)?.trim();
      const isPlaceholder = !apiKey;

      if (isPlaceholder) {
        console.warn(`${provider} API key is not configured. Using smart fallback mocker.`);
        // Simulate minor processing delay for realistic visual loader experience
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const scenarios = generateFallbackScenarios(moduleName, requirement, businessRules, coverages);
        return res.json({ scenarios, isMock: true, provider });
      }

      let promptText = `Analyze this QA specification and identify comprehensive Test Execution Report test cases.

Module Name: ${moduleName}
Requirement: ${requirement || "None specified"}
Business Rules: ${businessRules || "None specified"}
Requested Coverage levels: ${coverages?.join(", ") || "Positive, Negative"}

Guidelines:
1. Divide testing into logical Scenario blocks (aim for 2 to 4 scenarios) corresponding to key testing areas matching requested coverages.
2. For each Scenario, generate 2-4 comprehensive step-by-step Test Cases.
3. Keep descriptions professional and realistic.
4. Each testCase MUST have:
   - testId: e.g. "TC-001", "TC-002"
   - scenario: Brief descriptive action/focus.
   - step: Clear, bulleted/numbered guidelines inside a single string separated by newlines \\n.
   - expectedResult: Clear criteria for verification achievements.`;

      if (screenshot) {
        promptText += "\n\nA UI screenshot is attached. Analyze its visible components and match them in the generated steps.";
      }

      if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        const parts: any[] = [];
        if (screenshot) {
          const match = screenshot.match(/^data:(image\/[^;]+);base64,(.+)$/);
          parts.push({ inlineData: { mimeType: match?.[1] || 'image/jpeg', data: match?.[2] || screenshot } });
        }
        parts.push({ text: promptText });
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
          contents: [{ role: 'user', parts }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scenarios: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                  name: { type: Type.STRING }, description: { type: Type.STRING },
                  testCases: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    testId: { type: Type.STRING }, scenario: { type: Type.STRING }, step: { type: Type.STRING }, expectedResult: { type: Type.STRING }
                  }, required: ['testId', 'scenario', 'step', 'expectedResult'] } }
                }, required: ['name', 'description', 'testCases'] } }
              }, required: ['scenarios']
            }
          }
        });
        return res.json({ ...JSON.parse(response.text || '{}'), isMock: false, provider });
      }

      {
        const ai = new OpenAI({ apiKey, timeout: 60_000 });
        const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: promptText }];
        if (screenshot) {
          userContent.push({ type: 'image_url', image_url: { url: screenshot, detail: 'high' } });
        }

        const response = await ai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an automated Test Execution Report assistant. Output professional, exhaustive structured test scenarios in English.' },
            { role: 'user', content: userContent },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'sit_scenarios', strict: true,
              schema: {
                type: 'object', additionalProperties: false,
                properties: { scenarios: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
                  name: { type: 'string' }, description: { type: 'string' }, testCases: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
                    testId: { type: 'string' }, scenario: { type: 'string' }, step: { type: 'string' }, expectedResult: { type: 'string' }
                  }, required: ['testId', 'scenario', 'step', 'expectedResult'] } }
                }, required: ['name', 'description', 'testCases'] } } }, required: ['scenarios']
              }
            }
          }
        });
        const responseText = response.choices[0]?.message?.content || '{}';
        return res.json({ ...JSON.parse(responseText), isMock: false, provider });
      }

    } catch (error: any) {
      console.error("OpenAI Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate test cases via OpenAI." });
    }
  });

  // Serve Vite or static compilation
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on host 0.0.0.0 port ${PORT}`);
  });
}

// Intelligent fallback mockup generator for offline/unconfigured environments
function generateFallbackScenarios(
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
          expectedResult: `Process runs successfully and matches rules: "${businessRules || 'Standard confirmation is shown.'}"`
        },
        {
          testId: `TC-0${codeIndex++ < 10 ? '0' + (codeIndex-1) : (codeIndex-1)}`,
          scenario: "Verify persistent session state",
          step: "1. Form complete state loaded\n2. Terminate active application browser view\n3. Relaunch session screen",
          expectedResult: "Original form configurations and saved states load gracefully without re-entry."
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
          expectedResult: "Form denies submission. Correct form outlines are flagged and validation toasts display error warnings."
        },
        {
          testId: `TC-0${codeIndex++ < 10 ? '0' + (codeIndex-1) : (codeIndex-1)}`,
          scenario: "Violation of defined business rules",
          step: `1. Insert deliberately incorrect values violating business logic\n2. Click Action Button`,
          expectedResult: `System catches discrepancy and triggers proper handler warning matching rule specifications.`
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
          expectedResult: "Safe sanitization techniques escape inputs cleanly without database side-effects."
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
          expectedResult: "The system prevents crash patterns, either clipping values or outputting a prompt warning."
        }
      ]
    });
  }

  return scenarios;
}

startServer();
