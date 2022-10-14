import {chunk} from '@winter-love/lodash'

export const chunkFn =
  (size?: number) =>
  <T>(list: T[] | null | undefined): T[][] =>
    chunk<T>(list, size)

export {chunk}
