import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {nonReasoningTokens} from './usage.mjs'

const load = (path) => import(pathToFileURL(path).href)

/** Bridges evaluation-only Ollama requests to an explicitly installed pi SDK. */
export const createPiTransport = async ({nativeFetch}) => {
  const installation = process.env.KNOWLEDGE_PI_ROOT
  const authPath = process.env.KNOWLEDGE_PI_AUTH
  const reasoning = process.env.KNOWLEDGE_PI_REASONING ?? 'none'
  assert.ok(['none', 'medium', 'xhigh', 'max'].includes(reasoning))
  assert.ok(installation && authPath, 'Explicit pi installation and auth file paths are required')
  const aiRoot = resolve(installation, 'node_modules/@earendil-works/pi-ai')
  const {createModels} = await load(resolve(aiRoot, 'dist/index.js'))
  const {openaiCodexProvider} = await load(resolve(aiRoot, 'dist/providers/openai-codex.js'))
  const {AuthStorage} = await load(resolve(installation, 'dist/core/auth-storage.js'))
  const {version} = JSON.parse(await readFile(resolve(aiRoot, 'package.json'), 'utf8'))
  assert.equal(version, '0.84.3', 'Revalidate the bridge when changing pi versions')
  const models = createModels({credentials: AuthStorage.create(authPath)})
  models.setProvider(openaiCodexProvider())
  const model = models.getModel('openai-codex', 'gpt-5.6-luna')
  assert.ok(model)
  // The product checks an Ollama-style digest; this is configuration identity, not remote weights.
  const digest = createHash('sha256').update(JSON.stringify({model, version})).digest('hex')
  const metadata = {
    digestMeaning: 'pi-catalog-and-version-hash-not-model-weights',
    model: model.id,
    outputLimit: 'non-reasoning-tokens-checked-after-response',
    provider: model.provider,
    reasoning,
    temperature: 'omitted-provider-rejected-zero',
    version,
  }
  const request = async (body, signal) => {
    assert.equal(body.model, model.id)
    let payload
    const start = Date.now()
    const result = await models.complete(
      model,
      {
        messages: [{content: body.prompt, role: 'user', timestamp: Date.now()}],
        systemPrompt: body.system,
      },
      {
        cacheRetention: 'none',
        fetch: nativeFetch,
        onPayload: (value) => {
          value.text.format = {
            name: 'inspection',
            schema: body.format,
            strict: true,
            type: 'json_schema',
          }
          payload = structuredClone(value)
        },
        reasoningEffort: reasoning,
        signal,
        transport: 'sse',
      },
    )
    const withinLimit = nonReasoningTokens(result.usage) <= body.options.num_predict
    const accepted =
      withinLimit &&
      result.stopReason === 'stop' &&
      result.model === model.id &&
      (result.responseModel === undefined || result.responseModel === model.id)
    const SUCCESS = 200
    const BAD_GATEWAY = 502
    return Response.json(
      {
        done: accepted,
        // oxlint-disable-next-line eslint-js/camelcase -- Ollama wire format.
        done_reason: result.stopReason,
        model: result.model,
        pi: {
          elapsedMs: Date.now() - start,
          error: withinLimit ? result.errorMessage : 'output-limit-exceeded',
          payload,
          result,
        },
        // oxlint-disable-next-line eslint-js/camelcase -- Ollama wire format.
        prompt_eval_count: result.usage.input + result.usage.cacheRead,
        response: result.content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(''),
      },
      {status: accepted ? SUCCESS : BAD_GATEWAY},
    )
  }
  return {
    metadata,
    request,
    tags: () => Response.json({models: [{digest, name: model.id}]}),
  }
}
