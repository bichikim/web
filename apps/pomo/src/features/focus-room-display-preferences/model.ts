import type {Accessor} from 'solid-js'

export interface PDisplayPreferences {
  readonly dialogueComposerVisible: boolean
}

export interface PDisplayPreferencesController {
  readonly dialogueComposerVisible: Accessor<boolean>
  readonly isReady: Accessor<boolean>
  readonly onDialogueComposerVisibleChange: (visible: boolean) => void
}

export const DEFAULT_P_DISPLAY_PREFERENCES = {
  dialogueComposerVisible: false,
} as const satisfies PDisplayPreferences
