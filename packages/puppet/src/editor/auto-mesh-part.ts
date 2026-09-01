import {generateMesh, type GenerateMeshErrorCode} from '../mesh'
import type {PuppetDocument, PuppetParameterKeyform, PuppetPart} from '../player/document'
import {MAXIMUM_TEXTURE_PIXELS} from './internal/texture-limits'

export interface AutoMeshSettings {
  readonly alphaThreshold: number
  readonly cellSize: number
}

export type AutoMeshPartErrorCode =
  | GenerateMeshErrorCode
  | 'decode-failed'
  | 'part-not-found'
  | 'render-failed'
  | 'too-large'

export interface AutoMeshPartFailure {
  readonly error: {readonly code: AutoMeshPartErrorCode}
  readonly ok: false
}

export interface AutoMeshPartSuccess {
  readonly document: PuppetDocument
  readonly ok: true
}

export type AutoMeshPartResult = AutoMeshPartFailure | AutoMeshPartSuccess

export interface AutoMeshPartOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly settings: AutoMeshSettings
}

const MAXIMUM_AUTO_MESH_DIVISIONS_PER_AXIS = 256

export const getMinimumAutoMeshCellSize = (width: number, height: number) =>
  Math.max(1, Math.ceil(Math.max(width, height) / MAXIMUM_AUTO_MESH_DIVISIONS_PER_AXIS))

const decodeTexture = async (part: PuppetPart) => {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.decoding = 'async'
  image.src = part.texture.src

  try {
    await image.decode()
    return image
  } catch {
    return undefined
  }
}

interface ResetParameterKeyformOptions {
  readonly keyform: PuppetParameterKeyform
  readonly partId: string
  readonly targetsPart: boolean
  readonly vertices: ReadonlyArray<number>
}

const resetParameterKeyform = (options: ResetParameterKeyformOptions) => {
  if (!options.targetsPart) {
    return options.keyform
  }

  const hasPart = options.keyform.parts.some((part) => part.partId === options.partId)
  const resetPart = {partId: options.partId, vertices: options.vertices}

  return {
    ...options.keyform,
    parts: hasPart
      ? options.keyform.parts.map((part) => (part.partId === options.partId ? resetPart : part))
      : [...options.keyform.parts, resetPart],
  }
}

const resetPartDeformations = (
  document: PuppetDocument,
  partId: string,
  vertices: ReadonlyArray<number>,
): PuppetDocument => ({
  ...document,
  motions: document.motions.map((motion) => ({
    ...motion,
    tracks: motion.tracks.filter((track) => track.partId !== partId),
  })),
  parameters: document.parameters?.map((parameter) => ({
    ...parameter,
    keyforms: parameter.keyforms.map((keyform) =>
      resetParameterKeyform({
        keyform,
        partId,
        targetsPart:
          parameter.targetPartIds?.includes(partId) ??
          keyform.parts.some((part) => part.partId === partId),
        vertices,
      }),
    ),
  })),
})

export const autoMeshPart = async (options: AutoMeshPartOptions): Promise<AutoMeshPartResult> => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)

  if (part === undefined) {
    return {error: {code: 'part-not-found'}, ok: false}
  }

  if (part.texture.width * part.texture.height > MAXIMUM_TEXTURE_PIXELS) {
    return {error: {code: 'too-large'}, ok: false}
  }

  const minimumCellSize = getMinimumAutoMeshCellSize(part.texture.width, part.texture.height)

  if (!Number.isFinite(options.settings.cellSize) || options.settings.cellSize < minimumCellSize) {
    return {error: {code: 'invalid-cell-size'}, ok: false}
  }

  const image = await decodeTexture(part)

  if (image === undefined) {
    return {error: {code: 'decode-failed'}, ok: false}
  }

  const canvas = window.document.createElement('canvas')
  canvas.width = part.texture.width
  canvas.height = part.texture.height
  const context = canvas.getContext('2d', {willReadFrequently: true})

  if (context === null) {
    return {error: {code: 'render-failed'}, ok: false}
  }

  let pixels: ImageData

  try {
    context.drawImage(image, 0, 0, part.texture.width, part.texture.height)
    pixels = context.getImageData(0, 0, part.texture.width, part.texture.height)
  } catch {
    return {error: {code: 'render-failed'}, ok: false}
  }

  const generatedMesh = generateMesh({
    alphaThreshold: options.settings.alphaThreshold,
    cellSize: options.settings.cellSize,
    pixels,
  })

  if (!generatedMesh.ok) {
    return generatedMesh
  }

  const resetDocument = resetPartDeformations(
    options.document,
    part.id,
    generatedMesh.mesh.vertices,
  )

  return {
    document: {
      ...resetDocument,
      parts: resetDocument.parts.map((candidate) =>
        candidate.id === part.id ? {...candidate, mesh: generatedMesh.mesh} : candidate,
      ),
    },
    ok: true,
  }
}
