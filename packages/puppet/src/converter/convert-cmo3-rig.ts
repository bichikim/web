import type {Element} from '@xmldom/xmldom'
import {
  PUPPET_DEFAULT_DRAW_ORDER,
  type PuppetColor,
  type PuppetDocument,
  type PuppetParameter,
  type PuppetParameterBinding,
  type PuppetParameterKeyformBase,
  type PuppetPart,
  type PuppetSceneDeformerNode,
  type PuppetSceneNode,
} from '../player/document'
import {
  fromColorEffectCoordinates,
  toColorEffectCoordinates,
} from '../deformation/keyed-color-effect'
import {sampleGridCoordinates} from '../deformation/sample-grid-coordinates'
import {child, field, getSources, guid, numbers, resolve, scalar} from './cmo3-xml'
import {type Cmo3Keyforms, readCmo3Keyforms} from './read-cmo3-keyforms'
import {createCubismBindings} from './create-cubism-bindings'
import {readCmo3Physics} from './read-cmo3-physics'
import {validateMesh} from '../mesh/validate'
import type {PuppetPhysics} from '../player/document-physics'
import {readCmo3Morphs} from './read-cmo3-morphs'
import {readCmo3Glue} from './read-cmo3-glue'

const HALF_TURN_DEGREES = 180

interface Cmo3Mesh {
  readonly part: PuppetPart
  readonly source: Element
}

interface RigObject {
  readonly references: ReadonlyMap<string, Element>
  readonly source: Element
  readonly guid: string
  readonly parent: string | undefined
  readonly node: PuppetSceneNode
  readonly keyforms: Cmo3Keyforms
}

export interface Cmo3Rig {
  readonly physics?: PuppetPhysics
  readonly warnings: ReadonlyArray<string>
  readonly glue: NonNullable<PuppetDocument['glue']>
  readonly parameterBindings: ReadonlyArray<PuppetParameterBinding>
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly parts: ReadonlyArray<PuppetPart>
  readonly scene: NonNullable<PuppetDocument['scene']>
}

const sourceId = (source: Element, tag: string, references: ReadonlyMap<string, Element>) => {
  const value = resolve(field(source, tag, 'id'), references)?.getAttribute('idstr')
  if (value === undefined || value === null || value.length === 0) {
    throw new Error(`CMO3 ${source.tagName} has no ID`)
  }
  return value
}

const getColor = (
  form: Element,
  name: string,
  references: ReadonlyMap<string, Element>,
): PuppetColor | undefined => {
  const color = resolve(field(form, 'CFloatColor', name), references)
  return color === undefined
    ? undefined
    : [
        Number(color.getAttribute('red')),
        Number(color.getAttribute('green')),
        Number(color.getAttribute('blue')),
      ]
}

const formProperties = (form: Element, references: ReadonlyMap<string, Element>) => ({
  opacity: Math.min(1, Math.max(0, scalar(field(form, 'f', 'opacity')) ?? 1)),
  ...(getColor(form, 'multiplyColor', references) === undefined
    ? {}
    : {multiplyColor: getColor(form, 'multiplyColor', references)}),
  ...(getColor(form, 'screenColor', references) === undefined
    ? {}
    : {screenColor: getColor(form, 'screenColor', references)}),
})

const partProperties = (form: Element, references: ReadonlyMap<string, Element>) => ({
  ...formProperties(form, references),
  drawOrder: scalar(field(form, 'i', 'drawOrder')) ?? PUPPET_DEFAULT_DRAW_ORDER,
})

const rotationAngle = (source: Element, form: Element) =>
  ((Number(form.getAttribute('angle')) + (scalar(child(source, 'f', 'baseAngle')) ?? 0)) *
    Math.PI) /
  HALF_TURN_DEGREES

const rotationPoints = (source: Element, form: Element): ReadonlyArray<number> => {
  const angle = rotationAngle(source, form)
  const x = Number(form.getAttribute('originX'))
  const y = Number(form.getAttribute('originY'))
  return [x, y, x + Math.cos(angle), y + Math.sin(angle)]
}

const rotationReflection = (form: Element): readonly [boolean, boolean] => [
  form.getAttribute('isReflectX') === 'true',
  form.getAttribute('isReflectY') === 'true',
]

const defaultRotationReflection = (
  object: RigObject,
  parameters: ReadonlyMap<string, PuppetParameter>,
): readonly [boolean, boolean] => {
  const values = defaultCoordinates(
    object,
    parameters,
    (form) => rotationReflection(form).map(Number),
    'step',
  )
  return [values[0]! > 0, values[1]! > 0]
}

