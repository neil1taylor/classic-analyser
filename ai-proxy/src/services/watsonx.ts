import { config } from '../config.js';
import { getIAMToken } from './iamToken.js';

const MODEL_ID = 'ibm/granite-3-8b-instruct';
const DEFAULT_MAX_TOKENS = 4096;

export async function generateText(
  prompt: string,
  maxTokens: number = DEFAULT_MAX_TOKENS
): Promise<string> {
  const token = await getIAMToken();

  const url = `${config.WATSONX_URL}/ml/v1/text/generation?version=2024-03-14`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model_id: MODEL_ID,
      input: prompt,
      project_id: config.WATSONX_PROJECT_ID,
      parameters: {
        max_new_tokens: maxTokens,
        temperature: 0.3,
        top_p: 0.9,
        repetition_penalty: 1.1,
        stop_sequences: [],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `watsonx API error (${response.status}): ${errorBody.substring(0, 200)}`
    );
  }

  const data = (await response.json()) as {
    results: { generated_text: string }[];
  };

  if (!data.results || data.results.length === 0) {
    throw new Error('No results returned from watsonx');
  }

  return data.results[0].generated_text.trim();
}
