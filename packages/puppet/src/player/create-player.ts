import {createBufferingController} from './buffering/create-buffering-controller'
import {registerPlayerBuffering} from './player-buffering'
import type {CreatePlayerOptions, Player} from './player-types'
import {assertPreparedPuppetDocument} from './internal/prepared-document'
import {createRendererController} from './rendering'
import {createPlayerRuntime} from './create-player-runtime'

export type {PuppetFit, PuppetFraming} from './internal/layout-player-root'
export type {PuppetRenderOverride} from './internal/render-overrides'
export type {PuppetParameterBlend, PuppetParameterBlendMode} from './parameter-blends'
export type {PuppetPhysicsOptions} from './physics-options'
export type {CreatePlayerOptions, Player, PlayerFrame, PlayerPlaybackOptions} from './player-types'

export const createPlayer = async (options: CreatePlayerOptions): Promise<Player> => {
  assertPreparedPuppetDocument(options.document)
  if (options.randomSeed !== undefined && !Number.isFinite(options.randomSeed)) {
    throw new RangeError('Random seed must be finite')
  }
  const renderer = await createRendererController(options)
  const runtime = createPlayerRuntime({
    ...options,
    deferred: options.buffering === true && options.random === undefined,
    onResources: () => buffering.resourcesChanged(),
    onRunning: () => buffering.runningChanged(),
    renderer,
  })
  const buffering = createBufferingController({
    onChange: options.onBufferingChange,
    renderer,
    runtime,
    supported: options.random === undefined,
  })
  renderer.subscribeFrame(buffering.advance)
  registerPlayerBuffering(buffering.player, buffering)
  if (options.buffering === true) {
    try {
      await buffering.configure({enabled: true})
    } catch (cause) {
      try {
        buffering.player.destroy()
      } catch (disposalCause) {
        throw new AggregateError(
          [cause, disposalCause],
          'Player initialization and disposal failed',
          {
            cause,
          },
        )
      }
      throw cause
    }
  }
  return buffering.player
}
