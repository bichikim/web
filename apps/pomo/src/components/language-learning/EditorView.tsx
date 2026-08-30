import {Show} from 'solid-js'

import * as m from '@paraglide/message'
import {formatModelDownloadSize} from '../../features/model-storage'
import {getSupertonicModel} from '../../features/supertonic'
import {getTextModel} from '../../features/text-generation'
import {PGenerationStatus} from '../PGenerationStatus'
import {PModelDownloadConsent} from '../PModelDownloadConsent'
import {LanguageLearningEditorHeader} from './EditorHeader'
import {LanguageLearningGenerateButton} from './GenerateButton'
import {LanguageLearningReview} from './Review'
import {LanguageLearningSettings} from './Settings'
import {type LanguageLearningEditorState, TEXT_MODEL_ID} from './use-editor-state'
import {LanguageLearningWordSourceControl} from './WordSource'

const TEXT_MODEL = getTextModel(TEXT_MODEL_ID)
const CLASSES = {
  page: 'min-h-dvh box-border bg-[#17130f] p-[max(1.25rem,var(--pomo-safe-area-inset-top))] text-foreground',
  panel: 'grid gap-5 rounded-5 border border-solid border-border bg-surface p-5',
} as const

export interface LanguageLearningEditorViewProps {
  readonly onDownloadCancel: () => void
  readonly onDownloadConfirm: () => void
  readonly onGenerate: () => void
  readonly onRegenerateCandidate: (candidateId: string) => void
  readonly onSave: () => void
  readonly onToggleCandidate: (candidateId: string) => void
  readonly state: LanguageLearningEditorState
}

export const LanguageLearningEditorView = (props: LanguageLearningEditorViewProps) => (
  <main class={CLASSES.page}>
    <div class="mx-auto grid w-full max-w-4xl gap-5">
      <LanguageLearningEditorHeader />

      <section class={CLASSES.panel}>
        <LanguageLearningWordSourceControl
          disabled={props.state.isBusy() || props.state.phase() === 'review'}
          inputValue={props.state.tagInput()}
          onInputChange={props.state.setTagInput}
          onSourceChange={props.state.handleWordSourceChange}
          onWordsChange={props.state.setTags}
          savedWordCount={props.state.savedWords().length}
          source={props.state.wordSource()}
          words={props.state.tags()}
        />

        <LanguageLearningSettings
          count={props.state.count()}
          disabled={props.state.isBusy()}
          language={props.state.language()}
          modelId={props.state.modelId()}
          onCountChange={props.state.setCount}
          onLanguageChange={props.state.handleLanguageChange}
          onModelChange={props.state.setModelId}
          onVoiceChange={props.state.setVoiceId}
          sentenceDisabled={props.state.phase() === 'review'}
          voiceId={props.state.voiceId()}
        />

        <PGenerationStatus
          kind={props.state.generationStatus().kind}
          message={props.state.generationStatus().message}
          progress={props.state.generationStatus().progress}
          progressLabel={props.state.generationStatus().progressLabel}
        />
        <LanguageLearningGenerateButton
          disabled={props.state.isBusy()}
          onPress={props.onGenerate}
        />
      </section>

      <Show when={props.state.phase() === 'review'}>
        <LanguageLearningReview
          busy={props.state.isBusy()}
          candidates={props.state.candidates()}
          onRegenerate={props.onRegenerateCandidate}
          onSave={props.onSave}
          onToggle={props.onToggleCandidate}
          regeneratingCandidateId={props.state.regeneratingCandidateId()}
        />
      </Show>
    </div>

    <PModelDownloadConsent
      actionLabel={
        props.state.pendingDownload()?.kind === 'voice-candidate'
          ? m.learning_editor_regenerate_voice()
          : m.learning_editor_generate()
      }
      downloadSize={
        props.state.pendingDownload()?.kind === 'voice-all' ||
        props.state.pendingDownload()?.kind === 'voice-candidate'
          ? formatModelDownloadSize(getSupertonicModel(props.state.modelId()).size)
          : TEXT_MODEL.downloadSize
      }
      isOpen={props.state.pendingDownload() !== null}
      onCancel={props.onDownloadCancel}
      onConfirm={props.onDownloadConfirm}
    />
  </main>
)
