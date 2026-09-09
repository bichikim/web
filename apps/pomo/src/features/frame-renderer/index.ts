import {VideoLoop} from './video-loop'
export * from './edges'
import {Application, Sprite, Texture, VideoSource} from 'pixi.js'
import {PhotoTransition} from './transition'
import {VideoEdges} from './video-edges'
import {prepareVideoBackground} from '../video-background'
export * from './effect'
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

const MEDIA_LOAD_TIMEOUT = 30_000
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
  #settle: ((loaded: boolean) => void) | null = null

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
    const direction =
      companion === null
        ? null
        : getPairDirection({
            first: sprite.texture,
            second: companion.texture,
            viewport: {height, width},
          })
    if (companion !== null) {
      companion.visible = direction !== null
    }
    if (companion === null || direction === null) {
      const scale = Math.min(width / sprite.texture.width, height / sprite.texture.height)
      sprite.scale.set(scale)
      sprite.position.set(width / 2, height / 2)
      this.#edges?.resize({
        height,
        photoHeight: sprite.texture.height * scale,
        photoWidth: sprite.texture.width * scale,
        width,
      })
      return
    }
    const horizontal = direction === 'horizontal'
    const scale = horizontal ? height / sprite.texture.height : width / sprite.texture.width
    const secondScale = horizontal
      ? height / companion.texture.height
      : width / companion.texture.width
    sprite.scale.set(scale)
    companion.scale.set(secondScale)
    const firstWidth = sprite.texture.width * scale
    const firstHeight = sprite.texture.height * scale
    const secondWidth = companion.texture.width * secondScale
    const secondHeight = companion.texture.height * secondScale
    const left = (width - firstWidth - (horizontal ? secondWidth : 0)) / 2
    const top = (height - firstHeight - (horizontal ? 0 : secondHeight)) / 2
    sprite.position.set(left + firstWidth / 2, top + firstHeight / 2)
    companion.position.set(
      horizontal ? left + firstWidth + secondWidth / 2 : width / 2,
      horizontal ? height / 2 : top + firstHeight + secondHeight / 2,
    )
    this.#edges?.resize({
      companion: {direction, texture: companion.texture},
      height,
      photoHeight: horizontal ? height : firstHeight + secondHeight,
      photoWidth: horizontal ? firstWidth + secondWidth : width,
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
    this.#settle?.(false)
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
    this.#settle = null
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
    const url = URL.createObjectURL(blob)
    const source = kind === 'photo' ? new Image() : document.createElement('video')
    const video = source instanceof HTMLVideoElement ? source : null
    let texture: Texture | null = null
    let sprite: Sprite | null = null
    let settle: ((loaded: boolean) => void) | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null
    let loaded = false
    const active = () => !this.#disposed && version === this.#version
    const ready = () => {
      loaded = true
      if (timeout !== null) {
        clearTimeout(timeout)
      }
      settle?.(true)
    }
    const fail = () => {
      if (timeout !== null) {
        clearTimeout(timeout)
      }
      if (!active()) {
        return
      }
      if (loaded) {
        this.#options.onError()
      } else {
        settle?.(false)
      }
    }
    const ended = () => {
      if (active()) {
        if (this.#loop) {
          this.#videoLoop?.repeat().catch(() => {
            if (active()) {
              this.#options.onError()
            }
          })
        } else {
          this.#options.onEnded()
        }
      }
    }
    this.#release = () => {
      if (timeout !== null) {
        clearTimeout(timeout)
      }
      settle?.(false)
      source.removeEventListener('load', ready)
      source.removeEventListener('loadeddata', ready)
      source.removeEventListener('error', fail)
      source.removeEventListener('ended', ended)
      sprite?.destroy()
      texture?.destroy(true)
      if (video === null) {
        source.removeAttribute('src')
      } else {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
      URL.revokeObjectURL(url)
    }
    const result = await new Promise<boolean>((resolve) => {
      settle = resolve
      this.#settle = resolve
      source.addEventListener(kind === 'photo' ? 'load' : 'loadeddata', ready, {once: true})
      source.addEventListener('error', fail)
      source.addEventListener('ended', ended)
      timeout = setTimeout(fail, MEDIA_LOAD_TIMEOUT)
      if (video !== null) {
        video.muted = true
        video.defaultMuted = true
        video.playsInline = true
        video.preload = 'auto'
      }
      source.src = url
      video?.load()
    })
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
    const update = () => edges.update(video.currentTime)
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
