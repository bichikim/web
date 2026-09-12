import {createLatestAsyncTask} from '../create-latest-async-task'
import type {LatestStorageWriter} from './types'

/** Serializes writes for one key, retaining the latest pending value and rejecting on final failure. */
export const createLatestStorageWriter = (
  key: string,
  write: (key: string, value: unknown) => void | Promise<void>,
): LatestStorageWriter => createLatestAsyncTask((value: unknown) => write(key, value))
