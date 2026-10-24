import type {
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterKeyformBase,
  PuppetPart,
  PuppetPartRenderProperties,
} from '../../player/document'
import type {Moc3Model} from '../read-moc3'
import {PUPPET_DEFAULT_DRAW_ORDER} from '../../player/document-render'
import {readBlendBindings} from './blend-bindings'
import type {NativeObject} from './types'
import {column, numberAt, readColors, readPosition, readWarpPosition} from './tables'
const DEGREES_PER_HALF_TURN = 180

interface BlendTarget {
  readonly object: NativeObject
  readonly source: number
  readonly table: string
  readonly formTable: string
  readonly blendTable: string
  readonly part?: PuppetPart
  readonly scaleFactor?: number
}

const findTarget = (
  model: Moc3Model,
  object: NativeObject,
  parts: ReadonlyArray<PuppetPart>,
): BlendTarget => {
  const identifier = object.sourceId ?? object.id
  switch (object.node.kind) {
    case 'part':
      return {
        blendTable: 'blendMeshes',
        formTable: 'meshKeyforms',
        object,
        part: parts.find((part) => part.id === object.id),
        source: model.tables.artMeshes!.ids.indexOf(identifier),
        table: 'artMeshes',
      }
    case 'group':
      return {
        blendTable: 'blendParts',
        formTable: 'partKeyforms',
        object,
        source: model.tables.parts!.ids.indexOf(identifier),
        table: 'parts',
      }
    case 'deformer': {
      const index = model.tables.deformers!.ids.indexOf(identifier)
      const rotation = object.node.deformerType === 'rotation'
      const source = numberAt(model, 'deformers', 'source', index)
      const table = rotation ? 'rotationDeformers' : 'warpDeformers'

      return {
        blendTable: rotation ? 'blendRotations' : 'blendWarps',
        formTable: rotation ? 'rotationKeyforms' : 'warpKeyforms',
        object,
        scaleFactor: object.rotationScaleFactor ?? 1,
        source,
        table,
      }
    }
    default: {
      const exhaustive: never = object.node
      throw new Error(`Unsupported MOC3 blend target: ${String(exhaustive)}`)
    }
  }
}

const readDeltaProperties = (
  model: Moc3Model,
  target: BlendTarget,
  form: number,
): PuppetPartRenderProperties => {
  const {object, formTable, source, table} = target
  const rest: PuppetPartRenderProperties | undefined =
    target.part?.properties ?? (object.node.kind === 'part' ? undefined : object.node.properties)
  const colors = readColors(model, {index: source, table}, {index: form, table: formTable}, true)
  const hasColors = column(model, 'multiplyColors', 'red').length > 0
  const addColor = (name: 'multiplyColor' | 'screenColor'): readonly [number, number, number] => {
    const base = rest?.[name] ?? (name === 'multiplyColor' ? [1, 1, 1] : [0, 0, 0])
    const delta = hasColors ? colors[name] : [0, 0, 0]
    return [base[0]! + delta[0]!, base[1]! + delta[1]!, base[2]! + delta[2]!]
  }
  return {
    ...(formTable === 'partKeyforms'
      ? {}
      : {
          multiplyColor: addColor('multiplyColor'),
          opacity: (rest?.opacity ?? 1) + numberAt(model, formTable, 'opacity', form),
          screenColor: addColor('screenColor'),
        }),
    ...(formTable === 'meshKeyforms' ||
    (formTable === 'partKeyforms' && rest?.drawOrder !== undefined)
      ? {
          drawOrder:
            (rest?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER) +
            numberAt(model, formTable, 'order', form),
        }
      : {}),
  }
}

const readDeltaForm = (
  model: Moc3Model,
  target: BlendTarget,
  form: number,
): PuppetParameterKeyformBase => {
  const {object, formTable} = target
  const properties = readDeltaProperties(model, target, form)
  switch (object.node.kind) {
    case 'part': {
      const rest = target.part?.mesh.vertices
      if (rest === undefined) {
        throw new Error('MOC3 blend shape references a missing mesh')
      }
      const delta = readPosition(model, formTable, form, rest.length / 2)
      return {
        parts: [
          {
            partId: object.id,
            properties,
            vertices: rest.map((value, index) => value + delta[index]!),
          },
        ],
      }
    }
    case 'group':
      return {groups: [{groupId: object.id, properties}], parts: []}
    case 'deformer': {
      const {node} = object
      const rest = node.controlPoints
      if (node.deformerType !== 'rotation') {
        const delta = readWarpPosition(model, form, node.columns, node.rows)
        return {
          deformers: [
            {
              controlPoints: rest.map((value, index) => value + delta[index]!),
              kind: 'deformer',
              nodeId: object.id,
              properties,
            },
          ],
          parts: [],
        }
      }
      const angle =
        (node.rotationAngle ?? Math.atan2(rest[3]! - rest[1]!, rest[2]! - rest[0]!)) +
        (numberAt(model, formTable, 'angle', form) * Math.PI * (model.canvas.reverseY ? -1 : 1)) /
          DEGREES_PER_HALF_TURN
      const x = rest[0]! + numberAt(model, formTable, 'x', form)
      const y = rest[1]! + numberAt(model, formTable, 'y', form) * (model.canvas.reverseY ? -1 : 1)
      return {
        deformers: [
          {
            controlPoints: [x, y, x + Math.cos(angle), y + Math.sin(angle)],
            kind: 'deformer',
            nodeId: object.id,
            properties,
            rotationAngle: angle,
            rotationReflection: node.rotationReflection,
            rotationScale:
              (node.rotationScale ?? 1) +
              numberAt(model, formTable, 'scale', form) * target.scaleFactor!,
          },
        ],
        parts: [],
      }
    }
    default: {
      const exhaustive: never = object.node
      throw new Error(`Unsupported MOC3 blend target: ${String(exhaustive)}`)
    }
  }
}

/** Preserves compiled additive blend shapes and their parameter-dependent constraints. */
export const readMoc3BlendShapes = (
  model: Moc3Model,
  objects: ReadonlyArray<NativeObject>,
  parts: ReadonlyArray<PuppetPart>,
  parameters: ReadonlyArray<PuppetParameter>,
): ReadonlyArray<PuppetParameterBinding> =>
  objects.flatMap((object) => {
    const target = findTarget(model, object, parts)
    const ordinary = readBlendBindings(
      model,
      {
        id: `moc3:blend:${object.id}`,
        index: target.source,
        table: target.blendTable,
        ...(object.node.kind === 'part'
          ? {targetPartIds: [object.id]}
          : object.node.kind === 'group'
            ? {targetGroupIds: [object.id]}
            : {targetDeformerIds: [object.id]}),
      },
      parameters,
      (form) => readDeltaForm(model, target, form),
    )
    const offscreen =
      object.node.kind === 'group' ? (column(model, 'parts', 'offscreen')[target.source] ?? -1) : -1
    if (offscreen < 0) {
      return ordinary
    }
    const surfaceTarget = {...target, formTable: 'offscreenKeyforms'}
    return [
      ...ordinary,
      ...readBlendBindings(
        model,
        {
          id: `moc3:blend:offscreen:${object.id}`,
          index: offscreen,
          table: 'blendOffscreens',
          targetGroupIds: [object.id],
        },
        parameters,
        (form) => readDeltaForm(model, surfaceTarget, form),
      ),
    ]
  })
