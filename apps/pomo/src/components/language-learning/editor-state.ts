import type {ModelDownloadState} from '../../features/model-download'

export type LanguageLearningEditorPhase = 'error' | 'idle' | 'review' | 'saving' | 'text' | 'voice'

export interface LanguageLearningGenerationStatus {
  readonly kind: 'draft' | 'voice'
  readonly message: string
  readonly progress: number | null
  readonly progressLabel: string
}

export interface GetLanguageLearningGenerationStatusOptions {
  readonly downloadState: ModelDownloadState
  readonly message: string
  readonly phase: LanguageLearningEditorPhase
}

export const getLanguageLearningGenerationStatus = (
  options: GetLanguageLearningGenerationStatusOptions,
): LanguageLearningGenerationStatus => {
  if (options.downloadState.status === 'loading') {
    return {
      kind: options.downloadState.target.kind === 'voice' ? 'voice' : 'draft',
      message: `${options.downloadState.label} 모델 받는 중 · ${options.downloadState.percentage}%`,
      progress: options.downloadState.percentage,
      progressLabel: '모델 다운로드 진행률',
    }
  }

  return {
    kind: options.phase === 'voice' ? 'voice' : 'draft',
    message: options.message,
    progress: null,
    progressLabel: options.message,
  }
}

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
