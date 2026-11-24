import {type Accessor, batch, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import {createLocalInference} from '../inference/create-local-inference'
import type {ConversationMessage, LocalInference} from '../inference/types'
import {
  DEFAULT_POFFO_CONVERSATION,
  type PoffoConversation,
} from '@winter-love/wallpaper/settings/conversation'
import {codexConversation} from './codex'
import {spokenText, type VoiceMessage} from '../voice/text'

export const CHARACTER_SPEECH_ID = 'character-conversation'
const HISTORY_LIMIT = 12
interface UseCharacterChatProps {
  /** Selects local inference by default; changing it cancels generation and retains dialogue. */
  readonly conversation?: Accessor<PoffoConversation | undefined>
  /** Identifies the character widget; changes clear dialogue and cancel pending work. */
  readonly widgetId: Accessor<string | undefined>
  /** Recording supersedes the previous narration without clearing visible text; omission leaves it unchanged. */
  readonly recording?: Accessor<boolean>
}

/** Owns one response bubble and bounded dialogue, separate from Codex work chats. */
export const useCharacterChat = (props: UseCharacterChatProps) => {
  let local: LocalInference | null = null
  const choice = () => props.conversation?.() ?? DEFAULT_POFFO_CONVERSATION
  const identity = createMemo(() => {
    const value = choice()
    return value.provider === 'local' ? 'local' : `codex:${value.codexModel ?? ''}`
  })
  const [draft, setDraft] = createSignal('')
  const [response, setResponse] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const [notice, setNotice] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)
  const [message, setMessage] = createSignal<VoiceMessage | null>(null)
  let history: readonly ConversationMessage[] = []
  let controller: AbortController | null = null
  let revision = 0
  createEffect(() => {
    if (props.recording?.() === true) {
      setMessage(null)
    }
  })
  const cancel = () => {
    controller?.abort()
    controller = null
    setBusy(false)
    setNotice('')
  }
  /** Ends the current reply and narration so a fresh utterance replaces the sent draft. */
  const interrupt = () =>
    batch(() => {
      cancel()
      setDraft('')
      setMessage(null)
      setError(null)
    })
  createEffect(
    on([props.widgetId, identity], (current, previous) => {
      cancel()
      local?.dispose()
      local = null
      if (current[0] !== previous?.[0]) {
        history = []
        setDraft('')
        setResponse('')
      }
      setMessage(null)
      setError(null)
    }),
  )
  onCleanup(() => {
    cancel()
    local?.dispose()
  })
  const edit = (value: string) => {
    if (!busy()) {
      setDraft(value)
    }
  }
  const send = async () => {
    const text = draft().trim()
    if (busy() || text === '' || props.widgetId() === undefined) {
      return
    }
    const request = new AbortController()
    const selected = choice()
    controller = request
    setMessage(null)
    setBusy(true)
    setError(null)
    setNotice(selected.provider === 'codex' ? 'Codex 답변 생성 중' : '모델 준비 중')
    const messages: readonly ConversationMessage[] = [...history, {content: text, role: 'user'}]
    try {
      const answer =
        selected.provider === 'codex'
          ? await codexConversation.reply(messages, request.signal, selected.codexModel)
          : await (local ??= createLocalInference()).run(
              {messages, type: 'chat'},
              request.signal,
              setNotice,
            )
      if (!request.signal.aborted) {
        revision += 1
        history = [
          ...messages,
          {content: answer, role: 'assistant'} satisfies ConversationMessage,
        ].slice(-HISTORY_LIMIT)
        setResponse(answer)
        setDraft('')
        setMessage({
          chat: CHARACTER_SPEECH_ID,
          id: `${props.widgetId()}:${revision}`,
          text: spokenText(answer),
        })
      }
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '캐릭터 응답을 만들지 못했어요.')
      }
    } finally {
      if (controller === request) {
        controller = null
        setBusy(false)
        setNotice('')
      }
    }
  }
  return {busy, cancel, draft, edit, error, interrupt, message, notice, response, send}
}
