import type {PuppetParameter, PuppetSceneDeformerNode, PuppetSceneNode} from '../../player/document'
import type {Moc3Model} from '../read-moc3'
import type {NativeObject} from './types'
import {column, numberAt, readColors, readWarpPosition} from './tables'
import {createBinding, defaultCoordinates, readForms} from './keyforms'
import {baseNode} from './scene-node'
import {readOffscreen, readOffscreenKeyform} from './offscreen'

const DEGREES_PER_HALF_TURN = 180

/** Parent index -1 denotes a root; every other value must name an existing native object. */
const validateParents = (model: Moc3Model) => {
  const references = [
    ['parts', 'parentPart', 'parts'],
    ['deformers', 'parentPart', 'parts'],
    ['deformers', 'parentDeformer', 'deformers'],
    ['artMeshes', 'parentPart', 'parts'],
    ['artMeshes', 'parentDeformer', 'deformers'],
  ] as const
  for (const [table, field, target] of references) {
    const count = model.tables[target]!.ids.length
    model.tables[table]!.ids.forEach((_, index) => {
      const parent = numberAt(model, table, field, index)
      if (!Number.isInteger(parent) || parent < -1 || parent >= count) {
        throw new Error(`MOC3 ${table}.${field} references a missing parent: ${parent}`)
      }
    })
  }
}

const readWarpInterpolation = (model: Moc3Model, source: number) =>
  (column(model, 'warpDeformers', 'quad')[source] ?? 0) === 0
    ? model.canvas.reverseY
      ? ('triangles-mirrored' as const)
      : ('triangles' as const)
    : ('bilinear' as const)

const rotationShape = (reversed: boolean) => ({
  boneRestPoints: [0, 0, 1, 0],
  deformerType: 'rotation' as const,
  ...(reversed ? {rotationReferenceDistance: -0.1} : {}),
})

