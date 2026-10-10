import type {PSceneStyle} from './scene-style'

export const parseSceneStyle = (value: unknown): PSceneStyle | null =>
  value === 'original' || value === 'scribble' ? value : null
