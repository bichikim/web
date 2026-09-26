/* eslint-disable no-bitwise, no-magic-numbers -- Base64 encodes fixed-width bytes. */
import {DOMParser, type Element} from '@xmldom/xmldom'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
  type PuppetScenePartNode,
} from '../player/document'
import {parseDocumentValue} from '../player/parse-document'
import {readCmo3Archive} from './read-cmo3-archive'

export interface ConvertCmo3Result {
  readonly document: PuppetDocument
  readonly warnings: ReadonlyArray<string>
}

interface ConvertedPart {
  readonly clippingGuids: ReadonlyArray<string>
  readonly drawOrder: number
  readonly guid: string | undefined
  readonly invertedMask: boolean
  readonly part: PuppetPart
  readonly sourceOrder: number
  readonly visible: boolean
}

interface TextureSource {
  readonly entries: ReadonlyMap<string, Uint8Array>
  readonly cache: Map<string, PuppetPart['texture']>
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)

const isPng = (bytes: Uint8Array, width: number, height: number): boolean => {
  if (bytes.length < 24 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return false
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return view.getUint32(16, false) === width && view.getUint32(20, false) === height
}

const encodeBase64 = (bytes: Uint8Array): string => {
  const output: string[] = []
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!
    const second = bytes[index + 1]
    const third = bytes[index + 2]
    output.push(
      BASE64_ALPHABET[first >> 2]!,
      BASE64_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)]!,
      second === undefined ? '=' : BASE64_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)]!,
      third === undefined ? '=' : BASE64_ALPHABET[third & 63]!,
    )
  }
  return output.join('')
}

const elementChildren = (element: Element): ReadonlyArray<Element> =>
  Array.from(element.childNodes).filter((node): node is Element => node.nodeType === 1)

const child = (element: Element, tag: string, field?: string): Element | undefined =>
  elementChildren(element).find(
    (candidate) =>
      candidate.tagName === tag &&
      (field === undefined || candidate.getAttribute('xs.n') === field),
  )

const field = (element: Element, tag: string, name: string): Element | undefined =>
  Array.from(element.getElementsByTagName(tag)).find(
    (candidate) => candidate.getAttribute('xs.n') === name,
  )

const numbers = (element: Element | undefined): ReadonlyArray<number> =>
  element?.textContent?.trim().split(/\s+/u).map(Number) ?? []

const scalar = (element: Element | undefined): number | undefined => {
  const value = Number(element?.textContent)
  return element === undefined || !Number.isFinite(value) ? undefined : value
}

const resolve = (
  element: Element | undefined,
  references: ReadonlyMap<string, Element>,
): Element | undefined => {
  if (element === undefined) {
    return undefined
  }
  const reference = element.getAttribute('xs.ref')
  return reference === null ? element : references.get(reference)
}

