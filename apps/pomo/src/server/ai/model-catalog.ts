export const AI_CAPABILITIES = [
  'text',
  'speech-to-text',
  'text-to-speech',
  'image',
  'sound',
] as const

export type AiCapability = (typeof AI_CAPABILITIES)[number]
export type AiExecution = 'local-runner' | 'openai'
export type AiModelVerificationStatus = 'cataloged-unverified' | 'service-configured'

export interface AiModelDefinition {
  readonly capability: AiCapability
  readonly id: string
  readonly label: string
  readonly license: {
    readonly name: string
    readonly source: string
    readonly status: 'known' | 'review-required'
  }
  readonly postprocessing: string
  readonly preprocessing: string
  readonly quantization: string
  readonly runner: AiExecution
  readonly runtime: string
  readonly verificationStatus: AiModelVerificationStatus
  readonly weights: {
    readonly repositoryOrHost: string
    readonly revision: string
  }
}

// This catalog is the server-side allowlist. Local model entries intentionally remain
// cataloged-unverified until a runner reports an actual inference measurement.
export const AI_MODEL_CATALOG = [
  {
    capability: 'text',
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    license: {
      name: 'OpenAI API service terms',
      source: 'https://openai.com/policies/terms-of-use/',
      status: 'known',
    },
    postprocessing:
      'Preserve the text response; apply the existing Pomo text limits at the caller.',
    preprocessing: 'Map Pomo chat messages to the OpenAI Responses input contract.',
    quantization: 'provider-managed',
    runner: 'openai',
    runtime: 'OpenAI Responses API',
    verificationStatus: 'service-configured',
    weights: {repositoryOrHost: 'OpenAI', revision: 'configured OPENAI_MODEL'},
  },
  {
    capability: 'text',
    id: 'gemma-4-e2b',
    label: 'Gemma 4 E2B',
    license: {
      name: 'Apache-2.0 model export; upstream Gemma terms require separate review',
      source: 'https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX',
      status: 'review-required',
    },
    postprocessing: 'Decode generated tokens and trim the existing Pomo repetitive tail.',
    preprocessing: 'Use the Gemma chat template and tokenizer.',
    quantization: 'q4',
    runner: 'local-runner',
    runtime: 'Transformers.js / ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://storage.pomofi.io/models/text-generation/gemma-4-e2b',
      revision: '9f4bef82ea6e296bc69f8a2f5939f73af81b07a6',
    },
  },
  {
    capability: 'text',
    id: 'gemma-4-e2b-mobile',
    label: 'Gemma 4 E2B Mobile',
    license: {
      name: 'Apache-2.0 model export; upstream Gemma terms require separate review',
      source: 'https://huggingface.co/onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
      status: 'review-required',
    },
    postprocessing: 'Decode generated tokens and trim the existing Pomo repetitive tail.',
    preprocessing: 'Use the Gemma chat template and q2f16 tokenizer inputs.',
    quantization: 'q2f16',
    runner: 'local-runner',
    runtime: 'Transformers.js / ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://huggingface.co/onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
      revision: 'main',
    },
  },
  {
    capability: 'text',
    id: 'qwen-0.8b',
    label: 'Qwen3.5-0.8B',
    license: {
      name: 'Runner license verification required',
      source: 'apps/pomo/src/features/text-generation/model.ts',
      status: 'review-required',
    },
    postprocessing: 'Decode generated tokens and apply Pomo text post-processing.',
    preprocessing: 'Use the Qwen chat template and tokenizer.',
    quantization: 'q4',
    runner: 'local-runner',
    runtime: 'Transformers.js / ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://huggingface.co/onnx-community/Qwen3.5-0.8B-ONNX',
      revision: 'main',
    },
  },
  {
    capability: 'text',
    id: 'qwen-2b',
    label: 'Qwen3.5-2B',
    license: {
      name: 'Runner license verification required',
      source: 'apps/pomo/src/features/text-generation/model.ts',
      status: 'review-required',
    },
    postprocessing: 'Decode generated tokens and apply Pomo text post-processing.',
    preprocessing: 'Use the Qwen chat template and tokenizer.',
    quantization: 'q4',
    runner: 'local-runner',
    runtime: 'Transformers.js / ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://huggingface.co/onnx-community/Qwen3.5-2B-ONNX',
      revision: 'main',
    },
  },
  {
    capability: 'text',
    id: 'qwen-4b',
    label: 'Qwen3.5-4B',
    license: {
      name: 'Runner license verification required',
      source: 'apps/pomo/src/features/text-generation/model.ts',
      status: 'review-required',
    },
    postprocessing: 'Decode generated tokens and apply Pomo text post-processing.',
    preprocessing: 'Use the Qwen chat template and tokenizer.',
    quantization: 'q4',
    runner: 'local-runner',
    runtime: 'Transformers.js / ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://huggingface.co/onnx-community/Qwen3.5-4B-ONNX',
      revision: 'main',
    },
  },
  {
    capability: 'text-to-speech',
    id: 'supertonic-full',
    label: 'Supertonic 3 Full',
    license: {
      name: 'Upstream Supertonic license; verify runner redistribution terms',
      source: 'https://github.com/supertone-oss-archive/supertonic',
      status: 'review-required',
    },
    postprocessing: 'Join generated audio chunks and encode the service result artifact.',
    preprocessing: 'Apply Pomo Korean chunking and selected voice style.',
    quantization: 'full precision ONNX export',
    runner: 'local-runner',
    runtime: 'ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://storage.pomofi.io/models/supertonic-3',
      revision: '3cadd1e',
    },
  },
  {
    capability: 'text-to-speech',
    id: 'supertonic-int8',
    label: 'Supertonic 3 INT8',
    license: {
      name: 'Upstream Supertonic license; verify runner redistribution terms',
      source: 'https://github.com/supertone-oss-archive/supertonic',
      status: 'review-required',
    },
    postprocessing: 'Join generated audio chunks and encode the service result artifact.',
    preprocessing: 'Apply Pomo Korean chunking and selected voice style.',
    quantization: 'int8',
    runner: 'local-runner',
    runtime: 'ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://storage.pomofi.io/models/supertonic-3-int8',
      revision: 'cca5a0e6c96e1d2c720986bf7e75fcc81dee3ae4',
    },
  },
  {
    capability: 'speech-to-text',
    id: 'moonshine-tiny-ko',
    label: 'Moonshine Tiny KO',
    license: {
      name: 'Runner license verification required',
      source: 'apps/pomo/src/features/speech-to-text/models.ts',
      status: 'review-required',
    },
    postprocessing:
      'Decode the transcription and preserve timestamps when the runner supplies them.',
    preprocessing: 'Resample audio to the model input contract.',
    quantization: 'ONNX export',
    runner: 'local-runner',
    runtime: 'ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://huggingface.co/onnx-community/moonshine-tiny-ko-ONNX',
      revision: 'main',
    },
  },
  {
    capability: 'speech-to-text',
    id: 'whisper-tiny',
    label: 'Whisper Tiny',
    license: {
      name: 'Runner license verification required',
      source: 'apps/pomo/src/features/speech-to-text/models.ts',
      status: 'review-required',
    },
    postprocessing: 'Decode transcription segments and normalize the response shape.',
    preprocessing: 'Resample audio and run the Whisper feature extractor.',
    quantization: 'ONNX export',
    runner: 'local-runner',
    runtime: 'Transformers.js / ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://huggingface.co/onnx-community/whisper-tiny',
      revision: 'main',
    },
  },
  {
    capability: 'speech-to-text',
    id: 'whisper-base',
    label: 'Whisper Base',
    license: {
      name: 'Runner license verification required',
      source: 'apps/pomo/src/features/speech-to-text/models.ts',
      status: 'review-required',
    },
    postprocessing: 'Decode transcription segments and normalize the response shape.',
    preprocessing: 'Resample audio and run the Whisper feature extractor.',
    quantization: 'ONNX export',
    runner: 'local-runner',
    runtime: 'Transformers.js / ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://huggingface.co/onnx-community/whisper-base',
      revision: 'main',
    },
  },
  {
    capability: 'image',
    id: 'bonsai-binary',
    label: 'Bonsai Image 4B Binary',
    license: {
      name: 'Runner license verification required',
      source: 'apps/pomo/src/features/image-generation/model.ts',
      status: 'review-required',
    },
    postprocessing: 'Convert the generated image tensor to a PNG artifact.',
    preprocessing: 'Generate an English scene prompt, then apply width, height, seed and steps.',
    quantization: '1-bit binary',
    runner: 'local-runner',
    runtime: 'MLX',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost:
        'https://storage.pomofi.io/models/image-generation/prism-ml/bonsai-image-binary-4B-mlx-1bit',
      revision: 'd1b3ac11a7f1ba61d84b277339daeeed4a98e0e2',
    },
  },
  {
    capability: 'image',
    id: 'bonsai-ternary',
    label: 'Bonsai Image 4B Ternary',
    license: {
      name: 'Runner license verification required',
      source: 'apps/pomo/src/features/image-generation/model.ts',
      status: 'review-required',
    },
    postprocessing: 'Convert the generated image tensor to a PNG artifact.',
    preprocessing: 'Generate an English scene prompt, then apply width, height, seed and steps.',
    quantization: '2-bit ternary',
    runner: 'local-runner',
    runtime: 'MLX',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost:
        'https://storage.pomofi.io/models/image-generation/prism-ml/bonsai-image-ternary-4B-mlx-2bit',
      revision: '2c24c81b934a658ba5590cf39088ba929985b4a8',
    },
  },
  {
    capability: 'sound',
    id: 'stable-audio-3-optimized',
    label: 'Stable Audio 3 Optimized',
    license: {
      name: 'Stability AI Community License plus T5Gemma terms',
      source: 'https://huggingface.co/stabilityai/stable-audio-3-optimized',
      status: 'review-required',
    },
    postprocessing: 'Decode the generated audio and expose a bounded audio artifact.',
    preprocessing: 'Tokenize the prompt and apply duration, seed and diffusion settings.',
    quantization: 'DiT fp16; decoder and encoder bf16',
    runner: 'local-runner',
    runtime: 'LiteRT / ONNX Runtime',
    verificationStatus: 'cataloged-unverified',
    weights: {
      repositoryOrHost: 'https://huggingface.co/stabilityai/stable-audio-3-optimized',
      revision: 'da6edc54ddba10bfd79a077102ded687f80e882b',
    },
  },
] as const satisfies ReadonlyArray<AiModelDefinition>

export type AiModelId = (typeof AI_MODEL_CATALOG)[number]['id']

const modelById = new Map<string, AiModelDefinition>(
  AI_MODEL_CATALOG.map((model) => [model.id, model]),
)

export const getAiModel = (modelId: string): AiModelDefinition | null =>
  modelById.get(modelId) ?? null

/** Returns whether a catalog entry has evidence sufficient for production submission. */
export const isAiModelProductionEnabled = (model: AiModelDefinition): boolean =>
  model.verificationStatus === 'service-configured'

export const getAiModelOrThrow = (modelId: string): AiModelDefinition => {
  const model = getAiModel(modelId)
  if (model === null) {
    throw new Error(`지원하지 않는 서버 AI 모델입니다: ${modelId}`)
  }

  return model
}

export const isAiCapability = (value: string): value is AiCapability =>
  AI_CAPABILITIES.includes(value as AiCapability)
