export type CodexPhase = 'idle' | 'working' | 'approval' | 'question' | 'response' | 'interrupted'
export interface CodexSpeechTarget {
  readonly anchor?: 'top' | 'bottom'
  readonly x: number
  readonly y: number
  readonly maxHeight?: number
  readonly insetTop?: number
  readonly insetBottom?: number
}
export interface CodexActivity {
  readonly toolActive?: boolean
  readonly toolFailed?: boolean
  readonly sessionId: string
  readonly phase: CodexPhase
  readonly text: string
  readonly tool: string | null
  readonly receivedAt: number
  readonly notificationId: number
  readonly title?: string | null
  readonly response?: string | null
}
export interface CodexReceipt {
  readonly hook_event_name: string
  readonly session_id: string
  readonly turn_id: string | null
  readonly tool_name: string | null
  readonly emitted_at: number
}
export interface CodexSnapshot {
  readonly questionsEnabled?: boolean
  readonly questions?: readonly CodexQuestionRequest[]
  readonly approvalEnabled?: boolean
  readonly approvals?: readonly CodexApproval[]
  readonly registered: boolean
  readonly received: boolean
  readonly activity: CodexActivity | null
  readonly recent: readonly CodexReceipt[]
  readonly sessions: readonly CodexActivity[]
}
export interface CodexPort {
  readonly openChat?: (sessionId: string) => void | Promise<void>
  readonly sendPrompt?: (sessionId: string, message: string) => Promise<void>
  readonly configureQuestions?: (enabled: boolean) => Promise<CodexSnapshot>
  readonly answerQuestion?: (
    requestId: string,
    answers: Readonly<Record<string, string>>,
  ) => Promise<void>
  readonly decideApproval?: (requestId: string, decision: CodexApprovalDecision) => Promise<void>
  readonly available: boolean
  readonly read: () => Promise<CodexSnapshot>
  readonly connect: () => Promise<CodexSnapshot>
  readonly disconnect: () => Promise<CodexSnapshot>
  readonly subscribe: (receive: (value: CodexSnapshot) => void) => Promise<() => void>
  readonly readTitle?: (sessionId: string) => Promise<string | null>
  readonly dismiss?: (sessionId: string, notificationId: number) => Promise<CodexSnapshot>
}

export interface CodexQuestionChoice {
  readonly label: string
  readonly description?: string
}
export interface CodexQuestion {
  readonly id: string
  readonly question: string
  readonly options: readonly CodexQuestionChoice[]
}
export interface CodexQuestionRequest {
  readonly id: string
  readonly sessionId: string
  readonly turnId: string
  readonly questions: readonly CodexQuestion[]
}

export type CodexApprovalDecision = 'allow' | 'deny' | 'codex'
export interface CodexApproval {
  readonly id: string
  readonly sessionId: string
  readonly turnId: string | null
  readonly tool: string
  readonly cwd: string
  readonly input: unknown
}
