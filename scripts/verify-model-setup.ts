import { writeFile } from 'node:fs/promises';
import { generateText } from '../lib/ai';

/**
 * One synthetic check that the deploy's model key and model name work, with and without streaming. Public synthetic
 * inputs only; credentials and response bodies are never logged. Run with the site's .env.local, never with a key on
 * the command line.
 */
const checks = [];
for (const mode of ['streaming', 'plain'] as const) {
 const started = Date.now();
 try {
  const result = await generateText('Return a JSON object with ok set to true.', 'Return {"ok":true}.', { json: true, maxTokens: 2000, timeoutMs: 60000, ...(mode === 'streaming' ? { onPartial: () => { } } : {}) });
  const valid = JSON.parse(result.text).ok === true;
  if (!valid) throw new Error('Unexpected synthetic response.');
  checks.push({ mode, passed: true, model: result.model, durationMs: Date.now() - started, performance: result.performance });
 } catch (error) { checks.push({ mode, passed: false, durationMs: Date.now() - started, error: error instanceof Error ? error.message : 'Request failed.' }); }
}
await writeFile('work/model-setup-live.json', JSON.stringify({ checkedAt: new Date().toISOString(), provider: 'openrouter', checks, scope: 'Synthetic transport and configuration checks, not an end-to-end object-generation evaluation.' }, null, 2) + '\n');
console.log(JSON.stringify(checks)); if (checks.some(c => !c.passed)) process.exitCode = 1;
