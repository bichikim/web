import * as m from '@paraglide/message'
import {isSupertonicModelDownloaded} from '../../features/supertonic'
import {revokeLanguageLearningAudioUrls} from './candidate'
import type {LanguageLearningEditorState} from './use-editor-state'
import {generateVoiceCandidates} from './voice-generation'

export interface UseVoiceGenerationProps {
  readonly state: LanguageLearningEditorState
}

export const useVoiceGeneration = (props: UseVoiceGenerationProps) => {
  const generateVoices = async () => {
    props.state.setPhase('voice')
    const selectedModelId = props.state.modelId()
    const selectedVoiceId = props.state.voiceId()
    const generatedSentences = props.state.sentences()
    const result = await generateVoiceCandidates({
      isDisposed: () => props.state.workflow.isDisposed,
      language: props.state.language(),
      modelId: selectedModelId,
      onProgress: (current, total) => {
        props.state.setMessage(m.learning_editor_voice_progress({current, total}))
      },
      onStatus: props.state.setMessage,
      sentences: generatedSentences,
      voiceId: selectedVoiceId,
    })

    if (props.state.workflow.isDisposed) {
      if (result.status === 'complete') {
        revokeLanguageLearningAudioUrls(result.candidates)
      }
      return
    }

    switch (result.status) {
      case 'cancelled':
        return
      case 'error':
        props.state.fail(result.message)
        return
      case 'complete':
        props.state.clearCandidates()
        props.state.setCandidates(result.candidates)
        props.state.setMessage(m.learning_editor_review())
        props.state.setPhase('review')
    }
  }
  const ensureVoiceModel = async () => {
    const isDownloaded = await isSupertonicModelDownloaded({modelId: props.state.modelId()})

    if (props.state.workflow.isDisposed) {
      return
    }

    if (isDownloaded) {
      await generateVoices()
    } else {
      props.state.setPendingDownload({kind: 'voice-all'})
    }
  }

  return {ensureVoiceModel, generateVoices}
}
