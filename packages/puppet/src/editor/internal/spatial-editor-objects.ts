import {
  PUPPET_SPATIAL_OBJECT_MAX_DEPTH,
  type PuppetSpatialObject,
  type PuppetSpatialPrimitive,
  type PuppetSpatialPrimitiveObject,
} from '../../player'

interface Bounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const SHAPE_NAMES = {box: '네모', cylinder: '원기둥', prism: '세모', sphere: '동그라미'} as const
const DEFAULT_DEPTH_RATIO = 3
const DEFAULT_SMOOTHNESS = 20

export const createSpatialEditorObject = (
  bounds: Bounds,
  shape: PuppetSpatialPrimitiveObject['shape'],
): PuppetSpatialPrimitiveObject => ({
  center: [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, 0],
  id: crypto.randomUUID(),
  kind: 'primitive',
  mode: 'add',
  name: SHAPE_NAMES[shape],
  rotation: [0, 0, 0],
  shape,
  size: [
    shape === 'box' ? bounds.width : bounds.width / 2,
    shape === 'box' ? bounds.height : bounds.height / 2,
    Math.min(bounds.width, bounds.height) / DEFAULT_DEPTH_RATIO,
  ],
  visible: true,
})

export const legacySpatialObjects = (
  operations: ReadonlyArray<PuppetSpatialPrimitive>,
): ReadonlyArray<PuppetSpatialObject> => {
  const children: PuppetSpatialPrimitiveObject[] = operations.map((operation) => ({
    ...operation,
    kind: 'primitive',
    name: SHAPE_NAMES[operation.shape],
    rotation: [0, 0, 0],
    visible: true,
  }))
  if (children.length < 2) {
    return children
  }
  return [
    {
      children,
      id: crypto.randomUUID(),
      kind: 'group',
      mode: 'add',
      name: '합친 메시',
      visible: true,
    },
  ]
}

export const updateSpatialEditorObject = (
  objects: ReadonlyArray<PuppetSpatialObject>,
  id: string,
  update: (object: PuppetSpatialObject) => PuppetSpatialObject,
): ReadonlyArray<PuppetSpatialObject> =>
  objects.map((object) => {
    if (object.id === id) {
      return update(object)
    }
    return object.kind === 'group'
      ? {...object, children: updateSpatialEditorObject(object.children, id, update)}
      : object
  })

export const findSpatialEditorObject = (
  objects: ReadonlyArray<PuppetSpatialObject>,
  id: string,
): PuppetSpatialObject | undefined => {
  for (const object of objects) {
    if (object.id === id) {
      return object
    }
    if (object.kind === 'group') {
      const found = findSpatialEditorObject(object.children, id)
      if (found !== undefined) {
        return found
      }
    }
  }
  return undefined
}

export const removeSpatialEditorObject = (
  objects: ReadonlyArray<PuppetSpatialObject>,
  id: string,
): ReadonlyArray<PuppetSpatialObject> =>
  objects.flatMap((object): PuppetSpatialObject[] => {
    if (object.id === id) {
      return []
    }
    if (object.kind !== 'group') {
      return [object]
    }
    const children = removeSpatialEditorObject(object.children, id)
    if (children.length === 0) {
      return []
    }
    if (children.length === 1) {
      return [{...children[0]!, mode: object.mode}]
    }
    return [
      {
        ...object,
        children: children.map((child, index) =>
          index === 0 ? {...child, mode: 'add' as const} : child,
        ),
      },
    ]
  })

export const combineSpatialEditorObjects = (
  objects: ReadonlyArray<PuppetSpatialObject>,
  ids: ReadonlyArray<string>,
  mode: PuppetSpatialPrimitive['mode'],
): ReadonlyArray<PuppetSpatialObject> => {
  const selected = objects.filter((object) => ids.includes(object.id))
  if (
    selected.length < 2 ||
    selected.some((object) => getSpatialObjectDepth(object) >= PUPPET_SPATIAL_OBJECT_MAX_DEPTH)
  ) {
    return objects
  }
  const first = objects.findIndex((object) => object.id === selected[0]!.id)
  const group: PuppetSpatialObject = {
    children: selected.map((object, index) => ({
      ...object,
      mode: index === 0 ? 'add' : mode,
      smoothness: index > 0 && mode === 'smooth-add' ? DEFAULT_SMOOTHNESS : object.smoothness,
    })),
    id: crypto.randomUUID(),
    kind: 'group',
    mode: 'add',
    name: '합친 메시',
    visible: true,
  }
  return objects.flatMap((object, index) =>
    index === first ? [group] : selected.includes(object) ? [] : [object],
  )
}

const getSpatialObjectDepth = (object: PuppetSpatialObject): number =>
  object.kind === 'group' ? 1 + Math.max(...object.children.map(getSpatialObjectDepth)) : 0

export const canCombineSpatialEditorObjects = (
  objects: ReadonlyArray<PuppetSpatialObject>,
  ids: ReadonlyArray<string>,
): boolean => {
  const selected = objects.filter((object) => ids.includes(object.id))
  return (
    selected.length >= 2 &&
    selected.every((object) => getSpatialObjectDepth(object) < PUPPET_SPATIAL_OBJECT_MAX_DEPTH)
  )
}

export const duplicateSpatialEditorObject = (object: PuppetSpatialObject): PuppetSpatialObject => {
  const id = crypto.randomUUID()
  return object.kind === 'group'
    ? {
        ...object,
        children: object.children.map(duplicateSpatialEditorObject),
        id,
        name: `${object.name} 복사`,
      }
    : {...object, id, name: `${object.name} 복사`}
}

export const splitSpatialEditorObject = (
  objects: ReadonlyArray<PuppetSpatialObject>,
  id: string,
): ReadonlyArray<PuppetSpatialObject> =>
  objects.flatMap((object) => {
    if (object.id === id && object.kind === 'group') {
      return object.children.map((child) => ({...child, mode: 'add' as const}))
    }
    return [
      object.kind === 'group'
        ? {...object, children: splitSpatialEditorObject(object.children, id)}
        : object,
    ]
  })
