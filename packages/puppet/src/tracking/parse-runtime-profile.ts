import {isRuntimeView} from './view-settings'
import {isLocalInput, isMappingInput} from './local-inputs'
import {parseCorrectionDrafts} from './parse-correction-drafts'
import {getRuntimeParameters, parseParameterGroups} from './parameter-groups'
import {isLocalInputs} from './is-local-inputs'
import {type RuntimeProfile} from './types'
import type {PuppetDocument} from '../player'
import {isTrackingMultiplier} from './multiplier'
import {isMouthTrackingSettings} from './mouth-calibration'
import {createRuntimeProfile} from './create-runtime-profile'

const isProfileSettings = (value: object, signature: string) =>
  'version' in value &&
  value.version === 2 &&
  'signature' in value &&
  value.signature === signature &&
  (!('view' in value) || isRuntimeView(value.view)) &&
  (!('expandedSections' in value) ||
    (Array.isArray(value.expandedSections) &&
      value.expandedSections.every((id) => typeof id === 'string'))) &&
  (!('mouth' in value) || isMouthTrackingSettings(value.mouth)) &&
  (!('inputs' in value) || isLocalInputs(value.inputs)) &&
  (!('localInputIds' in value) ||
    (Array.isArray(value.localInputIds) &&
      value.localInputIds.every(isLocalInput) &&
      new Set(value.localInputIds).size === value.localInputIds.length)) &&
  (!('collapsedInputs' in value) ||
    (Array.isArray(value.collapsedInputs) &&
      value.collapsedInputs.every((id) => ['tracking', 'manual', 'button'].includes(id))))

/** Validates stored settings against the current model and rejects ambiguous outputs and keys. */
const validMappingName = (value: unknown) =>
  value === undefined || (typeof value === 'string' && value.trim().length > 0)
export const parseRuntimeProfile = (
  value: unknown,
  document: PuppetDocument,
): RuntimeProfile | undefined => {
  const expected = createRuntimeProfile(document)
  if (
    typeof value !== 'object' ||
    value === null ||
    !isProfileSettings(value, expected.signature) ||
    !('mappings' in value) ||
    !Array.isArray(value.mappings) ||
    !('expressions' in value) ||
    !Array.isArray(value.expressions) ||
    !('motions' in value) ||
    !Array.isArray(value.motions)
  ) {
    return undefined
  }
  const groups = parseParameterGroups(
    'groups' in value ? value.groups : undefined,
    document.parameters ?? [],
  )
  if (groups === undefined) {
    return undefined
  }
  const drafts = parseCorrectionDrafts({
    parameters: document.parameters ?? [],
    value: 'drafts' in value ? value.drafts : undefined,
  })
  if (drafts === undefined) {
    return undefined
  }
  const parameters = getRuntimeParameters(document.parameters ?? [], groups, drafts)
  const parameterIds = new Set(parameters.map((parameter) => parameter.id))
  const outputs = new Set<string>()
  const keys = new Set<string>()
  const presetIds = new Set<string>()
  const motionIds = new Set<string>()
  const validKey = (key: unknown) => {
    if (typeof key !== 'string' || key.length > 1 || (key !== '' && keys.has(key.toLowerCase()))) {
      return false
    }
    if (key !== '') {
      keys.add(key.toLowerCase())
    }
    return true
  }
  const mappings = value.mappings.every((mapping) => {
    if (
      typeof mapping !== 'object' ||
      mapping === null ||
      !validMappingName(mapping.name) ||
      !parameterIds.has(mapping.parameterId) ||
      outputs.has(mapping.parameterId) ||
      !isMappingInput(mapping.input) ||
      typeof mapping.enabled !== 'boolean' ||
      !['collapsed', 'direct', 'inputConnected', 'outputConnected'].every(
        (key) => !(key in mapping) || typeof mapping[key] === 'boolean',
      ) ||
      ('baseline' in mapping &&
        (typeof mapping.baseline !== 'number' || !Number.isFinite(mapping.baseline))) ||
      ('multiplier' in mapping && !isTrackingMultiplier(mapping.multiplier)) ||
      !['inputMinimum', 'inputMaximum', 'outputMinimum', 'outputMaximum', 'smoothing'].every(
        (key) => typeof mapping[key] === 'number' && Number.isFinite(mapping[key]),
      ) ||
      mapping.inputMinimum === mapping.inputMaximum ||
      mapping.smoothing < 0
    ) {
      return false
    }
    outputs.add(mapping.parameterId)
    const parameter = parameters.find((parameter) => parameter.id === mapping.parameterId)
    return (
      parameter !== undefined &&
      [mapping.outputMinimum, mapping.outputMaximum].every(
        (bound) => bound >= parameter.minimum && bound <= parameter.maximum,
      )
    )
  })
  const expressions = value.expressions.every((preset) => {
    if (
      typeof preset !== 'object' ||
      preset === null ||
      typeof preset.id !== 'string' ||
      preset.id === '' ||
      presetIds.has(preset.id) ||
      typeof preset.name !== 'string' ||
      !validKey(preset.key) ||
      typeof preset.values !== 'object' ||
      preset.values === null ||
      Array.isArray(preset.values)
    ) {
      return false
    }
    presetIds.add(preset.id)
    return Object.entries(preset.values).every(([id, value]) => {
      const parameter = document.parameters?.find((candidate) => candidate.id === id)
      return (
        parameter !== undefined &&
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= parameter.minimum &&
        value <= parameter.maximum
      )
    })
  })
  const motions = value.motions.every((motion) => {
    if (
      typeof motion !== 'object' ||
      motion === null ||
      motionIds.has(motion.motionId) ||
      !document.motions.some((candidate) => candidate.id === motion.motionId) ||
      !validKey(motion.key)
    ) {
      return false
    }
    motionIds.add(motion.motionId)
    return true
  })
  return mappings && expressions && motions ? (value as RuntimeProfile) : undefined
}
