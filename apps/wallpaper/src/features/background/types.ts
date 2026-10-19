import type {Accessor} from 'solid-js'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import type {AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'

export interface PoffoAgentControls {
  readonly agentBindings?: Accessor<AgentStateBindings | undefined>
}

export interface PoffoLipSyncControls {
  readonly lipsync?: Accessor<PoffoLipSync | undefined>
  readonly lipsyncId?: Accessor<string | undefined>
}

export interface PoffoMotionControls {
  readonly motionId?: Accessor<string | null | undefined>
  readonly onMotions?: (ids: readonly string[]) => void
}
