/* eslint-disable no-bitwise, no-magic-numbers -- Base64 encodes fixed-width bytes. */
import {validateMesh} from '../mesh/validate'
import {encodeBase64} from '../encoding/encode-base64'
import {DOMParser, type Element} from '@xmldom/xmldom'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
  type PuppetPartBlendMode,
} from '../player/document'
import {parseDocumentValue} from '../player/parse-document'
import {convertCmo3Rig} from './convert-cmo3-rig'
import {readCmo3PaintOrder} from './read-cmo3-paint-order'
import {readCmo3Archive} from './read-cmo3-archive'
import {child, elementChildren, field, getSources, guid, numbers, resolve, scalar} from './cmo3-xml'

export interface ConvertCmo3Result {
  readonly document: PuppetDocument
  readonly warnings: ReadonlyArray<string>
}

interface ConvertedPart {
  readonly source: Element
  readonly clippingGuids: ReadonlyArray<string>
  readonly guid: string | undefined
  readonly invertedMask: boolean
  readonly part: PuppetPart
}

interface TextureSource {
  readonly entries: ReadonlyMap<string, Uint8Array>
  readonly cache: Map<string, PuppetPart['texture']>
}

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)

const isPng = (bytes: Uint8Array, width: number, height: number): boolean => {
  if (bytes.length < 24 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return false
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return view.getUint32(16, false) === width && view.getUint32(20, false) === height
}

const getModel = (root: Element): Element => {
  const main = child(root, 'main')
  const model = main === undefined ? undefined : child(main, 'CModelSource')
  if (model === undefined) {
    throw new Error('CMO3 model definition is missing')
  }
  return model
}

const getCanvas = (model: Element): {readonly height: number; readonly width: number} => {
  const canvas = child(model, 'CImageCanvas', 'canvas')
  const width = canvas === undefined ? undefined : scalar(child(canvas, 'i', 'pixelWidth'))
  const height = canvas === undefined ? undefined : scalar(child(canvas, 'i', 'pixelHeight'))
  if (width === undefined || height === undefined || width <= 0 || height <= 0) {
    throw new Error('CMO3 model canvas is invalid')
  }
  return {height, width}
}

const getMeshes = (
  model: Element,
  references: ReadonlyMap<string, Element>,
): ReadonlyArray<Element> => {
  const sourceSet = child(model, 'CDrawableSourceSet', 'drawableSourceSet')
  const sources = sourceSet === undefined ? undefined : child(sourceSet, 'carray_list', '_sources')
  if (sources === undefined) {
    throw new Error('CMO3 model has no drawable source set')
  }
  return elementChildren(sources).flatMap((candidate) => {
    const mesh = resolve(candidate, references)
    return mesh?.tagName === 'CArtMeshSource' ? [mesh] : []
  })
}

const getTexture = (
  mesh: Element,
  references: ReadonlyMap<string, Element>,
  textureSource: TextureSource,
): PuppetPart['texture'] | undefined => {
  const texture = resolve(child(mesh, 'GTexture2D', 'texture'), references)
  const resource =
    texture === undefined
      ? undefined
      : resolve(field(texture, 'CImageResource', 'srcImageResource'), references)
  const image = resource === undefined ? undefined : field(resource, 'file', 'imageFileBuf')
  const path = image?.getAttribute('path')
  const bytes = path === null || path === undefined ? undefined : textureSource.entries.get(path)
  const width = Number(resource?.getAttribute('width'))
  const height = Number(resource?.getAttribute('height'))
  if (
    path === null ||
    path === undefined ||
    bytes === undefined ||
    width <= 0 ||
    height <= 0 ||
    !isPng(bytes, width, height)
  ) {
    return undefined
  }
  const cached = textureSource.cache.get(path)
  if (cached !== undefined) {
    return cached
  }
  const result = {height, src: `data:image/png;base64,${encodeBase64(bytes)}`, width}
  textureSource.cache.set(path, result)
  return result
}

const getPart = (
  mesh: Element,
  references: ReadonlyMap<string, Element>,
  textureSource: TextureSource,
): ConvertedPart | undefined => {
  const texture = getTexture(mesh, references, textureSource)
  const vertices = numbers(resolve(child(mesh, 'float-array', 'positions'), references))
  const uvs = numbers(resolve(child(mesh, 'float-array', 'uvs'), references))
  const indices = numbers(resolve(child(mesh, 'int-array', 'indices'), references))
  const drawable = child(mesh, 'ACDrawableSource', 'super')
  const id =
    drawable === undefined ? undefined : field(drawable, 'CDrawableId', 'id')?.getAttribute('idstr')
  if (texture === undefined || id === undefined || id === null || id.length === 0) {
    return undefined
  }

  const keyforms = child(mesh, 'carray_list', 'keyforms')
  const initialForm = keyforms === undefined ? undefined : child(keyforms, 'CArtMeshForm')
  const opacity = initialForm === undefined ? 1 : (scalar(field(initialForm, 'f', 'opacity')) ?? 1)
  const clippingList =
    drawable === undefined ? undefined : child(drawable, 'carray_list', 'clipGuidList')
  const clippingGuids =
    clippingList === undefined
      ? []
      : elementChildren(clippingList).map((candidate) => {
          const reference = candidate.getAttribute('xs.ref')
          if (reference !== null && !references.has(reference)) {
            throw new Error(`CMO3 mask source is missing for ${id}`)
          }
          const value = guid(candidate, references)
          if (value === undefined) {
            throw new Error(`CMO3 mask source is missing for ${id}`)
          }
          return value
        })
  const invertedMask =
    drawable === undefined
      ? false
      : field(drawable, 'b', 'invertClippingMask')?.textContent === 'true'
  const composition = resolve(child(mesh, 'ColorComposition', 'colorComposition'), references)
  const culling = resolve(child(mesh, 'b', 'culling'), references)
  const geometry = {indices, uvs, vertices}
  const part: PuppetPart = {
    id,
    mesh: validateMesh(geometry).valid ? geometry : {...geometry, validationSpace: 'indices'},
    properties: {
      blendMode: blendMode(composition?.getAttribute('v')),
      culling: culling?.textContent === 'true',
      opacity,
    },
    texture,
  }
  return {
    clippingGuids,
    guid: guid(
      drawable === undefined ? undefined : child(drawable, 'CDrawableGuid', 'guid'),
      references,
    ),
    invertedMask,
    part,
    source: mesh,
  }
}

const blendMode = (value: string | null | undefined): PuppetPartBlendMode => {
  switch (value) {
    case undefined:
    case null:
    case 'NORMAL':
      return 'normal'
    case 'MULTIPLY':
      return 'multiply-compatible'
    case 'ADD':
      return 'add-compatible'
    default:
      throw new Error(`Unsupported CMO3 blend mode: ${value}`)
  }
}

/** Converts Cubism Editor geometry, parameter keyforms and deformer hierarchy into a Poffo document. */
export const convertCmo3 = (source: ArrayBuffer | Uint8Array): ConvertCmo3Result => {
  const archive = readCmo3Archive(source)
  const xml = new DOMParser().parseFromString(archive.xml, 'application/xml')
  const root = xml.documentElement
  if (root === null || root.tagName !== 'root') {
    throw new Error('CMO3 model XML is invalid')
  }
  const references = new Map<string, Element>()
  for (const element of Array.from(root.getElementsByTagName('*'))) {
    const id = element.getAttribute('xs.id')
    if (id !== null) {
      references.set(id, element)
    }
  }
  const model = getModel(root)
  const viewport = getCanvas(model)
  const meshes = getMeshes(model, references)
  const textureSource: TextureSource = {cache: new Map(), entries: archive.entries}
  const converted = meshes.flatMap((mesh) => {
    const entry = getPart(mesh, references, textureSource)
    return entry === undefined ? [] : [entry]
  })
  if (converted.length === 0) {
    throw new Error('CMO3 model has no convertible textured meshes')
  }
  const partIdByGuid = new Map(
    converted.flatMap((entry) =>
      entry.guid === undefined ? [] : [[entry.guid, entry.part.id] as const],
    ),
  )
  const maskPartIds = new Set<string>()
  const clippedParts = converted.map((entry) => {
    const clippingMaskIds = entry.clippingGuids.map((value) => {
      const partId = partIdByGuid.get(value)
      if (partId === undefined) {
        throw new Error(`CMO3 mask source is missing for ${entry.part.id}`)
      }
      maskPartIds.add(partId)
      return partId
    })
    return clippingMaskIds.length === 0
      ? entry.part
      : {
          ...entry.part,
          properties: {...entry.part.properties, clippingMaskIds, invertedMask: entry.invertedMask},
        }
  })
  const parts = clippedParts.map(
    (part): PuppetPart =>
      maskPartIds.has(part.id)
        ? {
            ...part,
            properties: {...part.properties, renderWhenUsedAsMask: true},
          }
        : part,
  )
  const {warnings: rigWarnings, ...rig} = convertCmo3Rig(
    model,
    references,
    converted.map((entry, index) => ({part: parts[index]!, source: entry.source})),
  )
  const paintOrder = readCmo3PaintOrder(
    model,
    references,
    converted.map(({part, source}) => ({id: part.id, source})),
  )
  const partById = new Map(rig.parts.map((part) => [part.id, part]))
  const parameterIds = new Set(rig.parameters.map((parameter) => parameter.id))
  const document: PuppetDocument = {
    ...rig,
    colorComposition: 'cubism',
    drawOrderRounding: 'cubism',
    drawOrderTieBreak: 'parts',
    format: PUPPET_DOCUMENT_FORMAT,
    glueComposition: 'sequential',
    motions: [],
    parameterRoles: {
      eyeBlink: ['ParamEyeLOpen', 'ParamEyeROpen'].filter((id) => parameterIds.has(id)),
      lipSync: ['ParamMouthOpenY'].filter((id) => parameterIds.has(id)),
    },
    parts: paintOrder.map((id) => partById.get(id)!),
    version: PUPPET_DOCUMENT_VERSION,
    viewport,
  }
  const parsed = parseDocumentValue(document)
  if (!parsed.ok) {
    throw new Error('Converted CMO3 geometry is not a valid Puppet document')
  }
  const skipped = meshes.length - converted.length
  const warnings = [
    ...rigWarnings,
    'CMO3에 별도 모션 파일은 포함되지 않습니다. SDK 모델 묶음의 모션·표정 프리셋은 별도로 가져올 수 있습니다.',
    ...(skipped === 0
      ? []
      : [`텍스처 또는 식별자를 읽을 수 없는 메시 ${skipped}개를 제외했습니다.`]),
  ]
  return {document: parsed.document, warnings}
}
