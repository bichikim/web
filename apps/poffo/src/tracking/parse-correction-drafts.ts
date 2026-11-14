import type {PuppetParameter} from '@winter-love/puppet/player'
interface ParseCorrectionDraftsOptions {
  readonly value: unknown
  readonly parameters: ReadonlyArray<PuppetParameter>
}
export const parseCorrectionDrafts = (
  options: ParseCorrectionDraftsOptions,
): ReadonlyArray<string> | undefined => {
  if (options.value === undefined) {
    return []
  }
  if (!Array.isArray(options.value)) {
    return undefined
  }
  const valid = options.value.every(
    (id: unknown) =>
      typeof id === 'string' &&
      id.startsWith('draft:') &&
      id.length > 'draft:'.length &&
      !options.parameters.some((parameter) => parameter.id === id),
  )
  return valid && new Set(options.value).size === options.value.length ? options.value : undefined
}
