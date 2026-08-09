import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'

const MAXIMUM_PROGRESS = 100

export type CharacterRendererStatus = 'booting' | 'error' | 'loading' | 'ready'

interface CharacterSceneNode {
  raycastAllowed?: boolean
}

interface CharacterRenderContext {
  readonly scene?: {
    readonly traverse: (callback: (node: CharacterSceneNode) => void) => void
  }
}

export interface CharacterRenderElement {
  readonly addEventListener: (type: string, listener: EventListener) => void
  readonly context?: CharacterRenderContext
  readonly removeEventListener: (type: string, listener: EventListener) => void
  readonly setAttribute: (name: string, value: string) => void
}

export interface CharacterRendererRuntime {
  readonly createObjectUrl: (file: File) => string
  readonly loadEngine: () => Promise<void>
  readonly revokeObjectUrl: (url: string) => void
}

export interface UseCharacterRendererProps {
  readonly allowModelInteraction?: boolean
  readonly defaultModelName: string
  readonly defaultModelUrl: string
  readonly runtime?: CharacterRendererRuntime
}

export interface CharacterRendererController {
  readonly attachElement: (element: CharacterRenderElement) => void
  readonly loadDefaultModel: () => void
  readonly loadFile: (file: File) => void
  readonly loadUrl: (url: string) => boolean
  readonly modelName: Accessor<string>
  readonly prepare: () => Promise<void>
  readonly progress: Accessor<number>
  readonly status: Accessor<CharacterRendererStatus>
}

const DEFAULT_RUNTIME: CharacterRendererRuntime = {
  createObjectUrl: (file) => URL.createObjectURL(file),
  loadEngine: async () => {
    await import('@needle-tools/engine')
  },
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
}

const getLoadProgress = (event: Event) => {
  if (!(event instanceof CustomEvent)) {
    return null
  }

  const {detail} = event

  if (
    typeof detail !== 'object' ||
    detail === null ||
    !('totalProgress01' in detail) ||
    typeof detail.totalProgress01 !== 'number'
  ) {
    return null
  }

  return Math.round(Math.min(1, Math.max(0, detail.totalProgress01)) * MAXIMUM_PROGRESS)
}

export const useCharacterRenderer = (
  props: UseCharacterRendererProps,
): CharacterRendererController => {
  const runtime = props.runtime ?? DEFAULT_RUNTIME
  const [element, setElement] = createSignal<CharacterRenderElement | null>(null)
  const [modelUrl, setModelUrl] = createSignal(props.defaultModelUrl)
  const [modelName, setModelName] = createSignal(props.defaultModelName)
  const [status, setStatus] = createSignal<CharacterRendererStatus>('booting')
  const [progress, setProgress] = createSignal(0)
  let activeObjectUrl: string | null = null
  let preparationPromise: Promise<void> | null = null

  const releaseObjectUrl = () => {
    if (activeObjectUrl !== null) {
      runtime.revokeObjectUrl(activeObjectUrl)
      activeObjectUrl = null
    }
  }

  const replaceModel = (url: string, name: string) => {
    releaseObjectUrl()
    setModelName(name)
    setModelUrl(url)
  }

  const prepare = () => {
    if (preparationPromise !== null) {
      return preparationPromise
    }

    if (status() !== 'booting' && status() !== 'error') {
      return Promise.resolve()
    }

    setStatus('booting')
    const nextPreparation = runtime
      .loadEngine()
      .then(() => {
        setStatus('loading')
      })
      .catch((error: unknown) => {
        console.error('Unexpected character renderer failure', error)
        setStatus('error')
      })
      .finally(() => {
        preparationPromise = null
      })
    preparationPromise = nextPreparation

    return nextPreparation
  }

  const loadFile = (file: File) => {
    const objectUrl = runtime.createObjectUrl(file)
    replaceModel(objectUrl, file.name)
    activeObjectUrl = objectUrl
  }

  const loadUrl = (url: string) => {
    const normalizedUrl = url.trim()

    if (normalizedUrl.length === 0) {
      return false
    }

    replaceModel(normalizedUrl, 'Blender / 외부 GLB')
    return true
  }

  const loadDefaultModel = () => replaceModel(props.defaultModelUrl, props.defaultModelName)

  createEffect(() => {
    const currentElement = element()

    if (currentElement === null) {
      return
    }

    const handleLoadStart = () => {
      setProgress(0)
      setStatus('loading')
    }
    const handleProgress: EventListener = (event) => {
      const nextProgress = getLoadProgress(event)

      if (nextProgress !== null) {
        setProgress(nextProgress)
      }
    }
    const handleLoadFinished = () => {
      if (props.allowModelInteraction !== true) {
        // AI_NOTE - The preview only needs orbit controls. Disabling model raycasts avoids
        // Needle's BVH worker, whose bare worker URL is not rewritten by Vinxi dev builds.
        currentElement.context?.scene?.traverse((node) => {
          node.raycastAllowed = false
        })
      }

      setProgress(MAXIMUM_PROGRESS)
      setStatus('ready')
    }

    currentElement.addEventListener('loadstart', handleLoadStart)
    currentElement.addEventListener('progress', handleProgress)
    currentElement.addEventListener('loadfinished', handleLoadFinished)
    onCleanup(() => {
      currentElement.removeEventListener('loadstart', handleLoadStart)
      currentElement.removeEventListener('progress', handleProgress)
      currentElement.removeEventListener('loadfinished', handleLoadFinished)
    })
  })

  createEffect(() => {
    element()?.setAttribute('src', modelUrl())
  })

  onCleanup(releaseObjectUrl)

  return {
    attachElement: setElement,
    loadDefaultModel,
    loadFile,
    loadUrl,
    modelName,
    prepare,
    progress,
    status,
  }
}
