import * as m from '@paraglide/message'
import {isAbortError} from 'src/utils/is-cancellation-reason'
import {getExceptionMessage} from '../error-detail'
import {type ModelDownloadItem, useModelDownload} from '../model-download'
import {createMemo, createSignal, onCleanup, type Setter} from 'solid-js'
import {type TextModelId} from '../text-generation'
import type {GenerationUpdate} from './messages'
import {
  localizeErrorMessage,
  localizeImageGenerationProgress,
} from '../localization/localized-messages'
import {runImageGeneration} from './client'
import {useImageSupport} from './use-support'
import type {ArtStyle} from './styles'
import {
  type AspectRatio,
  DEFAULT_DIMENSION,
  DEFAULT_STEPS,
  type ImageVariant,
  resolvePreset,
} from './settings'

export interface ImageResult {
  readonly blob: Blob
  readonly height: number
  readonly prompt: string
  readonly seed: number
  readonly steps: number
  readonly url: string
  readonly width: number
}

const parseSeed = (text: string) => {
  if (text !== '' && !/^\d+$/u.test(text)) {
    throw new Error(m.picture_diary_generation_seed_error())
  }
  return text === '' ? crypto.getRandomValues(new Uint32Array(1))[0]! : Number(text)
}

interface DownloadProgressOptions {
  readonly items: readonly ModelDownloadItem[]
  readonly modelId: TextModelId
  readonly variant: ImageVariant
}

const selectDownload = (options: DownloadProgressOptions) =>
  options.items.find(
    (item) =>
      item.status === 'loading' &&
      ((item.target.kind === 'image' && item.target.modelId === options.variant) ||
        (item.target.kind === 'text' && item.target.modelId === options.modelId)),
  )

interface GenerationUpdateHandlers {
  readonly setPercentage: Setter<number | undefined>
  readonly setPrompt: Setter<string>
  readonly setStatus: Setter<string>
}

const handleGenerationUpdate = (update: GenerationUpdate, handlers: GenerationUpdateHandlers) => {
  switch (update.type) {
    case 'prompt':
      handlers.setPrompt(update.prompt)
      return
    case 'progress':
      handlers.setStatus(localizeImageGenerationProgress(update.label))
      handlers.setPercentage(update.percentage)
      return
  }
  update satisfies never
}

export type ImageGenerationController = ReturnType<typeof useImageGeneration>

export const useImageGeneration = () => {
  const downloads = useModelDownload()
  const [idea, setIdea] = createSignal('')
  const [style, setStyle] = createSignal<ArtStyle>('none')
  const [modelId, setModelId] = createSignal<TextModelId>('gemma-4-e2b')
  const [variant, setVariant] = createSignal<ImageVariant>('ternary')
  const [width, setWidth] = createSignal(DEFAULT_DIMENSION)
  const [height, setHeight] = createSignal(DEFAULT_DIMENSION)
  const [steps, setSteps] = createSignal(DEFAULT_STEPS)
  const [seed, setSeed] = createSignal('')
  const [prompt, setPrompt] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal<string>(m.picture_diary_generation_checking())
  const [percentage, setPercentage] = createSignal<number | undefined>()
  const [error, setError] = createSignal<string | null>(null)
  const [result, setResult] = createSignal<ImageResult | null>(null)
  let controller: AbortController | null = null
  let disposed = false

  const downloadProgress = createMemo(() =>
    busy()
      ? selectDownload({items: downloads.downloads(), modelId: modelId(), variant: variant()})
      : undefined,
  )

  const supported = useImageSupport({onStatus: setStatus})

  const stop = () => {
    controller?.abort()
    controller = null
    setBusy(false)
    setPercentage(undefined)
    setStatus(m.picture_diary_generation_stopped())
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
    const handleUpdate = (update: GenerationUpdate) => {
      if (abort.signal.aborted || disposed) {
        return
      }
      handleGenerationUpdate(update, {setPercentage, setPrompt, setStatus})
    }
    try {
      const settings = {
        height: height(),
        seed: parseSeed(seedText),
        steps: steps(),
        variant: variant(),
        width: width(),
      }
      const image = await runImageGeneration({
        downloads,
        idea: idea(),
        modelId: modelId(),
        onUpdate: handleUpdate,
        settings,
        signal: abort.signal,
        style: style(),
      })
      if (abort.signal.aborted || disposed) {
        return
      }
      const previous = result()
      const url = URL.createObjectURL(image.blob)
      setResult({...settings, blob: image.blob, prompt: image.prompt, url})
      if (previous !== null) {
        URL.revokeObjectURL(previous.url)
      }
      setStatus(m.picture_diary_generation_complete())
    } catch (failure) {
      if (failure instanceof DOMException && isAbortError(failure)) {
        if (!disposed && controller === abort) {
          stop()
        }
        return
      }
      if (!abort.signal.aborted && !disposed) {
        setError(
          localizeErrorMessage(
            getExceptionMessage(failure, m.picture_diary_generation_error()),
            m.picture_diary_generation_error(),
          ),
        )
        setStatus(m.picture_diary_generation_check_settings())
      }
    } finally {
      if (controller === abort) {
        controller = null
        setBusy(false)
        setPercentage(undefined)
      }
    }
  }

  return {
    busy,
    error,
    generate,
    height,
    idea,
    modelId,
    percentage: () => {
      const download = downloadProgress()
      return download?.status === 'loading' ? download.percentage : percentage()
    },
    prompt,
    randomizeSeed: () => setSeed(String(crypto.getRandomValues(new Uint32Array(1))[0])),
    result,
    seed,
    selectRatio: (ratio: AspectRatio) => {
      const size = resolvePreset(ratio)
      setWidth(size.width)
      setHeight(size.height)
    },
    setHeight,
    setIdea,
    setModelId,
    setSeed,
    setSteps,
    setStyle,
    setVariant,
    setWidth,
    status: () => {
      const download = downloadProgress()
      return download === undefined
        ? status()
        : m.picture_diary_generation_downloading_model({
            model: localizeImageGenerationProgress(download.label),
          })
    },
    steps,
    stop,
    style,
    supported,
    variant,
    width,
  }
}
