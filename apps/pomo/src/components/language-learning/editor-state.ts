export type LanguageLearningEditorPhase = 'error' | 'idle' | 'review' | 'saving' | 'text' | 'voice'

export interface LanguageLearningEditorWorkflow {
  handledOutput: boolean
  isDisposed: boolean
  retryCount: number
}

export const isLanguageLearningEditorBusy = (
  phase: LanguageLearningEditorPhase,
  regeneratingCandidateId: string | null,
) => phase === 'text' || phase === 'voice' || phase === 'saving' || regeneratingCandidateId !== null

export const queueLanguageLearningEditorTask = (
  workflow: LanguageLearningEditorWorkflow,
  callback: () => void,
) => {
  queueMicrotask(() => {
    if (!workflow.isDisposed) {
      callback()
    }
  })
}

interface PendingCandidateVoiceDownload {
  readonly candidateId: string
  readonly kind: 'voice-candidate'
}

interface PendingTextDownload {
  readonly kind: 'text'
}

interface PendingVoiceDownload {
  readonly kind: 'voice-all'
}

export type LanguageLearningPendingDownload =
  | PendingCandidateVoiceDownload
  | PendingTextDownload
  | PendingVoiceDownload
  | null
