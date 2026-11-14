import type {ParameterGroup, ParameterMapping, RuntimeProfile} from '../../tracking/types'
import type {Node} from '@dschz/solid-flow'
export interface CardPosition {
  readonly id: string
  readonly x: number
  readonly y: number
}
export interface WorkspaceLayout {
  readonly expandedSections?: readonly string[]
  readonly version: 1
  readonly signature: string
  readonly positions: readonly CardPosition[]
  readonly extraPorts: readonly string[]
  readonly hiddenIds: readonly string[]
  readonly collapsedCorrections: readonly string[]
  readonly collapsedGroups: readonly string[]
  readonly collapsedInputs: readonly string[]
}
const stringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((id) => typeof id === 'string')
export const parseWorkspaceLayout = (
  value: unknown,
  signature: string,
): WorkspaceLayout | undefined => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('version' in value) ||
    value.version !== 1 ||
    !('signature' in value) ||
    value.signature !== signature ||
    !('positions' in value) ||
    !Array.isArray(value.positions)
  ) {
    return undefined
  }
  const valid = value.positions.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      Number.isFinite(item.x) &&
      Number.isFinite(item.y),
  )
  const unique = new Set(value.positions.map((item) => item?.id)).size === value.positions.length
  const lists = [
    'extraPorts',
    'hiddenIds',
    'collapsedCorrections',
    'collapsedGroups',
    'collapsedInputs',
  ] as const
  return (!('expandedSections' in value) || stringList(value.expandedSections)) &&
    valid &&
    unique &&
    lists.every((key) => key in value && stringList(value[key as keyof typeof value]))
    ? (value as WorkspaceLayout)
    : undefined
}
export const applyWorkspacePositions = (
  nodes: readonly Node[],
  positions: readonly CardPosition[],
): Node[] => {
  const lookup = new Map(positions.map((position) => [position.id, position]))
  return nodes.map((node) => {
    const position = lookup.get(node.id)
    return position === undefined || node.parentId !== undefined
      ? node
      : {...node, position: {x: position.x, y: position.y}}
  })
}
export const applyWorkspaceCollapse = (
  profile: RuntimeProfile,
  layout: WorkspaceLayout,
): RuntimeProfile => ({
  ...profile,
  collapsedInputs: layout.collapsedInputs,
  expandedSections: layout.expandedSections ?? [],
  groups: profile.groups?.map((group: ParameterGroup) => ({
    ...group,
    collapsed: layout.collapsedGroups.includes(group.id),
  })),
  mappings: profile.mappings.map((mapping: ParameterMapping) => ({
    ...mapping,
    collapsed: layout.collapsedCorrections.includes(mapping.parameterId),
  })),
})
