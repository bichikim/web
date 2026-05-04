import type {RouteSectionProps} from '@solidjs/router'
import {createEffect, createSignal} from 'solid-js'
import {AgentChatSection, type ChatMessage} from '@/components/agent/AgentChatSection'
import {AgentHeader} from '@/components/agent/AgentHeader'
import {SessionsModal} from '@/components/agent/SessionsModal'
import {SettingsModal} from '@/components/agent/SettingsModal'
import type {AgentSessionSummary} from '@/components/agent/types'
import {
  fetchSessionHistory,
  loadInitialPostUrl,
  loadInitialWorkingDirectory,
  persistPostUrl,
  persistWorkingDirectory,
} from '@/utils/agent-page'
import {useAgentSessions} from '@/hooks/use-agent-sessions'
import {useAgentStream} from '@/hooks/use-agent-stream'

// oxlint-disable-next-line max-lines-per-function
export default function AgentPage(_properties: RouteSectionProps) {
  const [promptText, setPromptText] = createSignal('')
  const [postUrl, setPostUrl] = createSignal(loadInitialPostUrl())
  const [workingDirectory, setWorkingDirectory] = createSignal(loadInitialWorkingDirectory())
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false)
  const [isSessionsOpen, setIsSessionsOpen] = createSignal(false)
  const [sessions, setSessions] = createSignal<readonly AgentSessionSummary[]>([])
  const [isSessionsLoading, setIsSessionsLoading] = createSignal(false)
  const [sessionsError, setSessionsError] = createSignal<string | null>(null)
  const [messages, setMessages] = createSignal<ChatMessage[]>([])
  const [status, setStatus] = createSignal<'idle' | 'running' | 'done'>('idle')
  const [streamError, setStreamError] = createSignal<string | null>(null)
  const [conversationId, setConversationId] = createSignal(crypto.randomUUID())
  const [resumeSessionId, setResumeSessionId] = createSignal<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = createSignal<string | null>(null)
  const [currentSessionTitle, setCurrentSessionTitle] = createSignal<string | null>(null)

  let scrollRoot: HTMLDivElement | undefined

  const scrollChatToBottom = () => {
    queueMicrotask(() => {
      const root = scrollRoot

      if (root !== undefined) {
        root.scrollTo({behavior: 'smooth', top: root.scrollHeight})
      }
    })
  }

  createEffect(() => {
    messages()
    scrollChatToBottom()
  })

  const clearResumeSessionId = () => {
    setResumeSessionId(null)
  }

  const {abortRun, submitPrompt: runPrompt} = useAgentStream({
    clearResumeSessionId,
    getConversationId: conversationId,
    getMessages: messages,
    getPostUrl: postUrl,
    getResumeSessionId: () => resumeSessionId(),
    getWorkingDirectory: workingDirectory,
    setCurrentSessionId,
    setCurrentSessionTitle,
    setMessages,
    setPromptText,
    setStatus,
    setStreamError,
  })

  const {openSessionsPopup} = useAgentSessions({
    getPostUrl: postUrl,
    getWorkingDirectory: workingDirectory,
    setIsSessionsLoading,
    setIsSessionsOpen,
    setSessions,
    setSessionsError,
  })

  const updatePostUrl = (value: string) => {
    setPostUrl(value)
    persistPostUrl(value)
  }

  const updateWorkingDirectory = (value: string) => {
    setWorkingDirectory(value)
    persistWorkingDirectory(value)
  }

  const startNewConversation = () => {
    abortRun()
    setStreamError(null)
    setStatus('idle')
    setConversationId(crypto.randomUUID())
    setResumeSessionId(null)
    setCurrentSessionId(null)
    setCurrentSessionTitle(null)
    setMessages([])
    setPromptText('')
  }

  const handleSelectSession = async (session: AgentSessionSummary) => {
    abortRun()
    setStreamError(null)
    setIsSessionsOpen(false)
    setConversationId(crypto.randomUUID())
    setResumeSessionId(session.sessionId)
    setCurrentSessionId(session.sessionId)
    setCurrentSessionTitle(session.title)
    setPromptText('')

    const result = await fetchSessionHistory({
      postUrl: postUrl(),
      sessionId: session.sessionId,
      workingDirectory: workingDirectory(),
    })

    if ('error' in result) {
      setStreamError(result.error)
      setMessages([])
      setResumeSessionId(null)

      return
    }

    setMessages(result.messages)
  }

  const submitPrompt = async (event: Event & {currentTarget: HTMLFormElement}) => {
    await runPrompt({event, promptText: promptText()})
  }

  const isRunning = () => status() === 'running'

  const onPromptKeyDown = (event: KeyboardEvent & {currentTarget: HTMLTextAreaElement}) => {
    if (event.key !== 'Enter') {
      return
    }

    if (event.isComposing) {
      return
    }

    if (event.shiftKey) {
      return
    }

    if (isRunning()) {
      return
    }

    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <main class="flex flex-col h-[100dvh] max-w-[720px] mx-auto px-3 sm:px-4">
      <AgentHeader
        sessionTitle={currentSessionTitle()}
        sessionId={currentSessionId()}
        hasMessages={messages().length > 0}
        isRunning={isRunning()}
        isSessionsOpen={isSessionsOpen()}
        isSettingsOpen={isSettingsOpen()}
        onClickNewChat={startNewConversation}
        onClickSessions={() => {
          if (isSessionsOpen()) {
            setIsSessionsOpen(false)
            return
          }

          openSessionsPopup()
        }}
        onClickSettings={() => setIsSettingsOpen((previous) => !previous)}
      />

      <div class="relative flex-1 min-h-0 flex flex-col">
        <AgentChatSection
          messages={messages()}
          promptText={promptText()}
          isRunning={isRunning()}
          streamError={streamError()}
          onMountScrollRoot={(element) => {
            scrollRoot = element
          }}
          onInputPrompt={setPromptText}
          onClickAbort={abortRun}
          onSubmitPrompt={submitPrompt}
          onPromptKeyDown={onPromptKeyDown}
        />

        <SessionsModal
          isOpen={isSessionsOpen()}
          isLoading={isSessionsLoading()}
          sessions={sessions()}
          error={sessionsError()}
          onClose={() => setIsSessionsOpen(false)}
          onSelectSession={(session) => {
            handleSelectSession(session)
          }}
        />

        <SettingsModal
          isOpen={isSettingsOpen()}
          isRunning={isRunning()}
          postUrl={postUrl()}
          workingDirectory={workingDirectory()}
          onClose={() => setIsSettingsOpen(false)}
          onInputPostUrl={updatePostUrl}
          onInputWorkingDirectory={updateWorkingDirectory}
        />
      </div>
    </main>
  )
}
