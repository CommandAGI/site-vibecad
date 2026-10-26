/** Public, sanitized measurements of one model call. Never put prompts, headers or credentials here. */
export type InferenceTier = 'standard' | 'priority';
export type InferenceMetrics = {
  transport: 'chat' | 'generateContent' | 'interactions';
  requestedTier: InferenceTier;
  servedTier: InferenceTier | 'unknown';
  durationMs: number;
  firstTokenMs: number | null;
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  cachedTokens?: number;
  estimatedCostUsd?: number;
};
