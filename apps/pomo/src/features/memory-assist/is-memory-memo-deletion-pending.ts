import type {MemoryMemo} from './schema'

export const isMemoryMemoDeletionPending = (memo: MemoryMemo): boolean =>
  memo.deletionPending === true
