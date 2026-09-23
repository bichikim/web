// oxlint-disable eslint-js/camelcase -- Transformers.js generation options are external contracts.
// oxlint-disable no-magic-numbers -- Model generation defaults and progress phases are operational constants.
import {
  AutoProcessor,
  env,
  Gemma4ForCausalLM,
  pipeline,
  TextStreamer,
} from '@huggingface/transformers'

import {
  imageJobInputSchema,
  soundJobInputSchema,
  speechToTextJobInputSchema,
  textJobInputSchema,
  textToSpeechJobInputSchema,
} from '../ai/contracts.ts'
import {getAiModel} from '../ai/model-catalog.ts'
import {RunnerExecutionError} from './errors.ts'
import {decodePcmWav, resampleAudio} from './audio.ts'
import {createSupertonicExecutor} from './supertonic.ts'
import type {
  RunnerExecutionContext,
  RunnerExecutionResult,
  RunnerExecutor,
  RunnerJobRecord,
} from './types.ts'

interface CreateDefaultRunnerExecutorOptions {
  readonly modelCacheDirectory?: string
}

interface TextRuntime {
  readonly generate: (
    input: ReturnType<typeof textJobInputSchema.parse>,
    context: RunnerExecutionContext,
  ) => Promise<string>
}

type SpeechPipeline = (
  audio: Float32Array,
  options: {readonly language?: string; readonly task: 'transcribe'} | undefined,
) => Promise<unknown>

const GEMMA_MODELS = {
  'gemma-4-e2b': {
    dtype: 'q4' as const,
    repositoryId: 'onnx-community/gemma-4-E2B-it-ONNX',
    revision: 'main',
  },
  'gemma-4-e2b-mobile': {
    dtype: 'q2f16' as const,
    repositoryId: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
    revision: 'main',
  },
} as const

const SPEECH_MODELS = {
  'moonshine-tiny-ko': 'onnx-community/moonshine-tiny-ko-ONNX',
  'whisper-base': 'onnx-community/whisper-base',
  'whisper-tiny': 'onnx-community/whisper-tiny',
} as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getStringValue = (value: unknown, key: string): string => {
  if (!isRecord(value) || typeof value[key] !== 'string') {
    throw new RunnerExecutionError(
      'invalid-model-output',
      'The speech model returned no transcript',
    )
  }
  return value[key]
}

const configureTransformers = (cacheDirectory?: string): void => {
  env.allowLocalModels = false
  env.allowRemoteModels = true
  env.useBrowserCache = false
  if (cacheDirectory !== undefined && cacheDirectory.trim().length > 0) {
    env.cacheDir = cacheDirectory
  }
}

const getProgress = (value: unknown): number | null => {
  if (!isRecord(value)) {
    return null
  }
  const {progress} = value
  return typeof progress === 'number' && Number.isFinite(progress) ? Math.trunc(progress) : null
}

const getCatalogCapability = (capability: string): string => {
  switch (capability) {
    case 'speech_to_text':
      return 'speech-to-text'
    case 'text_to_speech':
      return 'text-to-speech'
    default:
      return capability
  }
}

const createTextRuntime = async (
  modelId: keyof typeof GEMMA_MODELS,
  options: CreateDefaultRunnerExecutorOptions,
  context: RunnerExecutionContext,
): Promise<TextRuntime> => {
  configureTransformers(options.modelCacheDirectory)
  const modelDefinition = GEMMA_MODELS[modelId]
  const reportProgress = (progress: unknown): void => {
    const percentage = getProgress(progress)
    if (percentage !== null) {
      context.onProgress(Math.min(45, Math.floor(percentage * 0.45)))
    }
  }
  context.onProgress(1)
  const processor = await AutoProcessor.from_pretrained(modelDefinition.repositoryId, {
    revision: modelDefinition.revision,
  })
  context.onProgress(5)
  const model = await Gemma4ForCausalLM.from_pretrained(modelDefinition.repositoryId, {
    device: 'cpu',
    dtype: {
      decoder_model_merged: modelDefinition.dtype,
      embed_tokens: modelDefinition.dtype,
    },
    progress_callback: reportProgress,
    revision: modelDefinition.revision,
  })
  context.onProgress(48)

  return {
    generate: async (input, generationContext) => {
      if (generationContext.signal.aborted) {
        throw new RunnerExecutionError('cancelled', 'Text generation was cancelled')
      }
      const prompt = processor.apply_chat_template(input.messages, {
        add_generation_prompt: true,
        tokenize: false,
      })
      if (typeof prompt !== 'string') {
        throw new RunnerExecutionError(
          'invalid-input',
          'The text model prompt could not be created',
        )
      }
      const inputs = await processor(prompt)
      let output = ''
      const {parameters} = input
      const {tokenizer} = processor
      if (tokenizer === undefined) {
        throw new RunnerExecutionError(
          'model-initialization-failed',
          'The text tokenizer is unavailable',
        )
      }
      await model.generate({
        ...inputs,
        do_sample: (parameters.temperature ?? 0.7) > 0,
        max_new_tokens: parameters.maximumTokens ?? 256,
        streamer: new TextStreamer(tokenizer, {
          callback_function: (text) => {
            output += text
            generationContext.onProgress(Math.min(99, 50 + output.length))
          },
          skip_prompt: true,
          skip_special_tokens: true,
        }),
        temperature: parameters.temperature,
        top_p: parameters.topP,
      })
      return output.trim()
    },
  }
}

