import type {Accessor} from 'solid-js'

export type PSceneStyle = 'original' | 'scribble'

export const getDefaultPSceneStyle = (): PSceneStyle =>
  import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ? 'scribble' : 'original'

export interface PSceneStyleController {
  readonly isReady: Accessor<boolean>
  readonly onSceneStyleChange: (sceneStyle: PSceneStyle) => void
  readonly sceneStyle: Accessor<PSceneStyle>
}
