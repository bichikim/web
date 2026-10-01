export interface HtmlMediaResource extends Pick<
  HTMLMediaElement,
  'pause' | 'removeAttribute' | 'load'
> {
  currentTime?: number
}
/** Pauses media, optionally rewinds it and releases its source and decoder resource. */
export const clearHtmlMediaElement = (media: HtmlMediaResource, rewind = false): void => {
  media.pause()
  if (rewind) {
    media.currentTime = 0
  }
  media.removeAttribute('src')
  media.load()
}
