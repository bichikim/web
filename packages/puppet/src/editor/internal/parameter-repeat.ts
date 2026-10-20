import type {PuppetDocument} from '../../player/document'

/**
 * Turns repeat (wrapping values into the range) on or off for a parameter. Option parameters
 * cannot repeat.
 */
export const setParameterRepeat = (
  document: PuppetDocument,
  parameterId: string,
  repeat: boolean,
): PuppetDocument | undefined => {
  const parameter = document.parameters?.find((candidate) => candidate.id === parameterId)
  if (parameter === undefined || (repeat && parameter.options !== undefined)) {
    return undefined
  }
  const {repeat: _previous, ...rest} = parameter
  return {
    ...document,
    parameters: document.parameters?.map((candidate) =>
      candidate.id === parameterId ? (repeat ? {...rest, repeat} : rest) : candidate,
    ),
  }
}
