import {Application, Sprite, Texture} from 'pixi.js'
import 'pixi.js/unsafe-eval'
import {PhotoTransition} from '@winter-love/wallpaper/frame-renderer/transition'
import type {TransitionEffect} from '@winter-love/wallpaper/model'

export interface AlbumPreview {
  /** Decode the image, crop from the top, and resolve after the app's transition completes. */
  readonly show: (source: string, effect: TransitionEffect) => Promise<boolean>
  /** Invalidate an unfinished load or transition without clearing the displayed image. */
  readonly cancelPending: () => void
  /** Release the canvas renderer, textures, observer and any active transition. */
  readonly destroy: () => void
}

/** Owns the preview canvas while borrowing the desktop app's transition implementation. */
export const createAlbumPreview = async (canvas: HTMLCanvasElement): Promise<AlbumPreview> => {
  const application = new Application()
  await application.init({
    autoDensity: false,
    autoStart: false,
    backgroundAlpha: 0,
    canvas,
    height: 1,
    preference: 'webgl',
    resolution: Math.min(globalThis.devicePixelRatio, 2),
    width: 1,
  })
  const transition = new PhotoTransition(application)
  let current: Sprite | null = null
  let version = 0
  let disposed = false
  const resize = () => {
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    application.renderer.resize(width, height)
    if (current !== null) {
      current.scale.set(Math.max(width / current.texture.width, height / current.texture.height))
      current.position.set(width / 2, 0)
    }
    transition.resize(width, height)
    application.render()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()
  const cancelPending = () => {
    version += 1
    transition.cancel()
  }
  const show = async (source: string, effect: TransitionEffect) => {
    const CENTER_ANCHOR = 0.5
    cancelPending()
    const revision = version
    const image = new Image()
    image.decoding = 'async'
    image.src = source
    await image.decode()
    if (disposed || version !== revision) {
      return false
    }
    if (current !== null) {
      transition.capture()
      current.destroy({texture: true, textureSource: true})
    }
    current = new Sprite(Texture.from(image))
    current.anchor.set(CENTER_ANCHOR, 0)
    application.stage.addChildAt(current, 0)
    resize()
    const completed = await transition.play(effect)
    return completed && !disposed && revision === version
  }
  const destroy = () => {
    if (disposed) {
      return
    }
    disposed = true
    cancelPending()
    observer.disconnect()
    transition.clear()
    current?.destroy({texture: true, textureSource: true})
    current = null
    application.destroy(false, {children: true})
  }
  return {cancelPending, destroy, show}
}
