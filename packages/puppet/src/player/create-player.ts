import {Application, Container, MeshSimple, Texture} from 'pixi.js'

import type {PuppetDocument, PuppetMotion} from './document'
import {
  assertPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from './internal/prepared-document'
import {applyMotionVertices} from './internal/motion'
import {getScenePartStates} from './scene'

export interface Player {
  destroy(): void
  pause(): void
  play(): void
  resize(): void
  seek(time: number): void
  updateDocument(document: PreparedPuppetDocument): boolean
}

export interface PlayerFrame {
  readonly duration: number
  readonly motionId: string | null
  readonly time: number
}

export interface CreatePlayerOptions {
  readonly canvas: HTMLCanvasElement
  readonly document: PreparedPuppetDocument
  readonly motionId?: string
  readonly onFrame?: (frame: PlayerFrame) => void
  readonly resizeTo?: HTMLElement
  readonly viewportPadding?: number
}

interface RuntimePart {
  readonly mesh: MeshSimple
  restVertices: Float32Array
  vertices: Float32Array
}

const applyDocumentScene = (
  document: PuppetDocument,
  partById: ReadonlyMap<string, RuntimePart>,
  root: Container,
) => {
  for (const state of getScenePartStates(document)) {
    const runtimePart = partById.get(state.partId)

    if (runtimePart !== undefined) {
      runtimePart.mesh.visible = state.visible
      root.addChild(runtimePart.mesh)
    }
  }
}

const MILLISECONDS_PER_SECOND = 1000
const VIEWPORT_PADDING = 1
const APPLICATION_DESTROY_OPTIONS = {
  children: true,
  context: false,
  texture: true,
  textureSource: true,
}

const createPlayerFrame = (motion: PuppetMotion | undefined, time: number): PlayerFrame => ({
  duration: motion?.duration ?? 0,
  motionId: motion?.id ?? null,
  time,
})

const getSeekTime = (motion: PuppetMotion | undefined, time: number) => {
  const clampedTime = Math.max(0, time)
  return motion === undefined || clampedTime <= motion.duration
    ? clampedTime
    : clampedTime % motion.duration
}

const loadTexture = async (source: string) => {
  const image = new Image()
  image.decoding = 'async'
  image.src = source
  await image.decode()

  return Texture.from(image)
}

const getMotion = (document: PuppetDocument, motionId: string | undefined) =>
  motionId === undefined
    ? document.motions[0]
    : document.motions.find((motion) => motion.id === motionId)

export const createPlayer = async (options: CreatePlayerOptions): Promise<Player> => {
  assertPreparedPuppetDocument(options.document)

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
    application.destroy({removeView: false}, APPLICATION_DESTROY_OPTIONS)
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

      partById.set(part.id, {mesh, restVertices, vertices})
    }

    applyDocumentScene(document, partById, root)
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

    for (const [partId, runtimePart] of partById) {
      applyMotionVertices({motion: activeMotion, partId, time, vertices: runtimePart.vertices})
    }

    for (const runtimePart of partById.values()) {
      runtimePart.mesh.vertices = runtimePart.vertices
    }

    layoutRoot()
    options.onFrame?.(createPlayerFrame(activeMotion, time))
  }

  application.ticker.add((ticker) => {
    if (motion !== undefined) {
      elapsedTime = (elapsedTime + ticker.deltaMS / MILLISECONDS_PER_SECOND) % motion.duration
    }

    applyMotion(motion, elapsedTime)
  })

  applyMotion(motion, elapsedTime)
  application.render()

  const updateDocument = (nextDocument: PreparedPuppetDocument) => {
    assertPreparedPuppetDocument(nextDocument)

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

    applyDocumentScene(document, partById, root)
    elapsedTime = getSeekTime(motion, elapsedTime)
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
    resize() {
      application.resize()
      layoutRoot()
      application.render()
    },
    seek(time: number) {
      elapsedTime = getSeekTime(motion, time)
      applyMotion(motion, elapsedTime)
      application.render()
    },
    updateDocument,
  }
}
