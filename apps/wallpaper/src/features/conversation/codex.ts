import {invoke, isTauri} from '@tauri-apps/api/core'
import type {ConversationMessage} from '../inference/types'

export interface CodexModel {
  readonly id: string
  readonly name: string
  readonly default: boolean
}
const errorMessage = (cause: unknown) => {
  switch (cause) {
    case 'invalidRequest':
      return '대화 내용이 너무 길거나 올바르지 않아요.'
    case 'loginRequired':
      return 'Codex에 먼저 로그인해 주세요.'
    case 'modelUnavailable':
      return '선택한 Codex 모델을 사용할 수 없어요. 모델을 다시 선택해 주세요.'
    case 'cancelled':
      return '응답 생성을 취소했어요.'
    default:
      return 'Codex 대화에 연결하지 못했어요. 로그인과 연결 상태를 확인해 주세요.'
  }
}

/** Uses the installed Codex login; all remote generation is explicitly selected by the user. */
export const codexConversation = {
  available: () => isTauri(),
  async models(): Promise<readonly CodexModel[]> {
    if (!isTauri()) {
      return []
    }
    try {
      return await invoke<readonly CodexModel[]>('list_codex_conversation_models')
    } catch (cause) {
      throw new Error(errorMessage(cause), {cause})
    }
  },
  async reply(
    messages: readonly ConversationMessage[],
    signal: AbortSignal,
    model?: string,
  ): Promise<string> {
    signal.throwIfAborted()
    if (!isTauri()) {
      throw new Error('Codex 대화는 데스크톱 앱에서 사용할 수 있어요.')
    }
    const id = crypto.randomUUID()
    const cancel = () => {
      invoke('cancel_codex_conversation', {id}).catch((cause: unknown) =>
        console.error('Codex conversation cancellation failed', cause),
      )
    }
    signal.addEventListener('abort', cancel, {once: true})
    try {
      const text = await invoke<string>('generate_codex_conversation', {
        request: {id, messages, model},
      })
      signal.throwIfAborted()
      return text
    } catch (cause) {
      signal.throwIfAborted()
      throw new Error(errorMessage(cause), {cause})
    } finally {
      signal.removeEventListener('abort', cancel)
    }
  },
}
