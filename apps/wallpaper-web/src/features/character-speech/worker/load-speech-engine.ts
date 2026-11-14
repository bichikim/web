import {
  parseSupertonicConfig,
  parseSupertonicIndexer,
  parseSupertonicVoice,
  SupertonicEngine,
} from '@winter-love/supertonic/engine'
import {getSupertonicAssetUrl} from '@winter-love/supertonic/model'
import {failureResult, successResult} from '@winter-love/supertonic/result'
import type {SupertonicRuntime} from '@winter-love/supertonic/runtime'
import {loadSessions} from '@winter-love/supertonic/sessions'
import type {SpeechEngine} from './types'
import {getSpeechSpeed, SPEECH_MODEL, SPEECH_VOICE_PATH} from '../configuration'
import {loadSpeechAsset} from './load-asset'

interface LoadSpeechEngineOptions {
  /** 모델과 설정을 가져오는 통신 경계. */
  readonly fetch: typeof fetch
  /** 영속 모델 캐시를 열며 캐시 장애 시에도 다운로드를 계속한다. */
  readonly openCache: () => Promise<Pick<Cache, 'match' | 'put' | 'delete'>>
  /** 초기화할 때 WASM 실행 환경을 불러온다. */
  readonly loadRuntime: () => Promise<SupertonicRuntime>
  /** 모델 다운로드 진행률을 전달한다. */
  readonly onProgress: (percent: number) => void
  /** 추론 단계 사이에 Worker 수신 이벤트로 제어를 돌려준다. */
  readonly yieldInput: () => Promise<void>
}

export const loadSpeechEngine = async (options: LoadSpeechEngineOptions): Promise<SpeechEngine> => {
  const PERCENT = 100
  const model = SPEECH_MODEL
  const assets = {
    fetch: options.fetch,
    openCache: options.openCache,
  }
  const runtime = await options.loadRuntime()
  const [config, indexer, voice] = await Promise.all([
    loadSpeechAsset({
      ...assets,
      parse: async (response) => {
        const result = parseSupertonicConfig(await response.json())
        if (!result.ok) {
          throw new Error('Invalid speech configuration')
        }
        return result.value
      },
      url: getSupertonicAssetUrl('onnx/tts.json'),
    }),
    loadSpeechAsset({
      ...assets,
      parse: async (response) => {
        const result = parseSupertonicIndexer(await response.json())
        if (!result.ok) {
          throw new Error('Invalid speech indexer')
        }
        return result.value
      },
      url: getSupertonicAssetUrl('onnx/unicode_indexer.json'),
    }),
    loadSpeechAsset({
      ...assets,
      parse: async (response) => {
        const result = parseSupertonicVoice(runtime, await response.json())
        if (!result.ok) {
          throw new Error('Invalid speech voice')
        }
        return result.value
      },
      url: getSupertonicAssetUrl(SPEECH_VOICE_PATH),
    }),
  ])
  let modelUrl: string | null = null
  const loaded = await loadSessions({
    backend: 'wasm',
    loadBuffer: async (bufferOptions) => {
      try {
        modelUrl = bufferOptions.url
        const buffer = await loadSpeechAsset({
          ...assets,
          parse: async (response) => {
            let received = 0
            const progress = new TransformStream<Uint8Array, Uint8Array>({
              transform(chunk, controller) {
                received += chunk.byteLength
                options.onProgress(
                  Math.min(
                    PERCENT,
                    Math.round(((bufferOptions.loadedBefore + received) / model.size) * PERCENT),
                  ),
                )
                controller.enqueue(chunk)
              },
            })
            const buffer =
              response.body === null
                ? await response.arrayBuffer()
                : await new Response(response.body.pipeThrough(progress)).arrayBuffer()
            if (buffer.byteLength !== bufferOptions.expectedSize) {
              throw new Error('Incomplete speech model download')
            }
            return buffer
          },
          url: bufferOptions.url,
        })
        return successResult(buffer)
      } catch (cause) {
        console.error('Speech download failed', cause)
        return failureResult({
          code: 'download-failed',
          fileName: bufferOptions.fileName,
          phase: 'download',
          retryable: true,
          status: null,
        })
      }
    },
    model,
    runtime,
    signal: new AbortController().signal,
  })
  if (!loaded.ok) {
    const failedUrl = modelUrl
    if (loaded.error.code === 'backend-failed' && failedUrl !== null) {
      await options
        .openCache()
        .then((cache) => cache.delete(failedUrl))
        .catch((cause: unknown) => console.warn('Speech cache removal failed', cause))
    }
    throw new Error('Speech model initialization failed', {cause: loaded.error})
  }
  const engine = new SupertonicEngine(config, indexer, loaded.value, runtime)
  return {
    generate: async (text, signal) => {
      const samples = await engine.generate({
        language: 'ko',
        onProgress: options.yieldInput,
        signal,
        speed: getSpeechSpeed(text),
        text,
        voice,
      })
      return {sampleRate: engine.sampleRate, samples}
    },
  }
}
