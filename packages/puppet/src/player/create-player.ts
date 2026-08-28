import {Application, Container, MeshSimple, Texture} from 'pixi.js'

import type {PuppetDocument, PuppetKeyframe, PuppetMotion, PuppetTrack} from './document'

export interface Player {
  destroy(): void
  pause(): void
  play(): void
  seek(time: number): void
  updateDocument(document: PuppetDocument): boolean
}

export interface CreatePlayerOptions {
  readonly canvas: HTMLCanvasElement
  readonly document: PuppetDocument
  readonly motionId?: string
  readonly resizeTo?: HTMLElement
  readonly viewportPadding?: number
}

interface RuntimePart {
  readonly mesh: MeshSimple
  restVertices: Float32Array
  vertices: Float32Array
}

const COORDINATES_PER_VERTEX = 2
const Y_COORDINATE_OFFSET = 1
const MILLISECONDS_PER_SECOND = 1000
const VIEWPORT_PADDING = 1

const loadTexture = async (source: string) => {
  const image = new Image()
  image.decoding = 'async'
  image.src = source
  await image.decode()

  return Texture.from(image)
}

const sampleKeyframes = (keyframes: ReadonlyArray<PuppetKeyframe>, time: number) => {
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time >= time)

  if (nextIndex === -1) {
    return keyframes.at(-1)?.value ?? 0
  }

  if (nextIndex <= 0) {
    return keyframes[0]?.value ?? 0
  }

  const previousKeyframe = keyframes[nextIndex - 1]
  const nextKeyframe = keyframes[nextIndex]

  if (previousKeyframe === undefined || nextKeyframe === undefined) {
    return keyframes.at(-1)?.value ?? 0
  }

  const duration = nextKeyframe.time - previousKeyframe.time
  const progress = duration === 0 ? 0 : (time - previousKeyframe.time) / duration

  return previousKeyframe.value + (nextKeyframe.value - previousKeyframe.value) * progress
}

const getCoordinateIndex = (track: PuppetTrack) =>
  track.vertexIndex * COORDINATES_PER_VERTEX + (track.axis === 'y' ? Y_COORDINATE_OFFSET : 0)

const getMotion = (document: PuppetDocument, motionId: string | undefined) =>
  motionId === undefined
    ? document.motions[0]
    : document.motions.find((motion) => motion.id === motionId)

export const createPlayer = async (options: CreatePlayerOptions): Promise<Player> => {
  const application = new Application()
  const resizeTarget = options.resizeTo ?? options.canvas.parentElement

  await application.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    canvas: options.canvas,
    height: options.document.viewport.height,
    resolution: Math.min(window.devicePixelRatio, 2),
    width: options.document.viewport.width,
    ...(resizeTarget === null ? {} : {resizeTo: resizeTarget}),
  })

  const root = new Container()
  const partById = new Map<string, RuntimePart>()
  let {document} = options
  let motion = getMotion(document, options.motionId)
  let elapsedTime = 0
  let destroyed = false

  const destroy = () => {
    if (destroyed) {
      return
    }

    destroyed = true
    application.destroy(
      {removeView: false},
      {children: true, context: false, texture: true, textureSource: true},
    )
  }

  try {
    const textureResults = await Promise.allSettled(
      options.document.parts.map((part) => loadTexture(part.texture.src)),
    )
    const failedTexture = textureResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )

    if (failedTexture !== undefined) {
      for (const result of textureResults) {
        if (result.status === 'fulfilled') {
          result.value.destroy(true)
        }
      }

      throw failedTexture.reason
    }

    for (const [index, part] of options.document.parts.entries()) {
      const textureResult = textureResults[index]

      if (textureResult?.status !== 'fulfilled') {
        throw new Error(`Missing texture for part: ${part.id}`)
      }

      const restVertices = new Float32Array(part.mesh.vertices)
      const vertices = new Float32Array(restVertices)
      const mesh = new MeshSimple({
        indices: new Uint32Array(part.mesh.indices),
        texture: textureResult.value,
        topology: 'triangle-list',
        uvs: new Float32Array(part.mesh.uvs),
        vertices,
      })

      root.addChild(mesh)
      partById.set(part.id, {mesh, restVertices, vertices})
    }

    application.stage.addChild(root)
  } catch (error) {
    destroy()
    throw new Error('Puppet player resource initialization failed', {cause: error})
  }

  const layoutRoot = () => {
    const viewportPadding = Math.max(0, options.viewportPadding ?? 0)
    const viewportWidth = document.viewport.width * (1 + viewportPadding * 2)
    const viewportHeight = document.viewport.height * (1 + viewportPadding * 2)
    const scale =
      Math.min(
        application.screen.width / viewportWidth,
        application.screen.height / viewportHeight,
      ) * VIEWPORT_PADDING

    root.scale.set(scale)
    root.position.set(
      (application.screen.width - document.viewport.width * scale) / 2,
      (application.screen.height - document.viewport.height * scale) / 2,
    )
  }

  const applyMotion = (activeMotion: PuppetMotion | undefined, time: number) => {
    for (const runtimePart of partById.values()) {
      runtimePart.vertices.set(runtimePart.restVertices)
    }

    if (activeMotion !== undefined) {
      for (const track of activeMotion.tracks) {
        const runtimePart = partById.get(track.partId)

        if (runtimePart !== undefined) {
          runtimePart.vertices[getCoordinateIndex(track)] = sampleKeyframes(track.keyframes, time)
        }
      }
    }

    for (const runtimePart of partById.values()) {
      runtimePart.mesh.vertices = runtimePart.vertices
    }

    layoutRoot()
  }

  application.ticker.add((ticker) => {
    if (motion !== undefined) {
      elapsedTime = (elapsedTime + ticker.deltaMS / MILLISECONDS_PER_SECOND) % motion.duration
    }

    applyMotion(motion, elapsedTime)
  })

  applyMotion(motion, elapsedTime)

  const updateDocument = (nextDocument: PuppetDocument) => {
    const canReuseResources =
      nextDocument.parts.length === document.parts.length &&
      nextDocument.parts.every((part, index) => {
        const previousPart = document.parts[index]
        return previousPart?.id === part.id && previousPart.texture.src === part.texture.src
      })

    if (!canReuseResources) {
      return false
    }

    document = nextDocument
    motion = getMotion(document, options.motionId)

    for (const part of document.parts) {
      const runtimePart = partById.get(part.id)

      if (runtimePart !== undefined) {
        runtimePart.restVertices = new Float32Array(part.mesh.vertices)
        runtimePart.vertices = new Float32Array(runtimePart.restVertices)
        runtimePart.mesh.geometry.positions = runtimePart.vertices
        runtimePart.mesh.geometry.uvs = new Float32Array(part.mesh.uvs)
        runtimePart.mesh.geometry.indices = new Uint32Array(part.mesh.indices)
      }
    }

    elapsedTime = 0
    applyMotion(motion, elapsedTime)
    application.render()

    return true
  }

  return {
    destroy,
    pause() {
      application.stop()
    },
    play() {
      application.start()
    },
    seek(time: number) {
      elapsedTime = motion === undefined ? 0 : Math.max(0, time) % motion.duration
      applyMotion(motion, elapsedTime)
      application.render()
    },
    updateDocument,
  }
}
