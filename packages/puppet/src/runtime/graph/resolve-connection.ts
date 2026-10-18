import {isMappingInput} from '../../tracking/local-inputs'
import {isGroupControlled} from '../../tracking/is-group-controlled'
import type {PuppetParameter} from '../../player'
import {getInputNode, getTrackingRange} from '../../tracking/tracking-inputs'
import {type ParameterGroup, type ParameterMapping} from '../../tracking/types'
export interface GraphConnection {
  readonly previousId?: string
  readonly source: string
  readonly target: string
  readonly sourceHandle?: string | null
  readonly targetHandle?: string | null
}
interface ResolveConnectionOptions {
  readonly connection: GraphConnection
  readonly groups?: ReadonlyArray<ParameterGroup>
  readonly mappings: ReadonlyArray<ParameterMapping>
  readonly parameters: ReadonlyArray<PuppetParameter>
}
interface ResolvedConnection {
  readonly mapping: ParameterMapping
  readonly previousId?: string
}
const resolveAvailableConnection = (
  options: ResolveConnectionOptions,
): ResolvedConnection | undefined => {
  const {connection, mappings, parameters} = options
  const source = mappings.find((mapping) => connection.source === `mapping:${mapping.parameterId}`)
  const destination = mappings.find(
    (mapping) => connection.target === `mapping:${mapping.parameterId}`,
  )
  const input = isMappingInput(connection.sourceHandle) ? connection.sourceHandle : undefined
  if (
    input !== undefined &&
    connection.source === getInputNode(input) &&
    destination !== undefined &&
    input !== undefined
  ) {
    if (input === destination.input && destination.inputConnected !== false) {
      return undefined
    }
    const {baseline: _baseline, ...mapping} = destination
    const [inputMinimum, inputMaximum] = getTrackingRange(input)
    return {
      mapping: {
        ...mapping,
        ...(input === destination.input && destination.baseline !== undefined
          ? {baseline: destination.baseline}
          : {}),
        input,
        inputConnected: true,
        inputMaximum,
        inputMinimum,
      },
    }
  }
  const parameter = parameters.find((candidate) => candidate.id === connection.targetHandle)
  if (
    (connection.target !== 'parameters' && connection.target !== `parameter:${parameter?.id}`) ||
    parameter === undefined ||
    mappings.some(
      (mapping) =>
        mapping.parameterId === parameter.id &&
        mapping.parameterId !== connection.previousId &&
        mapping.outputConnected !== false,
    )
  ) {
    return undefined
  }
  if (source !== undefined) {
    const reversed = source.outputMinimum > source.outputMaximum
    return {
      mapping: {
        ...source,
        outputConnected: true,
        outputMaximum: reversed ? parameter.minimum : parameter.maximum,
        outputMinimum: reversed ? parameter.maximum : parameter.minimum,
        parameterId: parameter.id,
      },
      previousId: source.parameterId,
    }
  }
  if (input === undefined || connection.source !== getInputNode(input)) {
    return undefined
  }
  const [inputMinimum, inputMaximum] = getTrackingRange(input)
  return {
    mapping: {
      direct: true,
      enabled: true,
      input,
      inputMaximum,
      inputMinimum,
      outputMaximum: parameter.maximum,
      outputMinimum: parameter.minimum,
      parameterId: parameter.id,
      smoothing: 0,
    },
    previousId: connection.previousId,
  }
}

export const resolveConnection = (
  options: ResolveConnectionOptions,
): ResolvedConnection | undefined => {
  const destination = options.mappings.find(
    (mapping) => options.connection.target === `mapping:${mapping.parameterId}`,
  )
  const targetId = destination?.parameterId ?? options.connection.targetHandle
  if (
    targetId !== undefined &&
    targetId !== null &&
    isGroupControlled({groups: options.groups ?? [], parameterId: targetId})
  ) {
    return undefined
  }
  return resolveAvailableConnection(options)
}