const loadSpeechBytes = (
  input: ReturnType<typeof speechToTextJobInputSchema.parse>,
): Uint8Array => {
  const bytes = Uint8Array.from(Buffer.from(input.audioBase64, 'base64'))
  if (bytes.byteLength === 0) {
    throw new RunnerExecutionError('invalid-audio', 'The supplied base64 audio is empty')
  }
  return bytes
}

const createSpeechRuntime = async (
  modelId: keyof typeof SPEECH_MODELS,
  options: CreateDefaultRunnerExecutorOptions,
  context: RunnerExecutionContext,
): Promise<SpeechPipeline> => {
  configureTransformers(options.modelCacheDirectory)
  const transformersPipeline = await pipeline(
    'automatic-speech-recognition',
    SPEECH_MODELS[modelId],
    {
      device: 'cpu',
      dtype: 'fp32',
      progress_callback: (progress: unknown) => {
        const percentage = getProgress(progress)
        if (percentage !== null) {
          context.onProgress(Math.min(70, Math.floor(percentage * 0.7)))
        }
      },
      revision: 'main',
    },
  )
  return transformersPipeline as unknown as SpeechPipeline
}

const createErrorSafeParse = <T>(parse: () => T, message: string): T => {
  try {
    return parse()
  } catch (error: unknown) {
    throw new RunnerExecutionError('invalid-input', message, {cause: error})
  }
}

export const createDefaultRunnerExecutor = (
  options: CreateDefaultRunnerExecutorOptions = {},
): RunnerExecutor => {
  const textRuntimes = new Map<string, Promise<TextRuntime>>()
  const speechRuntimes = new Map<string, Promise<SpeechPipeline>>()
  const supertonic = createSupertonicExecutor()

  const getTextRuntime = (modelId: keyof typeof GEMMA_MODELS, context: RunnerExecutionContext) => {
    const existing = textRuntimes.get(modelId)
    if (existing !== undefined) {
      return existing
    }
    const loading = createTextRuntime(modelId, options, context).catch((error: unknown) => {
      textRuntimes.delete(modelId)
      throw error
    })
    textRuntimes.set(modelId, loading)
    return loading
  }

  const getSpeechRuntime = (
    modelId: keyof typeof SPEECH_MODELS,
    context: RunnerExecutionContext,
  ) => {
    const existing = speechRuntimes.get(modelId)
    if (existing !== undefined) {
      return existing
    }
    const loading = createSpeechRuntime(modelId, options, context).catch((error: unknown) => {
      speechRuntimes.delete(modelId)
      throw error
    })
    speechRuntimes.set(modelId, loading)
    return loading
  }

  const executeText = async (
    job: RunnerJobRecord,
    context: RunnerExecutionContext,
  ): Promise<RunnerExecutionResult> => {
    if (!(job.request.modelId in GEMMA_MODELS)) {
      throw new RunnerExecutionError(
        'unsupported-model',
        `Unsupported text model: ${job.request.modelId}`,
      )
    }
    const input = createErrorSafeParse(
      () => textJobInputSchema.parse(job.request.input),
      'Invalid text input',
    )
    const runtime = await getTextRuntime(job.request.modelId as keyof typeof GEMMA_MODELS, context)
    const text = await runtime.generate(input, context)
    return {kind: 'text', text}
  }

  const executeSpeechToText = async (
    job: RunnerJobRecord,
    context: RunnerExecutionContext,
  ): Promise<RunnerExecutionResult> => {
    if (!(job.request.modelId in SPEECH_MODELS)) {
      throw new RunnerExecutionError(
        'unsupported-model',
        `Unsupported speech model: ${job.request.modelId}`,
      )
    }
    const input = createErrorSafeParse(
      () => speechToTextJobInputSchema.parse(job.request.input),
      'Invalid speech-to-text input',
    )
    const bytes = loadSpeechBytes(input)
    const audio = decodePcmWav(bytes)
    const samples = resampleAudio(audio, 16_000)
    const runtime = await getSpeechRuntime(
      job.request.modelId as keyof typeof SPEECH_MODELS,
      context,
    )
    const result = await runtime(samples, {
      language: input.language,
      task: 'transcribe',
    })
    return {kind: 'text', text: getStringValue(result, 'text').trim()}
  }

  return {
    execute: async (job, context) => {
      const model = getAiModel(job.request.modelId)
      if (
        model === null ||
        model.runner !== 'local-runner' ||
        model.capability !== getCatalogCapability(job.request.capability)
      ) {
        throw new RunnerExecutionError(
          'unsupported-model',
          `Unsupported runner model: ${job.request.modelId}`,
        )
      }

      switch (job.request.capability) {
        case 'text':
          return executeText(job, context)
        case 'speech_to_text':
          return executeSpeechToText(job, context)
        case 'text_to_speech': {
          const input = createErrorSafeParse(
            () => textToSpeechJobInputSchema.parse(job.request.input),
            'Invalid text-to-speech input',
          )
          if (
            job.request.modelId !== 'supertonic-full' &&
            job.request.modelId !== 'supertonic-int8'
          ) {
            throw new RunnerExecutionError(
              'unsupported-model',
              `Unsupported speech model: ${job.request.modelId}`,
            )
          }
          return supertonic(job.request.modelId, input, context)
        }
        case 'image':
          imageJobInputSchema.parse(job.request.input)
          throw new RunnerExecutionError(
            'model-runtime-unavailable',
            'The image runner is not installed',
          )
        case 'sound':
          soundJobInputSchema.parse(job.request.input)
          throw new RunnerExecutionError(
            'model-runtime-unavailable',
            'The sound runner is not installed',
          )
      }
    },
  }
}
