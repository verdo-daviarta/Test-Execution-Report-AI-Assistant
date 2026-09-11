import OpenAI from 'openai';
import type { ProviderAdapter } from './contracts';
export function createOpenAIAdapter(apiKey: string, model: string): ProviderAdapter {
  return { async generate({ promptText, screenshot }) {
        const ai = new OpenAI({ apiKey, timeout: 60_000 });
        const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: promptText }];
        if (screenshot) {
          userContent.push({ type: 'image_url', image_url: { url: screenshot, detail: 'high' } });
        }

        const response = await ai.chat.completions.create({
          model: model,
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
                    testId: { type: 'string' }, scenario: { type: 'string' }, step: { type: 'string' }, expectedResult: { type: 'string' }, coverageType: { type: 'string', enum: ['Positive', 'Negative', 'Validation', 'Boundary'] }
                  }, required: ['testId', 'scenario', 'step', 'expectedResult', 'coverageType'] } }
                }, required: ['name', 'description', 'testCases'] } } }, required: ['scenarios']
              }
            }
          }
        });
        const responseText = response.choices[0]?.message?.content || '{}';
        return JSON.parse(responseText);

  }};
}
