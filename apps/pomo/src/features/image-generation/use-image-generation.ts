import {createSignal, onCleanup, onMount} from 'solid-js'
import {type TextModelId} from '../text-generation'
import {runImageGeneration} from './client'
import {
  type AspectRatio,
  DEFAULT_DIMENSION,
  DEFAULT_STEPS,
  type ImageVariant,
  resolvePreset,
} from './settings'

export interface ImageResult {
  readonly height: number
  readonly prompt: string
  readonly seed: number
  readonly steps: number
  readonly url: string
  readonly width: number
}

const supportsImageGeneration = async () => {
  const adapter = await navigator.gpu?.requestAdapter()
  return adapter !== null && adapter !== undefined && adapter.features.has('shader-f16')
}

const parseSeed = (text: string) => {
  if (text !== '' && !/^\d+$/u.test(text)) {
    throw new Error('시드는 0–4,294,967,295 사이의 정수로 입력해 주세요.')
  }
  return text === '' ? crypto.getRandomValues(new Uint32Array(1))[0]! : Number(text)
}

export type ImageGenerationController = ReturnType<typeof useImageGeneration>

export const useImageGeneration = () => {
  const [idea, setIdea] = createSignal('')
  const [modelId, setModelId] = createSignal<TextModelId>('gemma-4-e2b')
  const [variant, setVariant] = createSignal<ImageVariant>('ternary')
  const [width, setWidth] = createSignal(DEFAULT_DIMENSION)
  const [height, setHeight] = createSignal(DEFAULT_DIMENSION)
  const [steps, setSteps] = createSignal(DEFAULT_STEPS)
  const [seed, setSeed] = createSignal('')
  const [prompt, setPrompt] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const [supported, setSupported] = createSignal(false)
  const [status, setStatus] = createSignal('WebGPU를 확인하고 있어요…')
  const [percentage, setPercentage] = createSignal<number | undefined>()
  const [error, setError] = createSignal<string | null>(null)
  const [result, setResult] = createSignal<ImageResult | null>(null)
  let controller: AbortController | null = null
  let disposed = false

  onMount(() => {
    ;(async () => {
      try {
        const available = await supportsImageGeneration()
        if (disposed) {
          return
        }
        setSupported(available)
        setStatus(
          available
            ? '장면을 입력하고 이미지를 만들어 보세요.'
            : 'WebGPU와 shader-f16을 지원하는 브라우저·GPU가 필요해요.',
        )
      } catch {
        if (!disposed) {
          setStatus('WebGPU를 확인하지 못했어요. 브라우저의 GPU 설정을 확인해 주세요.')
        }
      }
    })()
  })

  const stop = () => {
    controller?.abort()
    controller = null
    setBusy(false)
    setPercentage(undefined)
    setStatus('생성을 중지했어요.')
  }

  onCleanup(() => {
    disposed = true
    controller?.abort()
    const image = result()
    if (image !== null) {
      URL.revokeObjectURL(image.url)
    }
  })

  const generate = async () => {
    if (busy() || !supported()) {
      return
    }
    const abort = new AbortController()
    controller = abort
    setBusy(true)
    setError(null)
    setPrompt('')
    const seedText = seed().trim()
    try {
      const settings = {
        height: height(),
        seed: parseSeed(seedText),
        steps: steps(),
        variant: variant(),
        width: width(),
      }
      const image = await runImageGeneration({
        idea: idea(),
        modelId: modelId(),
        onUpdate: (update) => {
          if (abort.signal.aborted || disposed) {
            return
          }
          switch (update.type) {
            case 'prompt':
              setPrompt(update.prompt)
              return
            case 'progress':
              setStatus(update.label)
              setPercentage(update.percentage)
              return
          }
          update satisfies never
        },
        settings,
        signal: abort.signal,
      })
      if (abort.signal.aborted || disposed) {
        return
      }
      const previous = result()
      const url = URL.createObjectURL(image.blob)
      setResult({...settings, prompt: image.prompt, url})
      if (previous !== null) {
        URL.revokeObjectURL(previous.url)
      }
      setStatus('이미지를 만들었어요.')
    } catch (failure) {
      if (!abort.signal.aborted && !disposed) {
        setError(failure instanceof Error ? failure.message : '이미지를 생성하지 못했어요.')
        setStatus('설정과 오류를 확인한 뒤 다시 시도해 주세요.')
      }
    } finally {
      if (controller === abort) {
        controller = null
        setBusy(false)
        setPercentage(undefined)
      }
    }
  }

  const selectRatio = (ratio: AspectRatio) => {
    const size = resolvePreset(ratio)
    setWidth(size.width)
    setHeight(size.height)
  }
  const randomizeSeed = () => setSeed(String(crypto.getRandomValues(new Uint32Array(1))[0]))

  return {
    busy,
    error,
    generate,
    height,
    idea,
    modelId,
    percentage,
    prompt,
    randomizeSeed,
    result,
    seed,
    selectRatio,
    setHeight,
    setIdea,
    setModelId,
    setSeed,
    setSteps,
    setVariant,
    setWidth,
    status,
    steps,
    stop,
    supported,
    variant,
    width,
  }
}
