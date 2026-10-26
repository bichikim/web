import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import type {CodexPort, CodexSnapshot} from './types'

export const codexPort: CodexPort = {
  answerQuestion: (requestId, answers) => invoke('answer_codex_question', {answers, requestId}),
  available: isTauri(),
  configureQuestions: (enabled) => invoke('configure_codex_questions', {enabled}),
  connect: () => invoke('connect_codex_notifications'),
  decideApproval: (requestId, decision) => invoke('decide_codex_approval', {decision, requestId}),
  disconnect: () => invoke('disconnect_codex_notifications'),
  dismiss: (sessionId, notificationId) =>
    invoke('dismiss_poffo_speech', {notificationId, sessionId}),
  openChat: (sessionId) => invoke('open_codex_chat', {sessionId}),
  read: () => invoke('codex_bridge_status'),
  readTitle: (sessionId) => invoke('codex_thread_title', {sessionId}),
  sendPrompt: (sessionId, message) => invoke('send_codex_prompt', {message, sessionId}),
  subscribe: async (receive) =>
    listen<CodexSnapshot>('poffo-codex-state', ({payload}) => receive(payload)),
}
