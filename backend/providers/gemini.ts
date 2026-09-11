import { GoogleGenAI, Type } from '@google/genai';
import type { ProviderAdapter } from './contracts';
export function createGeminiAdapter(apiKey: string, model: string): ProviderAdapter {
  return { async generate({ promptText, screenshot }) {
        const ai = new GoogleGenAI({ apiKey });
        const parts: any[] = [];
        if (screenshot) {
          const match = screenshot.match(/^data:(image\/[^;]+);base64,(.+)$/);
          parts.push({ inlineData: { mimeType: match?.[1] || 'image/jpeg', data: match?.[2] || screenshot } });
        }
        parts.push({ text: promptText });
        const response = await ai.models.generateContent({
          model: model,
          contents: [{ role: 'user', parts }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scenarios: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                  name: { type: Type.STRING }, description: { type: Type.STRING },
                  testCases: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    testId: { type: Type.STRING }, scenario: { type: Type.STRING }, step: { type: Type.STRING }, expectedResult: { type: Type.STRING }, coverageType: { type: Type.STRING, enum: ['Positive', 'Negative', 'Validation', 'Boundary'] }
                  }, required: ['testId', 'scenario', 'step', 'expectedResult', 'coverageType'] } }
                }, required: ['name', 'description', 'testCases'] } }
              }, required: ['scenarios']
            }
          }
        });
        return JSON.parse(response.text || '{}');

  }};
}
