export interface AgentSessionSummary {
  readonly conversationId: string
  readonly sessionId: string
  readonly title: string
  readonly cwd: string | null
  readonly updatedAt: string
}
