import type {Accessor} from 'solid-js'

export interface PDisplayPreferences {
  readonly toolsButtonVisible: boolean
  readonly memoryAssistVisible: boolean
  readonly tourButtonVisible: boolean
  readonly dialogueComposerVisible: boolean
}

export interface PDisplayPreferencesController {
  readonly dialogueComposerVisible: Accessor<boolean>
  readonly toolsButtonVisible: Accessor<boolean>
  readonly onToolsButtonVisibleChange: (visible: boolean) => void
  readonly memoryAssistVisible: Accessor<boolean>
  readonly onMemoryAssistVisibleChange: (visible: boolean) => void
  readonly tourButtonVisible: Accessor<boolean>
  readonly onTourButtonVisibleChange: (visible: boolean) => void
  readonly isReady: Accessor<boolean>
  readonly onDialogueComposerVisibleChange: (visible: boolean) => void
}

export const DEFAULT_P_DISPLAY_PREFERENCES = {
  dialogueComposerVisible: false,
  memoryAssistVisible: true,
  toolsButtonVisible: true,
  tourButtonVisible: true,
} as const satisfies PDisplayPreferences
