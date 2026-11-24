import type {PuppetDocument} from '../document'
import type {Player} from '../player-types'
import type {PlayerRenderer} from '../rendering/create-player-renderer'
import {findHitArea} from './hit-area'

interface CreatePlayerPickingOptions {
  readonly document: () => PuppetDocument | undefined
  readonly renderer: Pick<
    PlayerRenderer,
    'toDocumentPoint' | 'getPartVertices' | 'getPaintOrder' | 'pickPart'
  >
}

/** Both picking APIs read the last rendered frame in the same document coordinate system. */
export const createPlayerPicking = (
  options: CreatePlayerPickingOptions,
): Pick<Player, 'hitTest' | 'pickPart'> => ({
  hitTest(point) {
    const document = options.document()
    return document === undefined
      ? undefined
      : findHitArea({
          document,
          paintOrder: options.renderer.getPaintOrder(),
          point: options.renderer.toDocumentPoint(point),
          vertices: options.renderer.getPartVertices,
        })
  },
  pickPart(point) {
    return options.document() === undefined
      ? undefined
      : options.renderer.pickPart(options.renderer.toDocumentPoint(point))
  },
})
