import {type LocalInput, MAPPING_INPUTS, type MappingInput, type RuntimeProfile} from './types'
export const isLocalInput = (value: unknown): value is LocalInput =>
  typeof value === 'string' && /^(?:manualValue|buttonValue)(?::[\w-]+)?$/u.test(value)
export const isMappingInput = (value: unknown): value is MappingInput =>
  isLocalInput(value) || MAPPING_INPUTS.some((input) => input === value)
export const getLocalInputIds = (profile: RuntimeProfile | undefined): readonly LocalInput[] =>
  profile?.localInputIds ?? ['manualValue', 'buttonValue']
export const addLocalInput = (profile: RuntimeProfile, input: LocalInput): RuntimeProfile => ({
  ...profile,
  inputs: {
    buttonValue: 0,
    manualValue: 0,
    ...profile.inputs,
    [input]: 0,
  },
  localInputIds: [...getLocalInputIds(profile), input],
})
export const removeLocalInput = (profile: RuntimeProfile, input: LocalInput): RuntimeProfile => ({
  ...profile,
  inputs: Object.fromEntries(
    Object.entries(profile.inputs ?? {}).filter(([id]) => id !== input),
  ) as RuntimeProfile['inputs'],
  localInputIds: getLocalInputIds(profile).filter((id) => id !== input),
  mappings: profile.mappings.map((mapping) =>
    mapping.input === input ? {...mapping, inputConnected: false} : mapping,
  ),
})
