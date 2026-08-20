import type {Accessor} from 'solid-js'

export type PSceneStyle = 'original' | 'scribble'

export interface PSceneStyleController {
  readonly onSceneStyleChange: (sceneStyle: PSceneStyle) => void
  readonly sceneStyle: Accessor<PSceneStyle>
}
