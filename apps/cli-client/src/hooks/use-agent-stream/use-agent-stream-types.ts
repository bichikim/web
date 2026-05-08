import type {ChatMessage} from '@/components/agent/AgentChatSection'

export interface UseAgentStreamProperties {
  readonly getPostUrl: () => string
  readonly getWorkingDirectory: () => string
  readonly getConversationId: () => string
  readonly getResumeSessionId: () => string | null
  readonly clearResumeSessionId: () => void
  readonly getMessages: () => readonly ChatMessage[]
  readonly setMessages: (setter: (previous: ChatMessage[]) => ChatMessage[]) => void
  readonly setPromptText: (value: string) => void
  readonly setStatus: (value: 'idle' | 'running' | 'done') => void
  readonly setStreamError: (value: string | null) => void
  readonly setCurrentSessionId: (value: string | null) => void
  readonly setCurrentSessionTitle: (value: string | null) => void
}

export interface AgentStreamControl {
  activeController: AbortController | undefined
}
