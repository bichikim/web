import {getGroupHeader, PARAMETER_ROW_HEIGHT} from './group-layout'
import type {PuppetParameter} from '@winter-love/puppet/player'
import {getInputNode} from '../../tracking/tracking-inputs'
import type {Edge, Node} from '@dschz/solid-flow'
import type {ParameterGroup, ParameterMapping} from '../../tracking/types'
interface CreateGraphElementsOptions {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly groups?: ReadonlyArray<ParameterGroup>
  readonly mappings: ReadonlyArray<ParameterMapping>
  readonly previous: ReadonlyArray<Node>
  readonly preservePositions: boolean
}
const CARD_SPACING = 330
const GROUP_COLUMN = 1000
const PARAMETER_SPACING = 56
const GROUP_GAP = 40
export const createGraphElements = (options: CreateGraphElementsOptions) => {
  const {mappings} = options
  const previous = new Map(
    options.preservePositions ? options.previous.map((node) => [node.id, node] as const) : [],
  )
  let offset = 0
  const groups = options.groups ?? []
  const containers: Node[] = groups.flatMap((group) => {
    const parentId = `parameter:group:${group.id}`
    const header = getGroupHeader(group)
    const height = header + (group.collapsed ? 0 : group.parameterIds.length * PARAMETER_ROW_HEIGHT)
    const parent: Node = {
      class: 'puppet-group-container',
      data: {},
      deletable: false,
      id: parentId,
      position: {x: GROUP_COLUMN, y: offset},
      style: {'--group-height': `${height}px`},
      type: 'parameterGroup',
    }
    offset += height + GROUP_GAP
    return [
      parent,
      ...(group.collapsed ? [] : group.parameterIds).map(
        (id, index): Node => ({
          data: {},
          deletable: false,
          id: `parameter:${id}`,
          parentId,
          position: {x: 0, y: header + index * PARAMETER_ROW_HEIGHT},
          type: 'parameters',
        }),
      ),
    ]
  })
  const outputs: Node[] = options.parameters
    .filter(
      (parameter) =>
        !parameter.id.startsWith('draft:') &&
        !groups.some(
          (group) =>
            `group:${group.id}` === parameter.id || group.parameterIds.includes(parameter.id),
        ),
    )
    .map((parameter, index) => ({
      data: {},
      deletable: false,
      id: `parameter:${parameter.id}`,
      position: {x: 650, y: offset + index * PARAMETER_SPACING},
      type: 'parameters',
    }))
  let correctionOffset = Math.max(
    0,
    ...Array.from(previous.values())
      .filter((node) => node.type === 'correction')
      .map((node) => node.position.y + CARD_SPACING),
  )
  const corrections: Node[] = mappings
    .filter((mapping) => !mapping.direct)
    .map((mapping, index) => {
      const id = `mapping:${mapping.parameterId}`
      const cached = previous.get(id)
      const position = cached?.position ?? {
        x: 270,
        y: previous.size === 0 ? index * CARD_SPACING : correctionOffset,
      }
      if (cached === undefined) {
        correctionOffset += CARD_SPACING
      }
      return {data: {}, id, position, type: 'correction'}
    })
  const built: Node[] = [
    {data: {}, deletable: false, id: 'tracking', position: {x: 0, y: 0}, type: 'tracking'},
    {data: {}, deletable: false, id: 'manual', position: {x: 0, y: 460}, type: 'manual'},
    {data: {}, deletable: false, id: 'button', position: {x: 0, y: 620}, type: 'button'},
    ...corrections,
    ...containers,
    ...outputs,
  ]
  const visibleIds = new Set(built.map((node) => node.id))
  return {
    edges: mappings
      .flatMap((mapping): Edge[] =>
        mapping.direct
          ? [
              {
                class: mapping.enabled ? 'puppet-graph-edge' : 'puppet-graph-edge-disabled',
                hidden: mapping.inputConnected === false || mapping.outputConnected === false,
                id: `output:${mapping.parameterId}`,
                source: getInputNode(mapping.input),
                sourceHandle: mapping.input,
                target: `parameter:${mapping.parameterId}`,
                targetHandle: mapping.parameterId,
                type: 'mapping',
              },
            ]
          : [
              {
                class: mapping.enabled ? 'puppet-graph-edge' : 'puppet-graph-edge-disabled',
                hidden: mapping.inputConnected === false,
                id: `input:${mapping.parameterId}`,
                source: getInputNode(mapping.input),
                sourceHandle: mapping.input,
                target: `mapping:${mapping.parameterId}`,
                type: 'mapping',
              },
              {
                class: mapping.enabled ? 'puppet-graph-edge' : 'puppet-graph-edge-disabled',
                hidden: mapping.outputConnected === false,
                id: `output:${mapping.parameterId}`,
                source: `mapping:${mapping.parameterId}`,
                target: `parameter:${mapping.parameterId}`,
                targetHandle: mapping.parameterId,
                type: 'mapping',
              },
            ],
      )
      .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    nodes: built.map((node) => ({
      ...previous.get(node.id),
      ...node,
      extent: node.extent,
      parentId: node.parentId,
      position:
        node.parentId === undefined && previous.get(node.id)?.parentId === node.parentId
          ? (previous.get(node.id)?.position ?? node.position)
          : node.position,
    })),
  }
}
