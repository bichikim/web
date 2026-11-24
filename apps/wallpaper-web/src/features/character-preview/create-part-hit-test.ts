import type {Player} from '@winter-love/puppet/player'
import type {CharacterHitTest} from './types'

interface CreatePartHitTestOptions {
  readonly canvas: HTMLCanvasElement
  readonly player: Pick<Player, 'pickPart'>
}

/** Maps viewport pointers to the renderer's painted-part query without a GPU readback. */
export const createPartHitTest =
  (options: CreatePartHitTestOptions): CharacterHitTest =>
  (point) => {
    const bounds = options.canvas.getBoundingClientRect()
    const x = point.clientX - bounds.left
    const y = point.clientY - bounds.top
    return (
      x >= 0 &&
      x < bounds.width &&
      y >= 0 &&
      y < bounds.height &&
      options.player.pickPart({x, y}) !== undefined
    )
  }