const objectKeyform = (object: RigObject, form: Element): PuppetParameterKeyformBase => {
  switch (object.node.kind) {
    case 'part':
      return {
        parts: [
          {
            partId: object.node.id,
            properties: partProperties(form, object.references),
            vertices: numbers(resolve(child(form, 'float-array', 'positions'), object.references)),
          },
        ],
      }
    case 'group':
      return {
        groups: [
          {
            groupId: object.node.id,
            properties: {
              ...formProperties(form, object.references),
              ...(child(object.source, 'b', 'enableDrawOrderGroup')?.textContent === 'true'
                ? {drawOrder: partProperties(form, object.references).drawOrder}
                : {}),
            },
          },
        ],
        parts: [],
      }
    case 'deformer':
      return {
        deformers: [
          {
            controlPoints:
              object.node.deformerType === 'rotation'
                ? rotationPoints(object.source, form)
                : numbers(resolve(child(form, 'float-array', 'positions'), object.references)),
            kind: 'deformer',
            nodeId: object.node.id,
            properties: formProperties(form, object.references),
            ...(object.node.deformerType === 'rotation'
              ? {
                  rotationAngle: rotationAngle(object.source, form),
                  rotationReflection: rotationReflection(form),
                  rotationScale: Number(form.getAttribute('scale')),
                }
              : {}),
          },
        ],
        parts: [],
      }
    default: {
      const exhaustive: never = object.node
      return exhaustive
    }
  }
}

const createBindings = (
  object: RigObject,
  parameterIds: ReadonlyArray<string>,
): ReadonlyArray<PuppetParameterBinding> => {
  const keyforms = object.keyforms.forms
    .map(({form, values}) => ({...objectKeyform(object, form), values}))
    .sort((first, second) => first.values[0]! - second.values[0]!)
  const binding = {
    id: `cmo3:${object.node.id}`,
    interpolation: 'grid' as const,
    ...(object.node.kind === 'deformer' ? {targetDeformerIds: [object.node.id]} : {}),
    ...(object.node.kind === 'group' ? {targetGroupIds: [object.node.id]} : {}),
    ...(object.node.kind === 'part' ? {targetPartIds: [object.node.id]} : {}),
  }
  return createCubismBindings({...binding, keyforms, parameterIds})
}

const defaultCoordinates = (
  object: RigObject,
  parameters: ReadonlyMap<string, PuppetParameter>,
  read: (form: Element) => ReadonlyArray<number>,
  sampling?: 'step',
): ReadonlyArray<number> => {
  const [first] = object.keyforms.forms
  if (first === undefined) {
    return []
  }
  const parameterIds = object.keyforms.parameterGuids.map((key) => {
    const parameter = parameters.get(key)
    if (parameter === undefined) {
      throw new Error(`CMO3 ${object.node.id} refers to a missing parameter`)
    }
    return parameter.id
  })
  if (parameterIds.length === 0) {
    return read(first.form)
  }
  const defaults = object.keyforms.parameterGuids.map((key) => parameters.get(key)!.defaultValue)
  return sampleGridCoordinates({
    binding: {keyforms: object.keyforms.forms, parameterIds},
    keyformCoordinates: object.keyforms.forms.map(({form}) => read(form)),
    restCoordinates: read(first.form),
    sampling,
    values: defaults,
  })
}

const defaultColorProperties = (
  object: RigObject,
  parameters: ReadonlyMap<string, PuppetParameter>,
) =>
  fromColorEffectCoordinates(
    defaultCoordinates(object, parameters, (form) => {
      const properties = formProperties(form, object.references)
      return toColorEffectCoordinates({
        multiplyColor: properties.multiplyColor ?? [1, 1, 1],
        opacity: properties.opacity,
        screenColor: properties.screenColor ?? [0, 0, 0],
      })
    }),
  )

const objectBase = (source: Element, id: string) => ({
  id,
  locked: field(source, 'b', 'isLocked')?.textContent === 'true',
  name: field(source, 's', 'localName')?.textContent || id,
  visible:
    field(source, 'b', 'isVisible')?.textContent !== 'false' &&
    child(source, 'b', 'isSketch')?.textContent !== 'true',
})

const objectParent = (source: Element, references: ReadonlyMap<string, Element>) =>
  guid(field(source, 'CDeformerGuid', 'targetDeformerGuid'), references) ??
  guid(field(source, 'CPartGuid', 'parentGuid'), references)

const readObject = (
  source: Element,
  node: PuppetSceneNode,
  references: ReadonlyMap<string, Element>,
): RigObject => {
  const identifier = guid(
    field(
      source,
      node.kind === 'part'
        ? 'CDrawableGuid'
        : node.kind === 'group'
          ? 'CPartGuid'
          : 'CDeformerGuid',
      'guid',
    ),
    references,
  )
  return {
    guid: identifier ?? node.id,
    keyforms: readCmo3Keyforms(source, references),
    node,
    parent:
      node.kind === 'group'
        ? guid(field(source, 'CPartGuid', 'parentGuid'), references)
        : objectParent(source, references),
    references,
    source,
  }
}

