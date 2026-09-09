import {Container, Rectangle, type Renderer, Sprite, Texture} from 'pixi.js'
import {captureSample, sampleBlend, type VideoSample} from '../video-background'
import {PhotoEdges, type PhotoEdgesLayout} from './edges'

const FADE_MILLISECONDS = 700
const SNAPSHOT_LENGTH = 256

interface EdgeFrame {
  readonly index: number
  readonly texture: Texture
  readonly edges: PhotoEdges
}

/** Blends two cached edge backgrounds against the video's playback clock. */
export class VideoEdges {
  readonly view = new Container()
  readonly #renderer: Renderer
  #samples: readonly VideoSample[]
  #frames: EdgeFrame[] = []
  #times: readonly number[] = [0]
  #layout: PhotoEdgesLayout | null = null
  #time = 0
  #fade: Sprite | null = null
  #fadeStarted = 0

  constructor(renderer: Renderer, video: HTMLVideoElement) {
    this.#renderer = renderer
    this.#samples = [captureSample(video)]
  }

  setSamples(samples: readonly VideoSample[]) {
    if (samples.length === 0) {
      return
    }
    this.#captureFade()
    this.#clear()
    this.#samples = samples
    this.#times = samples.map((sample) => sample.time)
    this.update(this.#time)
  }

  resize(layout: PhotoEdgesLayout) {
    this.#layout = layout
    this.update(this.#time)
    for (const frame of this.#frames) {
      frame.edges.resize(layout)
    }
    if (this.#fade !== null) {
      this.#fade.width = layout.width
      this.#fade.height = layout.height
    }
  }

  update(time: number) {
    if (time < this.#time) {
      this.#captureFade()
    }
    this.#time = time
    this.#updateFade()
    const layout = this.#layout
    if (layout === null) {
      return
    }
    const blend = sampleBlend(this.#times, time)
    if (this.#frames[0]?.index === blend.first && this.#frames.at(-1)?.index === blend.next) {
      if (this.#frames.length > 1) {
        this.#frames[1].edges.view.alpha = blend.mix
      }
      return
    }
    const indices = blend.first === blend.next ? [blend.first] : [blend.first, blend.next]
    for (const frame of this.#frames) {
      if (!indices.includes(frame.index)) {
        frame.edges.destroy()
        frame.texture.destroy(true)
      }
    }
    this.#frames = indices.map(
      (index) => this.#frames.find((frame) => frame.index === index) ?? this.#create(index, layout),
    )
    for (const [position, frame] of this.#frames.entries()) {
      this.view.addChild(frame.edges.view)
      frame.edges.view.alpha = position === 0 ? 1 : blend.mix
    }
    if (this.#fade !== null) {
      this.view.addChild(this.#fade)
    }
  }

  #captureFade() {
    const layout = this.#layout
    if (layout === null || this.#frames.length === 0) {
      return
    }
    const texture = this.#renderer.generateTexture({
      frame: new Rectangle(0, 0, layout.width, layout.height),
      resolution: Math.min(1, SNAPSHOT_LENGTH / Math.max(layout.width, layout.height)),
      target: this.view,
    })
    this.#fade?.destroy({texture: true, textureSource: true})
    this.#fade = new Sprite(texture)
    this.#fade.width = layout.width
    this.#fade.height = layout.height
    this.#fadeStarted = performance.now()
    this.view.addChild(this.#fade)
  }

  #updateFade() {
    const fade = this.#fade
    if (fade === null) {
      return
    }
    const progress = Math.min(1, (performance.now() - this.#fadeStarted) / FADE_MILLISECONDS)
    fade.alpha = (1 + Math.cos(Math.PI * progress)) / 2
    if (progress >= 1) {
      fade.destroy({texture: true, textureSource: true})
      this.#fade = null
    }
  }

  #create(index: number, layout: PhotoEdgesLayout): EdgeFrame {
    const sample = this.#samples[index]
    const canvas = document.createElement('canvas')
    canvas.width = sample.width
    canvas.height = sample.height
    const context = canvas.getContext('2d')
    if (context === null) {
      throw new Error('Video background canvas is unavailable.')
    }
    const data = context.createImageData(sample.width, sample.height)
    data.data.set(sample.pixels)
    context.putImageData(data, 0, 0)
    const texture = Texture.from(canvas)
    const edges = new PhotoEdges({renderer: this.#renderer, texture})
    edges.resize(layout)
    return {edges, index, texture}
  }

  #clear() {
    for (const frame of this.#frames) {
      frame.edges.destroy()
      frame.texture.destroy(true)
    }
    this.#frames = []
  }

  destroy() {
    this.#fade?.destroy({texture: true, textureSource: true})
    this.#fade = null
    this.#clear()
    this.view.destroy()
  }
}
