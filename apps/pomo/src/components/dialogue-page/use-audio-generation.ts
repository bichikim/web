import {type Accessor, createSignal, onCleanup} from 'solid-js'
import {isDialogueEditorBusy} from 'src/features/focus-room-dialogue/dialogue-editor-state'
import type {PDialogueEditorController} from 'src/features/focus-room-dialogue'
import {useModelDownload} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'

export interface UseAudioGenerationProps {
  readonly editor: Pick<
    PDialogueEditorController,
    'state' | 'modelId' | 'progress' | 'canGenerate' | 'generate'
  >
  readonly draftBusy: Accessor<boolean>
}

export interface AudioGenerationController {
  readonly busy: Accessor<boolean>
  readonly audioBusy: Accessor<boolean>
  readonly consentOpen: Accessor<boolean>
  readonly message: Accessor<string>
  readonly progress: Accessor<number | null>
  readonly cancelDownload: Accessor<(() => void) | undefined>
  readonly dismissConsent: () => void
  readonly generate: () => Promise<void>
  readonly confirmDownload: () => Promise<void>
}

/** Coordinates model availability, consent, download, and voice generation until owner disposal. */
export const useAudioGeneration = (props: UseAudioGenerationProps): AudioGenerationController => {
  const [audioDownloadConsentOpen, setAudioDownloadConsentOpen] = createSignal(false)
  const [audioDownloadError, setAudioDownloadError] = createSignal<string | null>(null)
  const [isCheckingAudioModel, setIsCheckingAudioModel] = createSignal(false)
  const modelDownload = useModelDownload()
  let isDisposed = false
  onCleanup(() => {
    isDisposed = true
  })
  const isAudioBusy = () => isDialogueEditorBusy(props.editor.state())
  const isModelDownloading = () => modelDownload.state().status === 'loading'
  const audioDownload = () => {
    const downloadState = modelDownload.state()
    return downloadState.status === 'loading' &&
      downloadState.target.kind === 'voice' &&
      downloadState.target.modelId === props.editor.modelId()
      ? downloadState
      : null
  }
  const isBusy = () =>
    isAudioBusy() || props.draftBusy() || isCheckingAudioModel() || isModelDownloading()
  const audioProgress = () => {
    const download = audioDownload()
    return download === null
      ? props.editor.state().status === 'preparing'
        ? props.editor.progress()
        : null
      : download.percentage
  }
  const audioMessage = () =>
    audioDownloadError() ??
    (audioDownload() === null
      ? props.editor.state().message
      : '음성 모델 파일을 백그라운드에서 내려받고 있어요.')
  const handleAudioGenerate = async () => {
    if (isBusy() || !props.editor.canGenerate()) {
      return
    }

    const selectedModelId = props.editor.modelId()
    setAudioDownloadError(null)
    setIsCheckingAudioModel(true)
    const isDownloaded = await isSupertonicModelDownloaded({modelId: selectedModelId})

    if (isDisposed) {
      return
    }

    setIsCheckingAudioModel(false)

    if (isDownloaded) {
      await props.editor.generate()
      return
    }

    setAudioDownloadConsentOpen(true)
  }
  const handleConfirmAudioDownload = async () => {
    const selectedModelId = props.editor.modelId()
    setAudioDownloadConsentOpen(false)
    const result = await modelDownload.startVoiceModel(selectedModelId)

    if (isDisposed) {
      return
    }

    if (result.status === 'complete') {
      await props.editor.generate()
      return
    }

    if (result.status === 'error') {
      setAudioDownloadError(result.message)
    }
  }

  return {
    audioBusy: isAudioBusy,
    busy: isBusy,
    cancelDownload: () => (audioDownload() === null ? undefined : modelDownload.cancel),
    confirmDownload: handleConfirmAudioDownload,
    consentOpen: audioDownloadConsentOpen,
    dismissConsent: () => setAudioDownloadConsentOpen(false),
    generate: handleAudioGenerate,
    message: audioMessage,
    progress: audioProgress,
  }
}
