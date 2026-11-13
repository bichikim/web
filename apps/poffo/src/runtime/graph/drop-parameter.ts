import {getGroupHeader, PARAMETER_ROW_HEIGHT} from './group-layout'
import type {Node} from '@dschz/solid-flow'
import type {ParameterGroup, ParameterMapping} from '../../tracking/types'
interface DropParameterOptions {
  readonly groups: ReadonlyArray<ParameterGroup>
  readonly mappings?: ReadonlyArray<ParameterMapping>
  readonly node: Node
  readonly nodes: ReadonlyArray<Node>
}
const PARAMETER_WIDTH = 240
const PARAMETER_HEIGHT = PARAMETER_ROW_HEIGHT
const GROUP_WIDTH = 288
const GROUP_HEIGHT = 40
export const dropParameter = (options: DropParameterOptions) => {
  const {node} = options
  if (node.type !== 'parameters') {
    return undefined
  }
  const parent = options.nodes.find((candidate) => candidate.id === node.parentId)
  const position = {
    x: node.position.x + (parent?.position.x ?? 0),
    y: node.position.y + (parent?.position.y ?? 0),
  }
  const center = {
    x: position.x + (node.measured?.width ?? PARAMETER_WIDTH) / 2,
    y: position.y + (node.measured?.height ?? PARAMETER_HEIGHT) / 2,
  }
  const target = options.nodes.findLast(
    (candidate) =>
      candidate.type === 'parameterGroup' &&
      center.x >= candidate.position.x &&
      center.x <= candidate.position.x + (candidate.measured?.width ?? GROUP_WIDTH) &&
      center.y >= candidate.position.y &&
      center.y <= candidate.position.y + (candidate.measured?.height ?? GROUP_HEIGHT),
  )
  if (target === undefined && node.parentId === undefined) {
    return undefined
  }
  const group = options.groups.find((group) => `parameter:group:${group.id}` === target?.id)
  const members = group?.parameterIds ?? []
  const header = group === undefined ? 0 : getGroupHeader(group)
  const parameterId = node.id.replace(/^parameter:/u, '')
  const memberIndex = members.includes(parameterId) ? members.indexOf(parameterId) : members.length
  return {
    groups: options.groups.map((group) => ({
      ...group,
      parameterIds:
        `parameter:group:${group.id}` === target?.id
          ? group.parameterIds.includes(parameterId)
            ? group.parameterIds
            : [...group.parameterIds, parameterId]
          : group.parameterIds.filter((id) => id !== parameterId),
    })),
    mappings: (options.mappings ?? []).filter(
      (mapping) =>
        group?.mode !== 'broadcast' ||
        node.parentId === target?.id ||
        mapping.parameterId !== parameterId,
    ),
    node: {
      ...node,
      extent: undefined,
      parentId: target?.id,
      position: {
        x: target === undefined ? position.x : 0,
        y: target === undefined ? position.y : header + memberIndex * PARAMETER_ROW_HEIGHT,
      },
    },
  }
}