const readDeformers = (model: Moc3Model, parameters: ReadonlyArray<PuppetParameter>) =>
  model.tables.deformers!.ids.map((id, index): NativeObject => {
    const rotation = numberAt(model, 'deformers', 'type', index) === 1
    const source = numberAt(model, 'deformers', 'source', index)
    const parent = numberAt(model, 'deformers', 'parentDeformer', index)
    const ancestors = new Set<number>()
    let ancestor = parent
    let inheritedRotation = false
    while (ancestor >= 0) {
      if (ancestors.has(ancestor)) {
        throw new Error('MOC3 deformer hierarchy contains a cycle')
      }
      ancestors.add(ancestor)
      inheritedRotation ||= numberAt(model, 'deformers', 'type', ancestor) === 1
      ancestor = numberAt(model, 'deformers', 'parentDeformer', ancestor)
    }
    const scaleFactor = inheritedRotation ? 1 : model.canvas.pixelsPerUnit
    const table = rotation ? 'rotationDeformers' : 'warpDeformers'
    const formTable = rotation ? 'rotationKeyforms' : 'warpKeyforms'
    const keyforms = readForms(model, {index: source, table}, parameters, (form) => {
      const x = rotation ? numberAt(model, formTable, 'x', form) : 0
      const direction = model.canvas.reverseY ? -1 : 1
      const y = rotation ? numberAt(model, formTable, 'y', form) * direction : 0
      const angle = rotation
        ? ((numberAt(model, formTable, 'angle', form) + numberAt(model, table, 'angle', source)) *
            Math.PI *
            direction) /
          DEGREES_PER_HALF_TURN
        : 0
      return {
        deformers: [
          {
            controlPoints: rotation
              ? [x, y, x + Math.cos(angle), y + Math.sin(angle)]
              : readWarpPosition(
                  model,
                  form,
                  numberAt(model, table, 'columns', source),
                  numberAt(model, table, 'rows', source),
                ),
            kind: 'deformer',
            nodeId: id,
            properties: {
              ...readColors(model, {index: source, table}, {index: form, table: formTable}),
              opacity: Math.min(1, Math.max(0, numberAt(model, formTable, 'opacity', form))),
            },
            ...(rotation
              ? {
                  rotationAngle: angle,
                  rotationReflection: [
                    numberAt(model, formTable, 'reflectX', form) !== 0,
                    numberAt(model, formTable, 'reflectY', form) !== 0,
                  ] as const,
                  rotationScale: numberAt(model, formTable, 'scale', form) * scaleFactor,
                }
              : {}),
          },
        ],
        parts: [],
      }
    })
    const node: PuppetSceneDeformerNode = {
      ...baseNode(
        id,
        numberAt(model, 'deformers', 'visible', index) !== 0 &&
          numberAt(model, 'deformers', 'enabled', index) !== 0,
      ),
      bounds: {height: 1, width: 1, x: 0, y: !rotation && model.canvas.reverseY ? -1 : 0},
      children: [],
      columns: rotation ? 1 : numberAt(model, table, 'columns', source),
      controlPoints: [],
      coordinateSpace: 'parent',
      interpolation: rotation ? 'triangles' : readWarpInterpolation(model, source),
      kind: 'deformer',
      rows: rotation ? 1 : numberAt(model, table, 'rows', source),
      ...(rotation ? rotationShape(model.canvas.reverseY) : {}),
    }
    const object: NativeObject = {
      ...keyforms,
      deformer: numberAt(model, 'deformers', 'parentDeformer', index),
      id,
      node,
      parent: numberAt(model, 'deformers', 'parentPart', index),
      rotationScaleFactor: scaleFactor,
    }
    const color = defaultCoordinates(object, (form) => {
      const properties = form.deformers![0]!.properties!
      return [properties.opacity!, ...properties.multiplyColor!, ...properties.screenColor!]
    })
    const reflection = rotation
      ? defaultCoordinates(
          object,
          (form) => form.deformers![0]!.rotationReflection!.map(Number),
          true,
        )
      : []
    const rotationPose = rotation
      ? defaultCoordinates(object, (form) => {
          const deformer = form.deformers![0]!
          return [deformer.controlPoints[0]!, deformer.controlPoints[1]!, deformer.rotationAngle!]
        })
      : []
    return {
      ...object,
      node: {
        ...node,
        controlPoints: rotation
          ? [
              rotationPose[0]!,
              rotationPose[1]!,
              rotationPose[0]! + Math.cos(rotationPose[2]!),
              rotationPose[1]! + Math.sin(rotationPose[2]!),
            ]
          : defaultCoordinates(object, (form) => form.deformers![0]!.controlPoints),
        properties: {
          multiplyColor: [color[1]!, color[2]!, color[3]!],
          opacity: color[0],
          screenColor: [color[4]!, color[5]!, color[6]!],
        },
        ...(rotation
          ? {
              rotationAngle: rotationPose[2],
              rotationReflection: [reflection[0] !== 0, reflection[1] !== 0] as const,
              rotationScale: defaultCoordinates(object, (form) => [
                form.deformers![0]!.rotationScale!,
              ])[0],
            }
          : {}),
      },
    }
  })

const readGroups = (model: Moc3Model, parameters: ReadonlyArray<PuppetParameter>) =>
  model.tables.parts!.ids.map((id, index): NativeObject => {
    const groupOrder = column(model, 'orderObjects', 'index').some(
      (value, offset) => value === index && numberAt(model, 'orderObjects', 'type', offset) === 1,
    )
    const keyforms = readForms(model, {index, table: 'parts'}, parameters, (form) => ({
      groups: [
        {
          groupId: id,
          properties: {
            ...readOffscreenKeyform(model, form),
            ...(groupOrder ? {drawOrder: numberAt(model, 'partKeyforms', 'order', form)} : {}),
          },
        },
      ],
      parts: [],
    }))
    const node = {
      ...baseNode(
        id,
        numberAt(model, 'parts', 'visible', index) !== 0 &&
          numberAt(model, 'parts', 'enabled', index) !== 0,
      ),
      children: [],
      kind: 'group' as const,
    }
    const object: NativeObject = {
      ...keyforms,
      id,
      node,
      parent: numberAt(model, 'parts', 'parentPart', index),
    }
    const color = defaultCoordinates(object, (form) => {
      const {properties} = form.groups![0]!
      return [
        properties.opacity ?? 1,
        ...(properties.multiplyColor ?? [1, 1, 1]),
        ...(properties.screenColor ?? [0, 0, 0]),
      ]
    })
    return {
      ...object,
      node: {
        ...node,
        properties: {
          ...readOffscreen(model, index),
          multiplyColor: [color[1]!, color[2]!, color[3]!] as const,
          opacity: color[0],
          screenColor: [color[4]!, color[5]!, color[6]!] as const,
          ...(groupOrder
            ? {
                drawOrder: defaultCoordinates(object, (form) => [
                  form.groups![0]!.properties.drawOrder!,
                ])[0],
              }
            : {}),
        },
      },
    }
  })

