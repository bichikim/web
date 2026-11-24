import type {DialogueEditorState, PDialogueEditorController} from 'src/features/focus-room-dialogue'

export interface EditorHarness {
  readonly controller: PDialogueEditorController
  readonly setAudioUrl: (value: string | null) => void
  readonly setCanGenerate: (value: boolean) => void
  readonly setCanRegenerate: (value: boolean) => void
  readonly setCanSave: (value: boolean) => void
  readonly setDuration: (value: number) => void
  readonly setProgress: (value: number) => void
  readonly setRegeneratingIndex: (value: number | null) => void
  readonly setSegments: PDialogueEditorController['segments'] extends () => infer Value
    ? (value: Value) => void
    : never
  readonly setState: (value: DialogueEditorState) => void
  readonly setTextValue: (value: string) => void
}
