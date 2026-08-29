import {For} from 'solid-js'

import * as m from '@paraglide/message'
import type {DialogueSegment} from '../../features/focus-room-dialogue'
import type {SupertonicModelId, SupertonicVoiceId} from '../../features/supertonic'

const REGENERATE_CLASS = [
  'min-h-10 cursor-pointer border border-solid border-border rounded-full bg-surface',
  'px-4 text-sm font-700 text-foreground disabled:cursor-not-allowed disabled:opacity-40',
].join(' ')
const SAVE_CLASS = [
  'min-h-11 cursor-pointer border-0 rounded-full bg-highlight px-5 font-750 text-[#241a12]',
  'disabled:cursor-not-allowed disabled:opacity-40',
].join(' ')

export interface LanguageLearningCandidate {
  readonly audio: Blob
  readonly audioKey: string
  readonly audioUrl: string
  readonly durationMs: number
  readonly id: string
  readonly modelId: SupertonicModelId
  readonly segments: ReadonlyArray<DialogueSegment>
  readonly selected: boolean
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

export interface LanguageLearningReviewProps {
  readonly busy: boolean
  readonly candidates: ReadonlyArray<LanguageLearningCandidate>
  readonly onRegenerate: (candidateId: string) => void
  readonly onSave: () => void
  readonly onToggle: (candidateId: string) => void
  readonly regeneratingCandidateId: string | null
}

export const LanguageLearningReview = (props: LanguageLearningReviewProps) => {
  const selectedCount = () => props.candidates.filter((candidate) => candidate.selected).length

  return (
    <section class="grid gap-5 rounded-5 border border-solid border-border bg-surface p-5">
      <div class="flex items-center justify-between gap-4">
        <p class="m-0 text-sm text-muted-foreground">{m.learning_editor_review()}</p>
        <strong>
          {m.learning_editor_selected_count({
            selected: selectedCount(),
            total: props.candidates.length,
          })}
        </strong>
      </div>
      <ul class="m-0 grid list-none gap-3 p-0">
        <For each={props.candidates}>
          {(candidate) => (
            <li class="grid gap-3 rounded-4 bg-secondary-soft p-4">
              <label class="flex items-start gap-3">
                <input
                  checked={candidate.selected}
                  class="mt-1 size-5"
                  disabled={props.busy}
                  onChange={() => props.onToggle(candidate.id)}
                  type="checkbox"
                />
                <span>{candidate.text}</span>
              </label>
              <div class="flex flex-wrap items-center gap-3">
                <audio
                  class="min-w-0 flex-1"
                  controls
                  controlslist="nodownload noplaybackrate"
                  preload="metadata"
                  src={candidate.audioUrl}
                />
                <button
                  class={REGENERATE_CLASS}
                  disabled={props.busy}
                  onClick={() => props.onRegenerate(candidate.id)}
                  type="button"
                >
                  {props.regeneratingCandidateId === candidate.id
                    ? m.learning_editor_regenerating_voice()
                    : m.learning_editor_regenerate_voice()}
                </button>
              </div>
            </li>
          )}
        </For>
      </ul>
      <button
        class={SAVE_CLASS}
        disabled={selectedCount() === 0 || props.busy}
        onClick={() => props.onSave()}
        type="button"
      >
        {m.learning_editor_save()}
      </button>
    </section>
  )
}
