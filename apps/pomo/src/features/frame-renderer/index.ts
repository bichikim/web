import {VideoLoop} from './video-loop'
import {createMedia} from './media'
import {calculateLayout} from './layout'
export * from './edges'
export * from './effect'
export * from './layout'
export * from './media'
import {Application, Sprite, Texture, VideoSource, type Ticker} from 'pixi.js'
import {PhotoTransition} from './transition'
import {VideoEdges} from './video-edges'
import {prepareVideoBackground} from '../video-background'
export * from './transition'
import {PhotoEdges} from './edges'
export * from './video-edges'
export * from './video-loop'
import {
  getPairDirection,
  type LoadedPhoto,
  type PhotoSize,
  type MediaKind,
  type TransitionEffect,
} from '../background'

const CENTER_ANCHOR = 0.5

export interface FrameRendererOptions {
  readonly canvas: HTMLCanvasElement
  readonly onVideoStart?: () => void
  readonly onEnded: () => void
  readonly onError: () => void
}

/** Owns one Pixi application and releases each media source when replaced or destroyed. */
export class FrameRenderer {
  readonly #application = new Application()
  readonly #options: FrameRendererOptions
  #video: HTMLVideoElement | null = null
  #loop = false
  #videoLoop: VideoLoop | null = null
  #initialized = false
  #disposed = false
  #release: (() => void) | null = null
  #observer: ResizeObserver | null = null
  #sprite: Sprite | null = null
  #edges: PhotoEdges | VideoEdges | null = null
  #companion: Sprite | null = null
  #releaseCompanion: (() => void) | null = null
  #version = 0
  #kind: MediaKind | null = null
  #transition: PhotoTransition | null = null
  #cancelLoad: (() => void) | null = null

  constructor(options: FrameRendererOptions) {
    this.#options = options
  }

