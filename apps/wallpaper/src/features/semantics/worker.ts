// oxlint-disable eslint-js/camelcase -- Transformers.js configuration uses upstream model field names.
import {AutoConfig, AutoModel, AutoTokenizer, env} from '@huggingface/transformers'
import type {SemanticReply, SemanticRequest} from './protocol'

const MODEL = 'embeddinggemma-2'
const CACHE_LIMIT = 128
const TOKEN_LIMIT = 512
const DIMENSIONS = 768
const cache = new Map<string, readonly number[]>()
const load = async (request: SemanticRequest) => {
  env.allowRemoteModels = false
  env.allowLocalModels = true
  const localPrefix = '/semantic-models/'
  const fetchAsset = globalThis.fetch
  env.localModelPath = localPrefix
  env.fetch = (input, init) => {
    const path = typeof input === 'string' ? input : input.href
    if (!path.startsWith(localPrefix)) {
      throw new Error('Embedding assets must be bundled locally')
    }
    return fetchAsset(`${request.modelPath}${path.slice(localPrefix.length)}`, init)
  }
  env.useBrowserCache = false
  const {wasm} = env.backends.onnx
  if (wasm === undefined) {
    throw new Error('Local ONNX runtime is unavailable')
  }
  wasm.wasmPaths = request.runtimePath
  wasm.numThreads = 1
  const device =
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    (await navigator.gpu.requestAdapter()) !== null
      ? 'webgpu'
      : 'wasm'
  const config = await AutoConfig.from_pretrained(MODEL, {local_files_only: true})
  Object.assign(config, {audio_config: null, vision_config: null})
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL, {local_files_only: true})
  const model = await AutoModel.from_pretrained(MODEL, {
    config,
    device,
    dtype: device === 'webgpu' ? 'q4' : 'fp32',
    local_files_only: true,
  })
  return {model, tokenizer}
}
let loaded: ReturnType<typeof load> | null = null
const embed = async (request: SemanticRequest) => {
  loaded ??= load(request).catch((cause: unknown) => {
    loaded = null
    throw cause
  })
  const runtime = await loaded
  const resolved = new Map<string, readonly number[]>()
  for (const text of request.texts) {
    const vector = cache.get(text)
    if (vector !== undefined) {
      resolved.set(text, vector)
      cache.delete(text)
      cache.set(text, vector)
    }
  }
  const missing = [...new Set(request.texts.filter((text) => !cache.has(text)))]
  for (const text of missing) {
    const tokens = runtime.tokenizer([text], {
      max_length: TOKEN_LIMIT,
      padding: true,
      truncation: true,
    })
    // oxlint-disable-next-line no-await-in-loop -- Avoid padding every short binding to the length of a full chat message.
    const result = await runtime.model(tokens)
    const vectors: number[][] = result.sentence_embedding.tolist()
    const [vector] = vectors
    if (
      vectors.length !== 1 ||
      vector === undefined ||
      vector.length !== DIMENSIONS ||
      !vector.every(Number.isFinite)
    ) {
      throw new Error('Local embedding model returned invalid vectors')
    }
    if (cache.size >= CACHE_LIMIT) {
      cache.delete(cache.keys().next().value!)
    }
    cache.set(text, vector)
    resolved.set(text, vector)
  }
  return request.texts.map((text) => resolved.get(text)!)
}
let pending = Promise.resolve()
globalThis.onmessage = (event: MessageEvent<SemanticRequest>) => {
  const request = event.data
  pending = pending.then(async () => {
    try {
      const vectors = await embed(request)
      globalThis.postMessage({id: request.id, type: 'vectors', vectors} satisfies SemanticReply)
    } catch (cause) {
      console.error('Bundled semantic model failed', cause)
      globalThis.postMessage({
        id: request.id,
        message: cause instanceof Error ? cause.message : String(cause),
        type: 'error',
      } satisfies SemanticReply)
    }
  })
}
