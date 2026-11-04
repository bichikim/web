import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {Accessor} from 'solid-js'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import type {AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import type {MediaFit} from '@winter-love/wallpaper/model'

export interface PoffoDisplayOptions {
  /** Uniform scene sizing; omitted to show the whole scene. */
  readonly fit?: Accessor<MediaFit | undefined>
}

export interface PoffoAgentControls {
  readonly semanticBindings?: Accessor<readonly SemanticBinding[] | undefined>
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
