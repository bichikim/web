import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetParameter,
  type PuppetPart,
} from '../player/document'
import {parseDocumentValue} from '../player/parse-document'
import {type Moc3Model, readMoc3} from './read-moc3'
import type {ConvertCmo3Result} from './convert-cmo3'
import {readMoc3Scene} from './moc3/scene'
import {readMeshes} from './moc3/meshes'
import {readGlue} from './moc3/glue'
import {column, numberAt} from './moc3/tables'
import {readMoc3BlendShapes} from './moc3/blend-shapes'
import {readMoc3PaintOrder} from './moc3/paint-order'

export interface ConvertMoc3Options {
  /** Texture descriptors in the exact order of model3.json FileReferences.Textures. MOC3 contains no image bytes. */
  readonly textures: ReadonlyArray<PuppetPart['texture']>
}
const readParameters = (model: Moc3Model): ReadonlyArray<PuppetParameter> =>
  model.tables.parameters!.ids.map((id, index) => ({
    defaultValue: numberAt(model, 'parameters', 'default', index),
    id,
    maximum: numberAt(model, 'parameters', 'maximum', index),
    minimum: numberAt(model, 'parameters', 'minimum', index),
    name: id,
    repeat: numberAt(model, 'parameters', 'repeat', index) !== 0,
  }))
/** Converts compiled Cubism geometry, native keyform grids and hierarchy to an editable Poffo document. */
export const convertMoc3 = (
  source: ArrayBuffer | Uint8Array,
  options: ConvertMoc3Options,
): ConvertCmo3Result => {
  const model = readMoc3(source)
  const missing = [
    ...new Set(
      model.tables.artMeshes!.ids.map((_, index) => numberAt(model, 'artMeshes', 'texture', index)),
    ),
  ]
    .filter((index) => options.textures[index] === undefined)
    .sort((first, second) => first - second)
  if (missing.length > 0) {
    throw new Error(
      `PNG 텍스처 누락: 인덱스 ${missing.join(', ')} (0부터 시작). model3.json의 Textures 목록에 맞게 PNG를 추가하세요.`,
    )
  }
  const parameters = readParameters(model)
  const meshes = readMeshes(model, parameters, options.textures)
  if (meshes.parts.length === 0) {
    throw new Error('MOC3 has no textured meshes')
  }
  const rig = readMoc3Scene(model, parameters, meshes.objects)
  const glue = readGlue(model, parameters)
  const order = readMoc3PaintOrder(model)
  const ordered = [...new Set([...order, ...meshes.parts.map((_, index) => index)])].map(
    (index) => {
      const part = meshes.parts[index]
      if (part === undefined) {
        throw new Error('MOC3 draw order references a missing mesh')
      }
      return part
    },
  )
  const document: PuppetDocument = {
    colorComposition: 'cubism',
    drawOrderRounding: 'cubism',
    drawOrderTieBreak: 'parts',
    format: PUPPET_DOCUMENT_FORMAT,
    glue: glue.glue,
    glueComposition: 'sequential',
    motions: [],
    parameterBindings: [
      ...rig.parameterBindings,
      ...glue.parameterBindings,
      ...readMoc3BlendShapes(model, rig.objects, meshes.parts, parameters),
    ],
    parameters,
    parts: ordered,
    scene: rig.scene,
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height: model.canvas.height, width: model.canvas.width},
  }
  const parsed = parseDocumentValue(document)
  if (!parsed.ok) {
    throw new Error('Converted MOC3 is not a valid Poffo document')
  }
  return {document: parsed.document, warnings: []}
}
