import * as m from '@paraglide/message'
import {type LanguageLearningEditorState, TEXT_MODEL_ID} from './use-editor-state'

export interface UseModelDownloadProps {
  readonly beginTextGeneration: () => void
  readonly generateCandidateVoice: (candidateId: string) => Promise<void>
  readonly generateVoices: () => Promise<void>
  readonly state: LanguageLearningEditorState
}

export const useModelDownload = (props: UseModelDownloadProps) => {
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
    props.state.setPendingDownload(null)

    if (target === null) {
      return
    }

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
  }

  return {handleDownloadCancel, handleDownloadConfirm}
}
