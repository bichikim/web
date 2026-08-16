import type {Accessor} from 'solid-js'

import type {SupertonicLanguage, SupertonicModelId, SupertonicVoiceId} from '../supertonic'
import type {TextMoodRuntime} from '../text-mood'
import type {DialogueEditorState} from './dialogue-editor-state'
import type {DialogueSegment} from './schema'

export interface UsePDialogueEditorProps {
  readonly moodRuntime?: TextMoodRuntime
  readonly dialogueId: Accessor<string | null>
}

export interface PDialogueEditorController {
  readonly audioUrl: Accessor<string | null>
  readonly canGenerate: Accessor<boolean>
  readonly canRegenerateSegments: Accessor<boolean>
  readonly canSave: Accessor<boolean>
  readonly dialogueId: Accessor<string | null>
  readonly durationMs: Accessor<number>
  readonly generate: () => Promise<void>
  readonly language: Accessor<SupertonicLanguage>
  readonly modelId: Accessor<SupertonicModelId>
  readonly progress: Accessor<number>
  readonly regenerateSegment: (position: number) => Promise<void>
  readonly regeneratingSegmentIndex: Accessor<number | null>
  readonly save: () => Promise<string | null>
  readonly segments: Accessor<ReadonlyArray<DialogueSegment>>
  readonly setLanguage: (language: SupertonicLanguage) => void
  readonly setModelId: (modelId: SupertonicModelId) => void
  readonly setText: (text: string) => void
  readonly setVoiceId: (voiceId: SupertonicVoiceId) => void
  readonly state: Accessor<DialogueEditorState>
  readonly text: Accessor<string>
  readonly voiceId: Accessor<SupertonicVoiceId>
}
