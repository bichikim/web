import {type Accessor, createSignal, onCleanup} from 'solid-js'

const MAXIMUM_PROGRESS = 100

export type CharacterRendererStatus = 'error' | 'loading' | 'ready'

export interface CharacterRendererRuntime {
  readonly createObjectUrl: (file: File) => string
  readonly revokeObjectUrl: (url: string) => void
}

export interface UseCharacterRendererProps {
  readonly defaultModelName: string
  readonly defaultModelUrl: string
  readonly runtime?: CharacterRendererRuntime
}

export interface CharacterRendererController {
  readonly handleLoadError: () => void
  readonly handleLoadProgress: (progress: number) => void
  readonly handleLoadStart: () => void
  readonly handleLoadSuccess: () => void
  readonly loadDefaultModel: () => void
  readonly loadFile: (file: File) => void
  readonly loadUrl: (url: string) => boolean
  readonly modelName: Accessor<string>
  readonly modelUrl: Accessor<string>
  readonly progress: Accessor<number>
  readonly status: Accessor<CharacterRendererStatus>
}

const DEFAULT_RUNTIME: CharacterRendererRuntime = {
  createObjectUrl: (file) => URL.createObjectURL(file),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
}

export const useCharacterRenderer = (
  props: UseCharacterRendererProps,
): CharacterRendererController => {
  const runtime = props.runtime ?? DEFAULT_RUNTIME
  const [modelUrl, setModelUrl] = createSignal(props.defaultModelUrl)
  const [modelName, setModelName] = createSignal(props.defaultModelName)
  const [progress, setProgress] = createSignal(0)
  const [status, setStatus] = createSignal<CharacterRendererStatus>('loading')
  let activeObjectUrl: string | null = null

  const releaseObjectUrl = () => {
    if (activeObjectUrl === null) {
      return
    }

    runtime.revokeObjectUrl(activeObjectUrl)
    activeObjectUrl = null
  }

  const replaceModel = (url: string, name: string) => {
    releaseObjectUrl()
    setModelName(name)
    setModelUrl(url)
    setProgress(0)
    setStatus('loading')
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

  const handleLoadProgress = (nextProgress: number) => {
    setProgress(Math.round(Math.min(MAXIMUM_PROGRESS, Math.max(0, nextProgress))))
  }

  const handleLoadStart = () => {
    setProgress(0)
    setStatus('loading')
  }

  const handleLoadSuccess = () => {
    setProgress(MAXIMUM_PROGRESS)
    setStatus('ready')
  }

  const handleLoadError = () => setStatus('error')

  onCleanup(releaseObjectUrl)

  return {
    handleLoadError,
    handleLoadProgress,
    handleLoadStart,
    handleLoadSuccess,
    loadDefaultModel,
    loadFile,
    loadUrl,
    modelName,
    modelUrl,
    progress,
    status,
  }
}
