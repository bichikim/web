import {LanguageLearningEditorView} from './EditorView'
import {useCandidateReview} from './use-candidate-review'
import {useLanguageLearningEditorState} from './use-editor-state'
import {useModelDownload} from './use-model-download'
import {useSentenceGeneration} from './use-sentence-generation'
import {useVoiceGeneration} from './use-voice-generation'

export default function LanguageLearningEditor() {
  const state = useLanguageLearningEditorState()
  const voiceGeneration = useVoiceGeneration({state})
  const sentenceGeneration = useSentenceGeneration({
    ensureVoiceModel: voiceGeneration.ensureVoiceModel,
    state,
  })
  const candidateReview = useCandidateReview({state})
  const modelDownload = useModelDownload({
    beginTextGeneration: sentenceGeneration.beginTextGeneration,
    generateCandidateVoice: candidateReview.generateCandidateVoice,
    generateVoices: voiceGeneration.generateVoices,
    state,
  })

  return (
    <LanguageLearningEditorView
      onDownloadCancel={modelDownload.handleDownloadCancel}
      onDownloadConfirm={modelDownload.handleDownloadConfirm}
      onGenerate={sentenceGeneration.handleGenerate}
      onRegenerateCandidate={candidateReview.handleRegenerateCandidate}
      onSave={candidateReview.handleSave}
      onToggleCandidate={candidateReview.toggleCandidate}
      state={state}
    />
  )
}