const buildScene = (
  model: Moc3Model,
  groups: ReadonlyArray<NativeObject>,
  deformers: ReadonlyArray<NativeObject>,
  meshes: ReadonlyArray<NativeObject>,
) => {
  const objects = new Map(
    groups.map((object) => [object.id, {...object, parentId: groups[object.parent]?.id}]),
  )
  for (const mesh of meshes) {
    const group = groups[mesh.parent]
    const ancestors: NativeObject[] = []
    const visited = new Set<number>()
    let index = mesh.deformer ?? -1
    while (index >= 0) {
      if (visited.has(index) || deformers[index] === undefined) {
        throw new Error('MOC3 deformer hierarchy is invalid')
      }
      visited.add(index)
      const deformer = deformers[index]!
      ancestors.unshift(deformer)
      index = deformer.deformer ?? -1
    }
    let parentId = group?.id
    for (const ancestor of ancestors) {
      const id = `${ancestor.id}@${group?.id ?? 'root'}`
      if (!objects.has(id)) {
        objects.set(id, {
          ...ancestor,
          forms: ancestor.forms.map((form) => ({
            ...form,
            deformers: form.deformers!.map((deformer) => ({...deformer, nodeId: id})),
          })),
          id,
          node: {...ancestor.node, id},
          parentId,
          sourceId: ancestor.id,
        })
      }
      parentId = id
    }
    objects.set(mesh.id, {...mesh, parentId})
  }
  const visited = new Set<string>()
  const children = new Map<string | undefined, NativeObject[]>()
  for (const object of objects.values()) {
    if (object.parentId !== undefined && !objects.has(object.parentId)) {
      throw new Error('MOC3 group hierarchy references a missing parent')
    }
    children.set(object.parentId, [...(children.get(object.parentId) ?? []), object])
  }
  const build = (object: NativeObject): PuppetSceneNode => {
    if (visited.has(object.id)) {
      throw new Error('MOC3 scene hierarchy contains a cycle')
    }
    visited.add(object.id)
    const node =
      object.visibilityRanges?.length === 0 || object.visibilityRanges === undefined
        ? object.node
        : {...object.node, parameterVisibility: object.visibilityRanges}
    return node.kind === 'part'
      ? node
      : {...node, children: (children.get(object.id) ?? []).map(build)}
  }
  const roots = (children.get(undefined) ?? []).map(build)
  if (visited.size !== objects.size) {
    throw new Error('MOC3 scene hierarchy contains a cycle')
  }
  const {originX, originY, pixelsPerUnit} = model.canvas
  const root: PuppetSceneDeformerNode = {
    ...baseNode('moc3:canvas'),
    bounds: {height: 1, width: 1, x: 0, y: 0},
    children: roots,
    columns: 1,
    controlPoints: [
      originX,
      originY,
      originX + pixelsPerUnit,
      originY,
      originX,
      originY + pixelsPerUnit,
      originX + pixelsPerUnit,
      originY + pixelsPerUnit,
    ],
    coordinateSpace: 'parent',
    interpolation: 'triangles',
    kind: 'deformer',
    rows: 1,
  }
  return {
    objects: [...objects.values()],
    parameterBindings: [...objects.values()]
      .filter((object) => object.axes.length > 0)
      .map(createBinding),
    scene: {roots: [root]},
  }
}

/** Rebuilds part membership and each native deformer chain in Poffo parent space. */
export const readMoc3Scene = (
  model: Moc3Model,
  parameters: ReadonlyArray<PuppetParameter>,
  meshes: ReadonlyArray<NativeObject>,
) => {
  validateParents(model)
  return buildScene(model, readGroups(model, parameters), readDeformers(model, parameters), meshes)
}
