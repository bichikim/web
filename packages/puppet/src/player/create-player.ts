import type {CreatePlayerOptions, Player} from './player-types'
import {createRendererController} from './rendering'
import {createPlayerFromRenderer} from './create-player-from-renderer'

export type {PuppetFit, PuppetFraming} from './internal/layout-player-root'
export type {PuppetRenderOverride} from './internal/render-overrides'
export type {PuppetParameterBlend, PuppetParameterBlendMode} from './parameter-blends'
export type {PuppetPhysicsOptions} from './physics-options'
export type {CreatePlayerOptions, Player, PlayerFrame, PlayerPlaybackOptions} from './player-types'

export const createPlayer = (options: CreatePlayerOptions): Promise<Player> =>
  createPlayerFromRenderer(options, () => createRendererController(options))
