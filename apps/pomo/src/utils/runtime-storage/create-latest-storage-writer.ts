import {createLatestAsyncTask} from '../create-latest-async-task'
import type {LatestStorageWriter} from './types'

/** 하나의 키에 대한 쓰기를 순서대로 실행하고 최신 대기 값을 유지하며, 최종 실패 시 Promise를 거부한다. */
export const createLatestStorageWriter = (
  key: string,
  write: (key: string, value: unknown) => void | Promise<void>,
): LatestStorageWriter => createLatestAsyncTask((value: unknown) => write(key, value))
