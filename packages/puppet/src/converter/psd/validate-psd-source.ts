import type {ImportPsdFailure, PsdSource} from './types'

export const MAXIMUM_PSD_BYTES = 268_435_456

export const validatePsdSource = (
  source: Pick<PsdSource, 'name' | 'size'>,
): ImportPsdFailure | undefined => {
  if (!/\.psd$/iu.test(source.name)) {
    return {error: {code: 'invalid-file'}, ok: false}
  }
  if (source.size > MAXIMUM_PSD_BYTES) {
    return {error: {code: 'too-large'}, ok: false}
  }
  return undefined
}
