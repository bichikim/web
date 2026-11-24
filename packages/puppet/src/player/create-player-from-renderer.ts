import {createBufferingController} from './buffering/create-buffering-controller'
import {assertPreparedPuppetDocument} from './internal/prepared-document'
import {registerPlayerBuffering} from './player-buffering'
import {createPlayerRuntime} from './create-player-runtime'
import type {Player, PlayerCreationOptions} from './player-types'
import type {RendererController} from './rendering/create-renderer-controller'

/** Creates playback and input handlers around a caller-selected renderer. */
export const createPlayerFromRenderer = async (
  options: PlayerCreationOptions,
  createRenderer: () => Promise<RendererController>,
): Promise<Player> => {
  assertPreparedPuppetDocument(options.document)
  if (options.randomSeed !== undefined && !Number.isFinite(options.randomSeed)) {
    throw new RangeError('Random seed must be finite')
  }
  const renderer = await createRenderer()
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
    renderGeometryOnly: options.renderGeometryOnly,
    runtime,
    supported: options.random === undefined,
    workerRuntime: options.workerRuntime,
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
          {cause},
        )
      }
      throw cause
    }
  }
  return buffering.player
}
