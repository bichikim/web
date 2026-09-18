import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'

import {useChat} from '../../features/chat'
import {useModelDownload} from '../../features/model-download'
import {getTextModel, isTextModelDownloaded} from '../../features/text-generation'

const CHAT_MODEL_ID = 'gemma-4-e2b'

export const ONE_OFF_CHAT_MODEL = getTextModel(CHAT_MODEL_ID)

export interface OneOffChatController {
  readonly cancelDownloadConsent: () => void
  readonly draft: Accessor<string>
  readonly downloadConsentOpen: Accessor<boolean>
  readonly errorMessage: Accessor<string | null>
  readonly isBusy: Accessor<boolean>
  readonly setDraft: (draft: string) => void
  readonly startDownload: () => Promise<void>
  readonly submit: (text: string) => Promise<boolean>
}

export interface UseOneOffChatProps {
  readonly onReply: (text: string) => Promise<void>
}

interface PendingText {
  readonly draftRevision: number
  readonly text: string
}

/** Generates one reply at a time without retaining its conversation context. */
// oxlint-disable-next-line eslint/max-lines-per-function -- One hook owns one disposable chat flow and its download state.
export const useOneOffChat = (props: UseOneOffChatProps): OneOffChatController => {
  const chat = useChat({modelId: CHAT_MODEL_ID})
  const modelDownload = useModelDownload()
  const [downloadConsentOpen, setDownloadConsentOpen] = createSignal(false)
  const [downloadError, setDownloadError] = createSignal<string | null>(null)
  const [replyError, setReplyError] = createSignal<string | null>(null)
  const [isCheckingModel, setIsCheckingModel] = createSignal(false)
  const [pendingText, setPendingText] = createSignal<PendingText | null>(null)
  let draftRevision = 0
  let replyRevision = 0
  let disposed = false
  let handledReplyId: string | null = null

  const isModelDownloading = () => {
    const state = modelDownload.state()
    return (
      state.status === 'loading' &&
      state.target.kind === 'text' &&
      state.target.modelId === CHAT_MODEL_ID
    )
  }
  const isBusy = () =>
    pendingText() !== null || isCheckingModel() || isModelDownloading() || chat.isBusy()
  const errorMessage = () => {
    const state = chat.state()
    return downloadError() ?? replyError() ?? (state.status === 'error' ? state.message : null)
  }
  const setDraft = (draft: string) => {
    draftRevision += 1
    chat.setDraft(draft)
  }
  const restorePendingDraft = () => {
    const pending = untrack(pendingText)

    if (pending !== null && draftRevision === pending.draftRevision) {
      chat.setDraft(pending.text)
    }
    setPendingText(null)
  }
  const sendPending = () => {
    const pending = pendingText()

    if (pending === null || !chat.isModelReady()) {
      return
    }

    const currentDraft = chat.draft()
    const shouldRestoreCurrentDraft = draftRevision !== pending.draftRevision
    setPendingText(null)

    if (chat.canClear()) {
      chat.clear()
    }

    chat.setDraft(pending.text)
    chat.send({refineAnswer: true})

    if (shouldRestoreCurrentDraft) {
      chat.setDraft(currentDraft)
    }
  }
  const prepare = () => {
    chat.prepare()
  }
  const submit = async (text: string) => {
    const normalizedText = text.trim()

    if (normalizedText.length === 0 || isBusy() || chat.state().status === 'unsupported') {
      return false
    }

    setDownloadError(null)
    setReplyError(null)
    replyRevision += 1
    setPendingText({draftRevision, text: normalizedText})

    if (chat.isModelReady()) {
      sendPending()
      return false
    }

    setIsCheckingModel(true)

    try {
      const isDownloaded = await isTextModelDownloaded({modelId: CHAT_MODEL_ID})

      if (disposed) {
        return false
      }

      if (isDownloaded) {
        prepare()
      } else {
        setDownloadConsentOpen(true)
      }
      return false
    } catch (error: unknown) {
      setDownloadError(
        error instanceof Error && error.message.length > 0
          ? error.message
          : '모델 준비 상태를 확인하지 못했어요.',
      )
      restorePendingDraft()
      console.error('Failed to check the one-off chat model.', error)
      return false
    } finally {
      if (!disposed) {
        setIsCheckingModel(false)
      }
    }
  }
  const startDownload = async () => {
    setDownloadConsentOpen(false)
    try {
      const result = await modelDownload.startTextModel(CHAT_MODEL_ID)

      if (disposed) {
        return
      }

      if (result.status === 'complete') {
        prepare()
        return
      }

      if (result.status === 'error') {
        setDownloadError(result.message)
      }
      restorePendingDraft()
    } catch (error: unknown) {
      if (disposed) {
        return
      }

      setDownloadError(
        error instanceof Error && error.message.length > 0
          ? error.message
          : '모델을 내려받지 못했어요.',
      )
      restorePendingDraft()
      console.error('Failed to download the one-off chat model.', error)
    }
  }
  const cancelDownloadConsent = () => {
    setDownloadConsentOpen(false)
    restorePendingDraft()
  }

  createEffect(() => {
    const {status} = chat.state()

    if (status === 'error') {
      restorePendingDraft()
      return
    }

    if (status === 'ready') {
      untrack(sendPending)
    }
  })

  createEffect(() => {
    const reply = chat.messages().findLast((message) => message.role === 'assistant')

    if (reply === undefined || reply.id === handledReplyId) {
      return
    }
    if (chat.state().status !== 'ready') {
      return
    }

    handledReplyId = reply.id
    const speechRevision = replyRevision
    const speech = untrack(() => props.onReply(reply.content))
    chat.clear()
    speech.catch((error: unknown) => {
      if (!disposed && speechRevision === replyRevision) {
        setReplyError(
          error instanceof Error && error.message.length > 0
            ? error.message
            : '음성을 재생하지 못했어요.',
        )
      }
      console.error('Failed to speak the one-off chat reply.', error)
    })
  })

  onCleanup(() => {
    disposed = true
  })

  return {
    cancelDownloadConsent,
    downloadConsentOpen,
    draft: chat.draft,
    errorMessage,
    isBusy,
    setDraft,
    startDownload,
    submit,
  }
}
