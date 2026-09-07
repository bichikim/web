import {useNavigate} from '@solidjs/router'

import * as m from '@paraglide/message'
import {createPDialogueRepository} from '../../features/focus-room-dialogue'
import {isSupertonicModelDownloaded} from '../../features/supertonic'
import {saveLanguageLearningCandidates} from './save'
import type {LanguageLearningEditorState} from './use-editor-state'
import {regenerateCandidateVoice} from './voice-generation'

export interface UseCandidateReviewProps {
  readonly state: LanguageLearningEditorState
}

export const useCandidateReview = (props: UseCandidateReviewProps) => {
  const navigate = useNavigate()
  const generateCandidateVoice = async (candidateId: string) => {
    const candidate = props.state.candidates().find((item) => item.id === candidateId)

    if (candidate === undefined) {
      props.state.setRegeneratingCandidateId(null)
      return
    }

    const selectedModelId = props.state.modelId()
    const selectedVoiceId = props.state.voiceId()
    props.state.setRegeneratingCandidateId(candidateId)
    props.state.setMessage(m.learning_editor_regenerating_voice())
    const result = await regenerateCandidateVoice({
      candidate,
      isDisposed: () => props.state.workflow.isDisposed,
      language: props.state.language(),
      modelId: selectedModelId,
      onStatus: props.state.setMessage,
      voiceId: selectedVoiceId,
    })

    if (props.state.workflow.isDisposed) {
      if (result.status === 'complete') {
        URL.revokeObjectURL(result.candidate.audioUrl)
      }
      return
    }

    props.state.setRegeneratingCandidateId(null)
    switch (result.status) {
      case 'cancelled':
        return
      case 'error':
        props.state.setMessage(result.message)
        return
      case 'complete':
        props.state.setCandidates((current) =>
          current.map((item) => (item.id === candidateId ? result.candidate : item)),
        )
        URL.revokeObjectURL(candidate.audioUrl)
        props.state.setMessage(m.learning_editor_voice_regenerated())
    }
  }
  const handleRegenerateCandidate = async (candidateId: string) => {
    props.state.setRegeneratingCandidateId(candidateId)

    try {
      const isDownloaded = await isSupertonicModelDownloaded({modelId: props.state.modelId()})

      if (props.state.workflow.isDisposed) {
        return
      }

      if (isDownloaded) {
        await generateCandidateVoice(candidateId)
      } else {
        props.state.setPendingDownload({candidateId, kind: 'voice-candidate'})
      }
    } catch (error: unknown) {
      console.error('Failed to check the language learning voice model.', error)
      props.state.setMessage(m.learning_editor_voice_failed())
      props.state.setRegeneratingCandidateId(null)
    }
  }
  const handleSave = async () => {
    const selected = props.state.candidates().filter((candidate) => candidate.selected)

    if (selected.length === 0) {
      return
    }

    props.state.setPhase('saving')
    const repository = createPDialogueRepository()

    try {
      await saveLanguageLearningCandidates({
        candidates: selected,
        createdAt: new Date().toISOString(),
        language: props.state.language(),
        repository,
        tags: props.state.tags(),
      })
      if (!props.state.workflow.isDisposed) {
        navigate('/')
      }
    } catch (error: unknown) {
      console.error('Failed to save language learning sentences.', error)
      props.state.fail(m.learning_editor_save_failed())
    } finally {
      repository.dispose()
    }
  }
  const toggleCandidate = (id: string) => {
    props.state.setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? {...candidate, selected: !candidate.selected} : candidate,
      ),
    )
  }

  return {generateCandidateVoice, handleRegenerateCandidate, handleSave, toggleCandidate}
}