  async initialize(): Promise<void> {
    await this.#application.init({
      autoDensity: false,
      autoStart: false,
      backgroundAlpha: 0,
      canvas: this.#options.canvas,
      height: 1,
      preference: 'webgl',
      resolution: Math.min(devicePixelRatio, 2),
      width: 1,
    })
    this.#initialized = true
    if (this.#disposed) {
      this.#application.destroy(false, {children: true})
      return
    }
    this.#transition = new PhotoTransition(this.#application)
    this.#observer = new ResizeObserver(() => this.#resize())
    this.#observer.observe(this.#options.canvas)
    this.#resize()
  }

  #resize() {
    const {canvas} = this.#options
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    this.#application.renderer.resize(width, height)
    const sprite = this.#sprite
    if (sprite !== null) {
      this.#layout(sprite, width, height)
    }
    this.#videoLoop?.resize()
    this.#transition?.resize(width, height)
    this.#application.render()
  }

  photoSize(): PhotoSize | null {
    const texture = this.#sprite?.texture
    return texture === undefined ? null : {height: texture.height, width: texture.width}
  }

  viewportSize(): PhotoSize {
    return {height: this.#options.canvas.clientHeight, width: this.#options.canvas.clientWidth}
  }

  removePhoto() {
    this.#releaseCompanion?.()
    this.#releaseCompanion = null
    this.#companion = null
    if (!this.#disposed) {
      this.#resize()
    }
  }

  addPhoto(photo: LoadedPhoto): boolean {
    const first = this.photoSize()
    const second = {height: photo.image.naturalHeight, width: photo.image.naturalWidth}
    if (
      this.#disposed ||
      first === null ||
      getPairDirection({first, second, viewport: this.viewportSize()}) === null
    ) {
      return false
    }
    const texture = Texture.from(photo.image)
    const sprite = new Sprite(texture)
    sprite.anchor.set(CENTER_ANCHOR)
    this.#releaseCompanion?.()
    this.#companion = sprite
    this.#releaseCompanion = () => {
      sprite.destroy()
      texture.destroy(true)
      photo.release()
    }
    this.#application.stage.addChild(sprite)
    this.#resize()
    return true
  }

  #layout(sprite: Sprite, width: number, height: number) {
    const companion = this.#companion
    const layout = calculateLayout({
      first: sprite.texture,
      second: companion?.texture ?? null,
      viewport: {height, width},
    })
    sprite.scale.set(layout.first.scale)
    sprite.position.set(layout.first.x, layout.first.y)
    if (companion !== null) {
      companion.visible = layout.second !== null
      if (layout.second !== null) {
        companion.scale.set(layout.second.scale)
        companion.position.set(layout.second.x, layout.second.y)
      }
    }
    this.#edges?.resize({
      companion:
        companion !== null && layout.direction !== null
          ? {direction: layout.direction, texture: companion.texture}
          : undefined,
      height,
      photoHeight: layout.height,
      photoWidth: layout.width,
      width,
    })
  }

  setVideoLoop(loop: boolean) {
    this.#loop = loop
    const video = this.#video
    if (video === null) {
      return
    }
    video.loop = false
    if (loop && video.ended) {
      const version = this.#version
      this.#videoLoop?.repeat().catch(() => {
        if (!this.#disposed && version === this.#version) {
          this.#options.onError()
        }
      })
    }
  }

  cancelPending() {
    this.#version += 1
    this.#cancelLoad?.()
    this.#transition?.cancel()
  }

  async present(effect: TransitionEffect): Promise<boolean> {
    if (this.#disposed) {
      return false
    }
    const version = this.#version
    const completed = await (this.#transition?.play(effect) ?? Promise.resolve(true))
    if (!completed || this.#disposed || version !== this.#version) {
      return false
    }
    if (this.#kind === 'video') {
      this.#application.start()
    }
    return true
  }

  clear() {
    this.#transition?.clear()
    this.#clearMedia()
    this.#kind = null
  }

  #clearMedia() {
    if (this.#disposed) {
      return
    }
    this.#version += 1
    this.#releaseCompanion?.()
    this.#releaseCompanion = null
    this.#companion = null
    this.#videoLoop?.destroy()
    this.#videoLoop = null
    this.#edges?.destroy()
    this.#edges = null
    this.#release?.()
    this.#release = null
    this.#cancelLoad = null
    this.#sprite = null
    this.#video = null
    if (this.#initialized) {
      this.#application.stop()
    }
    if (this.#initialized && !this.#disposed) {
      this.#application.render()
    }
  }

  async show(blob: Blob, kind: MediaKind, id?: string): Promise<boolean> {
    if (this.#disposed) {
      return false
    }
    if (this.#kind === null) {
      this.#transition?.clear()
    } else {
      this.#transition?.capture()
    }
    this.#clearMedia()
    this.#kind = kind
    const version = this.#version
    let texture: Texture | null = null
    let sprite: Sprite | null = null
    const active = () => !this.#disposed && version === this.#version
    const media = createMedia({
      blob,
      kind,
      onEnded: () => {
        if (!active()) {
          return
        }
        if (this.#loop) {
          this.#videoLoop?.repeat().catch(() => {
            if (active()) {
              this.#options.onError()
            }
          })
        } else {
          this.#options.onEnded()
        }
      },
      onError: () => {
        if (active()) {
          this.#options.onError()
        }
      },
    })
    const {source, video} = media
    this.#cancelLoad = media.cancel
    this.#release = () => {
      sprite?.destroy()
      texture?.destroy(true)
      media.dispose()
    }
    const result = await media.ready
    if (!active()) {
      return false
    }
    if (!result) {
      throw new Error('Unable to decode background media.')
    }
    if (video === null) {
      texture = Texture.from(source)
    } else {
      const videoSource = new VideoSource({autoLoad: false, autoPlay: false, resource: video})
      texture = new Texture({source: videoSource})
      await videoSource.load()
      if (!active()) {
        return false
      }
    }
    sprite = this.#mount(texture, kind)
    return video === null ? true : this.#playVideo(video, blob, id, active)
  }

  async #playVideo(
    video: HTMLVideoElement,
    blob: Blob,
    id: string | undefined,
    active: () => boolean,
  ) {
    this.#video = video
    video.loop = false
    this.#videoLoop = new VideoLoop(this.#application, video, this.#sprite!)
    this.#mountVideoEdges(video, blob, id, active)
    this.#options.onVideoStart?.()
    await video.play()
    if (!active()) {
      return false
    }
    this.#application.start()
    return true
  }

  #mountVideoEdges(
    video: HTMLVideoElement,
    blob: Blob,
    id: string | undefined,
    active: () => boolean,
  ) {
    const edges = new VideoEdges(this.#application.renderer, video)
    this.#edges = edges
    this.#application.stage.addChildAt(edges.view, 0)
    this.#resize()
    const update = (ticker: Ticker) => edges.update(video.currentTime, ticker.elapsedMS)
    this.#application.ticker.add(update)
    const release = this.#release
    this.#release = () => {
      this.#application.ticker.remove(update)
      release?.()
    }
    if (id !== undefined) {
      prepareVideoBackground(id, blob)
        .then((samples) => {
          if (active() && samples !== null) {
            edges.setSamples(samples)
          }
        })
        .catch((error: unknown) => {
          console.warn('Unable to build video background.', error)
        })
    }
  }

  #mount(texture: Texture, kind: MediaKind) {
    if (kind === 'photo') {
      this.#edges = new PhotoEdges({renderer: this.#application.renderer, texture})
      this.#application.stage.addChild(this.#edges.view)
    }
    const sprite = new Sprite(texture)
    sprite.anchor.set(CENTER_ANCHOR)
    this.#sprite = sprite
    this.#application.stage.addChild(sprite)
    this.#resize()
    return sprite
  }

  destroy() {
    if (this.#disposed) {
      return
    }
    this.clear()
    this.#disposed = true
    this.#observer?.disconnect()
    if (this.#initialized) {
      this.#application.destroy(false, {children: true})
    }
  }
}
