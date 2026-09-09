import type {Accessor} from 'solid-js'

export interface PDisplayPreferences {
  readonly pomodoroVisible: boolean
  readonly playerVisible: boolean
  readonly toolsButtonVisible: boolean
  readonly memoryAssistVisible: boolean
  readonly tourButtonVisible: boolean
  readonly dialogueComposerVisible: boolean
}

export interface PDisplayPreferencesController {
  readonly pomodoroVisible: Accessor<boolean>
  readonly onPomodoroVisibleChange: (visible: boolean) => void
  readonly playerVisible: Accessor<boolean>
  readonly onPlayerVisibleChange: (visible: boolean) => void
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
  playerVisible: true,
  pomodoroVisible: true,
  toolsButtonVisible: true,
  tourButtonVisible: true,
} as const satisfies PDisplayPreferences
