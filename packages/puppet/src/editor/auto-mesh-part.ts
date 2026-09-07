import {generateMesh, type GenerateMeshErrorCode, type PixelData} from '../mesh'
import type {PuppetDocument, PuppetPart} from '../player/document'
import {resetPartDeformations} from './internal/reset-part-deformations'
import {MAXIMUM_TEXTURE_PIXELS} from './internal/texture-limits'

export interface AutoMeshSettings {
  readonly alphaThreshold: number
  readonly cellSize: number
}

export type AutoMeshPartErrorCode = GenerateMeshErrorCode | 'part-not-found' | 'too-large'

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
  readonly pixels: PixelData
  readonly settings: AutoMeshSettings
}

export interface ValidateAutoMeshPartOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly settings: AutoMeshSettings
}

export interface ValidateAutoMeshPartSuccess {
  readonly ok: true
  readonly part: PuppetPart
}

export type ValidateAutoMeshPartResult = AutoMeshPartFailure | ValidateAutoMeshPartSuccess

const MAXIMUM_AUTO_MESH_DIVISIONS_PER_AXIS = 256
const MAXIMUM_ALPHA_THRESHOLD = 255

export const getMinimumAutoMeshCellSize = (width: number, height: number) =>
  Math.max(1, Math.ceil(Math.max(width, height) / MAXIMUM_AUTO_MESH_DIVISIONS_PER_AXIS))

export const validateAutoMeshPart = (
  options: ValidateAutoMeshPartOptions,
): ValidateAutoMeshPartResult => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)

  if (part === undefined) {
    return {error: {code: 'part-not-found'}, ok: false}
  }

  if (part.texture.width * part.texture.height > MAXIMUM_TEXTURE_PIXELS) {
    return {error: {code: 'too-large'}, ok: false}
  }

  if (
    !Number.isInteger(options.settings.alphaThreshold) ||
    options.settings.alphaThreshold < 0 ||
    options.settings.alphaThreshold > MAXIMUM_ALPHA_THRESHOLD
  ) {
    return {error: {code: 'invalid-alpha-threshold'}, ok: false}
  }

  const minimumCellSize = getMinimumAutoMeshCellSize(part.texture.width, part.texture.height)

  if (!Number.isFinite(options.settings.cellSize) || options.settings.cellSize < minimumCellSize) {
    return {error: {code: 'invalid-cell-size'}, ok: false}
  }

  return {ok: true, part}
}

export const autoMeshPart = (options: AutoMeshPartOptions): AutoMeshPartResult => {
  const validation = validateAutoMeshPart(options)

  if (!validation.ok) {
    return validation
  }

  if (
    options.pixels.width !== validation.part.texture.width ||
    options.pixels.height !== validation.part.texture.height
  ) {
    return {error: {code: 'invalid-pixel-data'}, ok: false}
  }

  const generatedMesh = generateMesh({
    alphaThreshold: options.settings.alphaThreshold,
    cellSize: options.settings.cellSize,
    pixels: options.pixels,
  })

  if (!generatedMesh.ok) {
    return generatedMesh
  }

  const resetDocument = resetPartDeformations(
    options.document,
    validation.part.id,
    generatedMesh.mesh.vertices,
  )

  return {
    document: {
      ...resetDocument,
      parts: resetDocument.parts.map((candidate) =>
        candidate.id === validation.part.id ? {...candidate, mesh: generatedMesh.mesh} : candidate,
      ),
    },
    ok: true,
  }
}