const guid = (
  element: Element | undefined,
  references: ReadonlyMap<string, Element>,
): string | undefined => resolve(element, references)?.getAttribute('uuid') ?? undefined

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
  sourceOrder: number,
): ConvertedPart | undefined => {
  const texture = getTexture(mesh, references, textureSource)
  const vertices = numbers(child(mesh, 'float-array', 'positions'))
  const uvs = numbers(child(mesh, 'float-array', 'uvs'))
  const indices = numbers(child(mesh, 'int-array', 'indices'))
  const drawable = child(mesh, 'ACDrawableSource', 'super')
  const id =
    drawable === undefined ? undefined : field(drawable, 'CDrawableId', 'id')?.getAttribute('idstr')
  if (texture === undefined || id === undefined || id === null || id.length === 0) {
    return undefined
  }

  const keyforms = child(mesh, 'carray_list', 'keyforms')
  const initialForm = keyforms === undefined ? undefined : child(keyforms, 'CArtMeshForm')
  const drawOrder =
    initialForm === undefined ? 500 : (scalar(field(initialForm, 'i', 'drawOrder')) ?? 500)
  const opacity = initialForm === undefined ? 1 : (scalar(field(initialForm, 'f', 'opacity')) ?? 1)
  const visible =
    drawable === undefined ? true : field(drawable, 'b', 'isVisible')?.textContent !== 'false'
  const clippingList =
    drawable === undefined ? undefined : child(drawable, 'carray_list', 'clipGuidList')
  const clippingGuids =
    clippingList === undefined
      ? []
      : elementChildren(clippingList).map((candidate) => {
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
  const part: PuppetPart = {
    id,
    mesh: {indices, uvs, vertices},
    properties: {opacity},
    texture,
  }
  return {
    clippingGuids,
    drawOrder,
    guid: guid(
      drawable === undefined ? undefined : child(drawable, 'CDrawableGuid', 'guid'),
      references,
    ),
    invertedMask,
    part,
    sourceOrder,
    visible,
  }
}

const getSceneNode = (entry: ConvertedPart): PuppetScenePartNode => ({
  id: entry.part.id,
  kind: 'part',
  locked: false,
  name: entry.part.id,
  visible: entry.visible,
})

/** Converts the static mesh and texture pose of a Cubism Editor CAFF model into a Puppet document. */
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
  const converted = meshes.flatMap((mesh, sourceOrder) => {
    const entry = getPart(mesh, references, textureSource, sourceOrder)
    return entry === undefined ? [] : [entry]
  })
  if (converted.length === 0) {
    throw new Error('CMO3 model has no convertible textured meshes')
  }
  converted.sort(
    (first, second) => first.drawOrder - second.drawOrder || first.sourceOrder - second.sourceOrder,
  )
  const partIdByGuid = new Map(
    converted.flatMap((entry) =>
      entry.guid === undefined ? [] : [[entry.guid, entry.part.id] as const],
    ),
  )
  const maskInversionByPartId = new Map<string, boolean>()
  const clippedParts = converted.map((entry) => {
    const clippingMaskIds = entry.clippingGuids.map((value) => {
      const partId = partIdByGuid.get(value)
      if (partId === undefined) {
        throw new Error(`CMO3 mask source is missing for ${entry.part.id}`)
      }
      const previousInversion = maskInversionByPartId.get(partId)
      if (previousInversion !== undefined && previousInversion !== entry.invertedMask) {
        throw new Error(`CMO3 mask ${partId} is used with conflicting inversion settings`)
      }
      maskInversionByPartId.set(partId, entry.invertedMask)
      return partId
    })
    return clippingMaskIds.length === 0
      ? entry.part
      : {
          ...entry.part,
          properties: {
            ...entry.part.properties,
            clippingMaskIds,
          },
        }
  })
  const parts = clippedParts.map((part): PuppetPart => {
    const invertedMask = maskInversionByPartId.get(part.id)
    if (invertedMask === undefined) {
      return part
    }
    return {
      ...part,
      properties: {
        ...part.properties,
        invertedMask,
        renderWhenUsedAsMask: true,
      },
    }
  })
  const document: PuppetDocument = {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parameterBindings: [],
    parameters: [],
    parts,
    scene: {roots: converted.map(getSceneNode)},
    version: PUPPET_DOCUMENT_VERSION,
    viewport,
  }
  const parsed = parseDocumentValue(document)
  if (!parsed.ok) {
    throw new Error('Converted CMO3 geometry is not a valid Puppet document')
  }
  const skipped = meshes.length - converted.length
  const warnings = [
    '메시의 기본 형태와 텍스처만 변환했습니다. Cubism 디포머, 파라미터 키폼, 물리와 모션은 이 문서에 포함되지 않습니다.',
    ...(skipped === 0
      ? []
      : [`텍스처 또는 식별자를 읽을 수 없는 메시 ${skipped}개를 제외했습니다.`]),
  ]
  return {document: parsed.document, warnings}
}
