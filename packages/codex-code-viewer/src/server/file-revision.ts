import type {BigIntStats} from 'node:fs'

/** Identifies filesystem metadata changes with nanosecond timestamps. */
export const fileRevision = (stats: BigIntStats): string =>
  `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeNs}:${stats.ctimeNs}`
