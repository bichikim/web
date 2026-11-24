import type {TrackingParameter} from '../tracking/types'
import type {TouchParameter} from './types'

interface TouchNode {
  readonly deformerType?: string
  readonly skinning?: {readonly influences: readonly {readonly nodeId: string}[]}
  readonly id: string
  readonly kind: string
  readonly children?: readonly TouchNode[]
}
interface TouchBinding {
  readonly parameterIds: readonly string[]
  readonly targetPartIds?: readonly string[]
  readonly targetDeformerIds?: readonly string[]
  readonly targetGroupIds?: readonly string[]
  readonly keyforms: readonly {
    readonly parts: readonly {readonly partId: string}[]
    readonly deformers?: readonly {readonly nodeId: string}[]
    readonly groups?: readonly {readonly groupId: string}[]
  }[]
}
interface ModelTouchParametersOptions {
  /** Scalar parameters, including their bounds and neutral values. */
  readonly parameters?: readonly TrackingParameter[]
  /** Multiaxis keyform bindings whose targets identify touched parts. */
  readonly parameterBindings?: readonly TouchBinding[]
  /** Scene hierarchy used to include children of a keyed deformer or group. */
  readonly scene?: {readonly roots: readonly TouchNode[]}
}

/** Maps each connected scalar to affected parts and its 1D/2D/3D binding axis. */
export const modelTouchParameters = (
  options: ModelTouchParametersOptions,
): readonly TouchParameter[] => {
  const descendants = new Map<string, readonly string[]>()
  const rotations = new Set<string>()
  const paths = new Map<string, readonly string[]>()
  const skins: {part: string; bone: string}[] = []
  const visit = (node: TouchNode, ancestors: readonly string[]): readonly string[] => {
    const path = [...ancestors, node.id]
    paths.set(node.id, path)
    const parts =
      node.kind === 'part'
        ? [node.id]
        : (node.children ?? []).flatMap((child) => visit(child, path))
    descendants.set(node.id, parts)
    if (node.deformerType === 'rotation') {
      rotations.add(node.id)
    }
    if (node.kind === 'part') {
      node.skinning?.influences.forEach((influence) =>
        skins.push({bone: influence.nodeId, part: node.id}),
      )
    }
    return parts
  }
  options.scene?.roots.forEach((node) => visit(node, []))
  for (const skin of skins) {
    for (const id of paths.get(skin.bone) ?? []) {
      descendants.set(id, [...new Set([...(descendants.get(id) ?? []), skin.part])])
    }
  }
  const connections = new Map<
    string,
    {axis: TouchParameter['axis']; dimensions: number; parts: Set<string>; joint: boolean}
  >()
  for (const binding of options.parameterBindings ?? []) {
    const targets = [
      ...(binding.targetPartIds ?? []),
      ...binding.keyforms.flatMap((form) => form.parts.map((part) => part.partId)),
      ...[
        ...(binding.targetDeformerIds ?? []),
        ...(binding.targetGroupIds ?? []),
        ...binding.keyforms.flatMap((form) => form.deformers?.map((item) => item.nodeId) ?? []),
        ...binding.keyforms.flatMap((form) => form.groups?.map((item) => item.groupId) ?? []),
      ].flatMap((id) => descendants.get(id) ?? []),
    ]
    if (binding.keyforms.length > 0 && targets.length > 0) {
      binding.parameterIds.forEach((id, index) => {
        const previous = connections.get(id)
        const axis = (['x', 'y', 'z'] as const)[index] ?? 'x'
        connections.set(id, {
          axis: (previous?.dimensions ?? 0) > binding.parameterIds.length ? previous!.axis : axis,
          dimensions: Math.max(previous?.dimensions ?? 0, binding.parameterIds.length),
          joint:
            previous?.joint === true ||
            [
              ...(binding.targetDeformerIds ?? []),
              ...binding.keyforms.flatMap(
                (form) => form.deformers?.map((node) => node.nodeId) ?? [],
              ),
            ].some((id) => rotations.has(id)),
          parts: new Set([...(previous?.parts ?? []), ...targets]),
        })
      })
    }
  }
  return (options.parameters ?? []).flatMap((parameter) => {
    const connection = connections.get(parameter.id)
    return connection === undefined || parameter.maximum <= parameter.minimum
      ? []
      : [
          {
            ...parameter,
            axis: connection.axis,
            dimensions: connection.dimensions,
            parts: [...connection.parts],
            ...(connection.joint ? {joint: true} : {}),
          },
        ]
  })
}
