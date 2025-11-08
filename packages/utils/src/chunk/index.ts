import {chunk} from 'es-toolkit/array'

export interface ChunkOp {
  <T>(size: number, list: T[]): T[][]

  (size: number): <T>(list: T[]) => T[][]
}

export const chunkOp: ChunkOp = (...args: any[]): any => {
  const [size, list] = args

  if (args.length > 1) {
    return chunk(list, size)
  }

  return (list) => {
    return chunk(list, size)
  }
}

export {chunk} from 'es-toolkit/array'
