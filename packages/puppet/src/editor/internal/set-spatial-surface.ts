import type {PuppetDocument, PuppetSpatialSurface} from '../../player'
import {isSceneNodeLocked} from './scene-graph'
export {createSpatialSurface} from './create-spatial-surface'

export interface SetSpatialSurfaceOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly surface: PuppetSpatialSurface | null
}

export const setSpatialSurface = (
  options: SetSpatialSurfaceOptions,
): PuppetDocument | undefined => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)
  if (part === undefined || isSceneNodeLocked(options.document, part.id)) {
    return undefined
  }
  return {
    ...options.document,
    parts: options.document.parts.map((candidate) =>
      candidate.id === part.id ? {...candidate, spatial: options.surface ?? undefined} : candidate,
    ),
  }
}
