# the model

VibeCAD calls one provider: OpenRouter (`https://openrouter.ai/api/v1`), from the site's server module only.

| what | where |
|---|---|
| the key | `OPENROUTER_API_KEY` in the site's environment (`.env.local` here; `commandagi sites env vibecad set OPENROUTER_API_KEY=… --secret` on the deployment) |
| the model | `OPENROUTER_MODEL` names one model exactly; when it is empty the adapter uses `deepseek/deepseek-chat-v3.1`, then `moonshotai/kimi-k2.5`, then `qwen/qwen3.8-max-0902` |
| what it costs | each answer's `usage.cost` is recorded in the call's metrics; `lib/ai.ts` writes them under `VIBECAD_LOG_INFERENCE=1` |
| a check | `node --experimental-strip-types scripts/verify-model-setup.ts` with the key in the environment |

The models are not OpenAI's or Anthropic's. A key never reaches the browser: every call goes through
`/api/project`, `/api/ask`, `/api/device`, `/api/redesign`, `/api/review`, `/api/constraints`,
`/api/design-sources` or `/api/catalog`, served by `server/index.ts`.

A failure is one fixed sentence, never the provider's body; a timed-out or cancelled call returns nothing and keeps the
current object. When no key is set, the studio says so and offers its built-in examples; it never presents an example
as a generated answer.
