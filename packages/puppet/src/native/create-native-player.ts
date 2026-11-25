import {createPlayerFromRenderer} from '../player/create-player-from-renderer'
import type {NativePlayerBackend} from '../player/native-backend'
import type {Player, PlayerCreationOptions} from '../player/player-types'
import {createRendererController} from '../player/rendering/create-renderer-controller'
import {createNativeRenderer} from '../player/rendering/wgpu/create-native-renderer'
import {supportsWgpuDocument} from '../player/rendering/wgpu/supports-document'

export interface CreateNativePlayerOptions extends PlayerCreationOptions {
  /** Opens and owns the platform surface used to display the character. */
  readonly nativeBackend: NativePlayerBackend
}

/** Creates a desktop player on the supplied native surface, rejecting if it cannot be opened. */
export const createNativePlayer = (options: CreateNativePlayerOptions): Promise<Player> =>
  createPlayerFromRenderer(options, () =>
    createRendererController(options, async (configuration) => {
      if (!supportsWgpuDocument(configuration.document)) {
        throw new Error('The native renderer does not support this document')
      }
      return createNativeRenderer(configuration, options.nativeBackend)
    }),
  )