const readDeformer = (source: Element, references: ReadonlyMap<string, Element>): RigObject => {
  const id = sourceId(source, 'CDeformerId', references)
  const rotation = source.tagName === 'CRotationDeformerSource'
  const keyforms = readCmo3Keyforms(source, references)
  const form = keyforms.forms[0]?.form
  if (form === undefined) {
    throw new Error(`CMO3 deformer ${id} has no keyforms`)
  }
  const node: PuppetSceneDeformerNode = {
    ...objectBase(source, id),
    bounds: {height: 1, width: 1, x: 0, y: 0},
    children: [],
    columns: rotation ? 1 : (scalar(child(source, 'i', 'col')) ?? 1),
    controlPoints: rotation
      ? rotationPoints(source, form)
      : numbers(resolve(child(form, 'float-array', 'positions'), references)),
    coordinateSpace: 'parent',
    interpolation: 'triangles',
    kind: 'deformer',
    properties: formProperties(form, references),
    rows: rotation ? 1 : (scalar(child(source, 'i', 'row')) ?? 1),
    ...(rotation
      ? {
          boneRestPoints: [0, 0, 1, 0],
          deformerType: 'rotation',
          rotationAngle: rotationAngle(source, form),
          rotationReflection: rotationReflection(form),
        }
      : {}),
  }
  return readObject(source, node, references)
}

const buildScene = (objects: ReadonlyArray<RigObject>) => {
  const identifiers = new Set(objects.map((object) => object.guid))
  const children = new Map<string | undefined, RigObject[]>()
  for (const object of objects) {
    const parent = identifiers.has(object.parent ?? '') ? object.parent : undefined
    const siblings = children.get(parent) ?? []
    siblings.push(object)
    children.set(parent, siblings)
  }
  const visited = new Set<string>()
  const build = (object: RigObject): PuppetSceneNode => {
    if (visited.has(object.guid)) {
      throw new Error('CMO3 scene hierarchy contains a cycle')
    }
    visited.add(object.guid)
    return object.node.kind === 'part'
      ? object.node
      : {...object.node, children: (children.get(object.guid) ?? []).map(build)}
  }
  const roots = (children.get(undefined) ?? []).map(build)
  if (visited.size !== objects.length) {
    throw new Error('CMO3 scene hierarchy contains a cycle')
  }
  return {roots}
}

const reconcileHierarchy = (objects: ReadonlyArray<RigObject>): ReadonlyArray<RigObject> => {
  const byGuid = new Map(objects.map((object) => [object.guid, object]))
  const copies = new Map<string, RigObject>()
  const output = objects.filter((object) => object.node.kind === 'group')
  for (const object of objects.filter((candidate) => candidate.node.kind === 'part')) {
    const groupGuid = guid(field(object.source, 'CPartGuid', 'parentGuid'), object.references)
    const group = groupGuid === undefined ? undefined : byGuid.get(groupGuid)
    const ancestors: RigObject[] = []
    const visited = new Set<string>()
    let ancestor = byGuid.get(object.parent ?? '')
    while (ancestor?.node.kind === 'deformer') {
      if (visited.has(ancestor.guid)) {
        throw new Error('CMO3 deformer hierarchy contains a cycle')
      }
      visited.add(ancestor.guid)
      ancestors.unshift(ancestor)
      ancestor = byGuid.get(ancestor.parent ?? '')
    }
    let parent = group?.guid
    for (const deformer of ancestors) {
      const identifier = `${deformer.guid}@${group?.guid ?? 'root'}`
      if (!copies.has(identifier)) {
        const copy = {
          ...deformer,
          guid: identifier,
          node: {...deformer.node, id: `${deformer.node.id}@${group?.node.id ?? 'root'}`},
          parent,
        }
        copies.set(identifier, copy)
        output.push(copy)
      }
      parent = identifier
    }
    output.push({...object, parent})
  }
  return output
}

