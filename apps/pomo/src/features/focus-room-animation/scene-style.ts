import type {Accessor} from 'solid-js'

export type PSceneStyle = 'original' | 'scribble'

export const getDefaultPSceneStyle = (): PSceneStyle =>
  import.meta.env.POMO_IS_APPS_IN_TOSS ? 'scribble' : 'original'

export interface PSceneStyleController {
  readonly onSceneStyleChange: (sceneStyle: PSceneStyle) => void
  readonly sceneStyle: Accessor<PSceneStyle>
}
