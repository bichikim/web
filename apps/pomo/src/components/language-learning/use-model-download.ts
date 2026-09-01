import * as m from '@paraglide/message'
import type {ModelDownloadController} from '../../features/model-download/controller'
import type {SupertonicModelId} from '../../features/supertonic'
import type {LanguageLearningEditorPhase, LanguageLearningPendingDownload} from './editor-state'
import {TEXT_MODEL_ID} from './use-editor-state'

interface LanguageLearningDownloadController {
  readonly startTextModel: ModelDownloadController['startTextModel']
  readonly startVoiceModel: ModelDownloadController['startVoiceModel']
}

interface LanguageLearningWorkflowStatus {
  readonly isDisposed: boolean
}

export interface LanguageLearningDownloadState {
  readonly fail: (message: string) => void
  readonly modelDownload: LanguageLearningDownloadController
  readonly modelId: () => SupertonicModelId
  readonly pendingDownload: () => LanguageLearningPendingDownload
  readonly setDownloadContinuationActive: (active: boolean) => void
  readonly setMessage: (message: string) => void
  readonly setPendingDownload: (download: LanguageLearningPendingDownload) => void
  readonly setPhase: (phase: LanguageLearningEditorPhase) => void
  readonly setRegeneratingCandidateId: (candidateId: string | null) => void
  readonly workflow: LanguageLearningWorkflowStatus
}

export interface UseModelDownloadProps {
  readonly beginTextGeneration: () => void
  readonly generateCandidateVoice: (candidateId: string) => Promise<void>
  readonly generateVoices: () => Promise<void>
  readonly state: LanguageLearningDownloadState
}

export const useModelDownload = (props: UseModelDownloadProps) => {
  let activeSession: object | null = null

  const handleDownloadCancel = () => {
    const target = props.state.pendingDownload()
    props.state.setPendingDownload(null)

    if (target?.kind === 'voice-all') {
      props.state.setMessage(m.learning_editor_idle())
      props.state.setPhase('idle')
    } else if (target?.kind === 'voice-candidate') {
      props.state.setRegeneratingCandidateId(null)
    }
  }
  const handleDownloadConfirm = async () => {
    const target = props.state.pendingDownload()

    if (activeSession !== null) {
      props.state.setPendingDownload(null)
      return
    }

    props.state.setPendingDownload(null)

    if (target === null) {
      return
    }

    const session = {}
    activeSession = session
    props.state.setDownloadContinuationActive(true)

    try {
      const result =
        target.kind === 'text'
          ? await props.state.modelDownload.startTextModel(TEXT_MODEL_ID)
          : await props.state.modelDownload.startVoiceModel(props.state.modelId())

      if (props.state.workflow.isDisposed) {
        return
      }

      if (result.status !== 'complete') {
        if (result.status === 'error') {
          if (target.kind === 'voice-candidate') {
            props.state.setMessage(result.message)
          } else {
            props.state.fail(result.message)
          }
        } else if (result.status === 'cancelled' && target.kind === 'voice-all') {
          props.state.setMessage(m.learning_editor_idle())
          props.state.setPhase('idle')
        }
        if (target.kind === 'voice-candidate') {
          props.state.setRegeneratingCandidateId(null)
        }
        return
      }

      switch (target.kind) {
        case 'text':
          props.beginTextGeneration()
          return
        case 'voice-all':
          await props.generateVoices()
          return
        case 'voice-candidate':
          await props.generateCandidateVoice(target.candidateId)
      }
    } finally {
      if (activeSession === session) {
        activeSession = null
        props.state.setDownloadContinuationActive(false)
      }
    }
  }

  return {handleDownloadCancel, handleDownloadConfirm}
}
