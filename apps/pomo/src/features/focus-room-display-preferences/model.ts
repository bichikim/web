import type {Accessor} from 'solid-js'

export interface PDisplayPreferences {
  readonly tourButtonVisible: boolean
  readonly dialogueComposerVisible: boolean
}

export interface PDisplayPreferencesController {
  readonly dialogueComposerVisible: Accessor<boolean>
  readonly tourButtonVisible: Accessor<boolean>
  readonly onTourButtonVisibleChange: (visible: boolean) => void
  readonly isReady: Accessor<boolean>
  readonly onDialogueComposerVisibleChange: (visible: boolean) => void
}

export const DEFAULT_P_DISPLAY_PREFERENCES = {
  dialogueComposerVisible: false,
  tourButtonVisible: true,
} as const satisfies PDisplayPreferences
