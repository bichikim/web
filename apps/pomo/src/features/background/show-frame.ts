import type {FrameRenderer} from '../frame-renderer'
import type {BackgroundController} from './use-background'
import type {BackgroundMedia, TransitionEffect} from './model'
import {findCompanion} from './companion'
import type {PhotoSize} from './pairing'

export interface ShowFrameOptions {
  readonly renderer: FrameRenderer
  readonly background: BackgroundController
  readonly item: BackgroundMedia
  readonly pairPhotos: boolean
  readonly transition: TransitionEffect
  readonly candidates: () => readonly string[]
  readonly sizes: Map<string, PhotoSize>
  readonly signal: AbortSignal
}
export interface ShownFrame {
  readonly companionId: string | null
}

/** Shows the primary media and an eligible companion; null denotes an interrupted load. */
const prepareFrame = async (options: ShowFrameOptions): Promise<ShownFrame | null> => {
  const {renderer, background, item, signal} = options
  const blob = await background.load(item.id)
  if (
    signal.aborted ||
    !(await (item.kind === 'video'
      ? renderer.show(blob, item.kind, item.id)
      : renderer.show(blob, item.kind))) ||
    signal.aborted
  ) {
    return null
  }
  const first = renderer.photoSize()
  if (!options.pairPhotos || item.kind !== 'photo' || first === null) {
    return {companionId: null}
  }
  options.sizes.set(item.id, first)
  const items = background.items()
  const candidates = options.candidates().flatMap((id) => {
    const candidate = items.find((entry) => entry.id === id)
    return candidate === undefined ? [] : [candidate]
  })
  const companion = await findCompanion({
    candidates,
    first,
    load: background.load,
    onError: background.markFailed,
    signal,
    sizes: options.sizes,
    viewport: renderer.viewportSize(),
  })
  if (companion === null) {
    return signal.aborted ? null : {companionId: null}
  }
  const exists = background.items().some((entry) => entry.id === companion.id)
  if (!signal.aborted && exists && renderer.addPhoto(companion)) {
    return {companionId: companion.id}
  }
  companion.release()
  return signal.aborted ? null : {companionId: null}
}

/** Resolves after the complete photo group has finished its transition. */
export const showFrame = async (options: ShowFrameOptions): Promise<ShownFrame | null> => {
  const shown = await prepareFrame(options)
  if (shown === null || options.signal.aborted) {
    return null
  }
  const presented = await options.renderer.present(options.transition)
  return presented && !options.signal.aborted ? shown : null
}