/** CMO3 파라미터, 메시 키폼과 디포머 계층을 Poffo 데이터로 옮긴다. */
export const convertCmo3Rig = (
  model: Element,
  references: ReadonlyMap<string, Element>,
  meshes: ReadonlyArray<Cmo3Mesh>,
): Cmo3Rig => {
  const sources = getSources(model, 'CParameterSourceSet', references)
  const parameters = sources.map(
    (source): PuppetParameter => ({
      defaultValue: scalar(child(source, 'f', 'defaultValue')) ?? 0,
      id: sourceId(source, 'CParameterId', references),
      maximum: scalar(child(source, 'f', 'maxValue')) ?? 1,
      minimum: scalar(child(source, 'f', 'minValue')) ?? 0,
      name: child(source, 's', 'name')?.textContent || sourceId(source, 'CParameterId', references),
      repeat: child(source, 'b', 'isRepeat')?.textContent === 'true',
    }),
  )
  const byGuid = new Map(
    sources.map((source, index) => [
      guid(child(source, 'CParameterGuid', 'guid'), references)!,
      parameters[index]!,
    ]),
  )
  const objects = reconcileHierarchy([
    ...getSources(model, 'CPartSourceSet', references).map((source) => {
      const id = sourceId(source, 'CPartId', references)
      return readObject(
        source,
        {...objectBase(source, id), children: [], kind: 'group'},
        references,
      )
    }),
    ...getSources(model, 'CDeformerSourceSet', references).map((source) =>
      readDeformer(source, references),
    ),
    ...meshes.map(({source, part}) =>
      readObject(source, {...objectBase(source, part.id), kind: 'part'}, references),
    ),
  ])
  const parameterBindings = objects.flatMap((object) =>
    object.keyforms.parameterGuids.length === 0
      ? []
      : createBindings(
          object,
          object.keyforms.parameterGuids.map((key) => {
            const parameter = byGuid.get(key)
            if (parameter === undefined) {
              throw new Error(`CMO3 ${object.node.id} refers to a missing parameter`)
            }
            return parameter.id
          }),
        ),
  )
  const parts = meshes.map(({part}) => {
    const object = objects.find(
      (candidate) => candidate.node.kind === 'part' && candidate.node.id === part.id,
    )!
    if (object.keyforms.forms.length === 0) {
      return part
    }
    const vertices = defaultCoordinates(object, byGuid, (form) =>
      numbers(resolve(child(form, 'float-array', 'positions'), object.references)),
    )
    const opacity = defaultCoordinates(object, byGuid, (form) => [
      partProperties(form, object.references).opacity,
      partProperties(form, object.references).drawOrder,
    ])
    return {
      ...part,
      mesh: validateMesh({...part.mesh, vertices}).valid
        ? {...part.mesh, vertices}
        : {...part.mesh, validationSpace: 'indices' as const, vertices},
      properties: {
        ...part.properties,
        ...defaultColorProperties(object, byGuid),
        drawOrder: opacity[1],
        opacity: opacity[0],
      },
    }
  })
  const posed = objects.map((object) =>
    object.node.kind === 'deformer'
      ? {
          ...object,
          node: {
            ...object.node,
            controlPoints: defaultCoordinates(object, byGuid, (form) =>
              object.node.kind === 'deformer' && object.node.deformerType === 'rotation'
                ? rotationPoints(object.source, form)
                : numbers(resolve(child(form, 'float-array', 'positions'), object.references)),
            ),
            properties: defaultColorProperties(object, byGuid),
            ...(object.node.deformerType === 'rotation'
              ? {
                  rotationAngle: defaultCoordinates(object, byGuid, (form) => [
                    rotationAngle(object.source, form),
                  ])[0],
                  rotationReflection: defaultRotationReflection(object, byGuid),
                  rotationScale: defaultCoordinates(object, byGuid, (form) => [
                    Number(form.getAttribute('scale') ?? 1),
                  ])[0],
                }
              : {}),
          },
        }
      : object.node.kind === 'group' && object.keyforms.forms.length > 0
        ? {
            ...object,
            node: {
              ...object.node,
              properties: {
                ...defaultColorProperties(object, byGuid),
                ...(child(object.source, 'b', 'enableDrawOrderGroup')?.textContent === 'true'
                  ? {
                      drawOrder: defaultCoordinates(object, byGuid, (form) => [
                        partProperties(form, references).drawOrder,
                      ])[0],
                    }
                  : {}),
              },
            },
          }
        : object,
  )
  const partById = new Map(parts.map((part) => [part.id, part]))
  const morphBindings = posed.flatMap((object) =>
    readCmo3Morphs({
      node: object.node,
      parameters: byGuid,
      part: partById.get(object.node.id),
      readForm: (form) => objectKeyform(object, form),
      references,
      source: object.source,
    }),
  )
  const physics = readCmo3Physics(
    model,
    new Map(Array.from(byGuid, ([key, parameter]) => [key, parameter.id])),
    references,
  )
  const glue = readCmo3Glue(model, references, meshes, byGuid)
  return {
    ...(physics === undefined ? {} : {physics}),
    glue: glue.glue,
    parameterBindings: [...parameterBindings, ...morphBindings, ...glue.parameterBindings],
    parameters,
    parts,
    scene: buildScene(posed),
    warnings: glue.warnings,
  }
}
