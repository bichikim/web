import {
  type FrameRendererOptions,
  FrameRenderer as SharedFrameRenderer,
} from '@winter-love/wallpaper/frame-renderer'
import {prepareVideoBackground} from '../video-background'

/** Connects the shared renderer to Pomo's derived video cache. */
export class FrameRenderer extends SharedFrameRenderer {
  constructor(options: FrameRendererOptions) {
    super({
      ...options,
      prepareVideoBackground: options.prepareVideoBackground ?? prepareVideoBackground,
    })
  }
}
