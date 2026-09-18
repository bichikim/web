import {Texture} from 'pixi.js'

export interface CanvasVideoTexture {
  readonly texture: Texture
  readonly update: () => void
}

/** Copies decoded video frames into a canvas-backed texture for WebView WebGL compatibility. */
export const createCanvasVideoTexture = (video: HTMLVideoElement): CanvasVideoTexture => {
  const width = video.videoWidth
  const height = video.videoHeight
  if (width === 0 || height === 0) {
    throw new Error('Video background dimensions are unavailable.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) {
    throw new Error('Video background canvas is unavailable.')
  }
  const texture = Texture.from(canvas)
  const update = () => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return
    }
    context.drawImage(video, 0, 0, width, height)
    texture.source.update()
  }
  update()
  return {texture, update}
}
