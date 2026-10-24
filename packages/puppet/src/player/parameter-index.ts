import type {PuppetParameter} from './document'

const parameterIndexes = new WeakMap<
  ReadonlyArray<PuppetParameter>,
  ReadonlyMap<string, PuppetParameter>
>()

export const getParameterIndex = (parameters: ReadonlyArray<PuppetParameter>) => {
  let indexed = parameterIndexes.get(parameters)
  if (indexed === undefined) {
    indexed = new Map(parameters.map((parameter) => [parameter.id, parameter]))
    parameterIndexes.set(parameters, indexed)
  }
  return indexed
}
