import {failure, type Result, success} from '../shared/contracts'
import {readMedia} from './read-media'

interface MediaBytesRequest {
  readonly root: string
  readonly path: string
  readonly revision: string
  readonly size: number
}
/** Collects a known media length through revision-checked chunks. */
export const readMediaBytes = (request: MediaBytesRequest): Result<Buffer> => {
  const chunks: Buffer[] = []
  let offset = 0
  while (offset < request.size) {
    const result = readMedia({...request, offset})
    if (!result.ok) {
      return result
    }
    if (result.value.next <= offset || result.value.next > request.size) {
      return failure('read-failed')
    }
    chunks.push(Buffer.from(result.value.data, 'base64'))
    offset = result.value.next
  }
  return success(Buffer.concat(chunks))
}
