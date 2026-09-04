import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'

import {useChat} from '../../features/chat'
import {useModelDownload} from '../../features/model-download'
import {getTextModel, isTextModelDownloaded} from '../../features/text-generation'

const CHAT_MODEL_ID = 'gemma-4-e2b'

export const ONE_OFF_CHAT_MODEL = getTextModel(CHAT_MODEL_ID)

export interface OneOffChatController {
  readonly cancelDownloadConsent: () => void
  readonly downloadConsentOpen: Accessor<boolean>
  readonly errorMessage: Accessor<string | null>
  readonly isBusy: Accessor<boolean>
  readonly startDownload: () => Promise<void>
  readonly submit: (text: string) => Promise<boolean>
}

export interface UseOneOffChatProps {
  readonly onReply: (text: string) => Promise<void>
}

/** Generates one reply at a time without retaining its conversation context. */
export const useOneOffChat = (props: UseOneOffChatProps): OneOffChatController => {
  const chat = useChat({modelId: CHAT_MODEL_ID})
  const modelDownload = useModelDownload()
  const [downloadConsentOpen, setDownloadConsentOpen] = createSignal(false)
  const [isCheckingModel, setIsCheckingModel] = createSignal(false)
  const [pendingText, setPendingText] = createSignal<string | null>(null)
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

    return state.status === 'error' ? state.message : null
  }
  const sendPending = () => {
    const text = pendingText()

    if (text === null || !chat.isModelReady()) {
      return
    }

    setPendingText(null)

    if (chat.canClear()) {
      chat.clear()
    }

    chat.setDraft(text)
    chat.send({refineAnswer: true})
  }
  const prepare = () => {
    chat.prepare()
  }
  const submit = async (text: string) => {
    const normalizedText = text.trim()

    if (normalizedText.length === 0 || isBusy() || chat.state().status === 'unsupported') {
      return false
    }

    setPendingText(normalizedText)

    if (chat.isModelReady()) {
      sendPending()
      return true
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
      return true
    } catch (error: unknown) {
      setPendingText(null)
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
    const result = await modelDownload.startTextModel(CHAT_MODEL_ID)

    if (disposed) {
      return
    }

    if (result.status === 'complete') {
      prepare()
      return
    }

    setPendingText(null)
  }
  const cancelDownloadConsent = () => {
    setDownloadConsentOpen(false)
    setPendingText(null)
  }

  createEffect(() => {
    const {status} = chat.state()

    if (status === 'error') {
      setPendingText(null)
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

    handledReplyId = reply.id
    const speech = untrack(() => props.onReply(reply.content))
    chat.clear()
    speech.catch((error: unknown) => {
      console.error('Failed to speak the one-off chat reply.', error)
    })
  })

  onCleanup(() => {
    disposed = true
  })

  return {
    cancelDownloadConsent,
    downloadConsentOpen,
    errorMessage,
    isBusy,
    startDownload,
    submit,
  }
}
