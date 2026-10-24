import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'

/** 같은 프로필의 설치를 한 번에 하나만 실행하고 완료·실패 시 잠금을 해제한다. */
export const withUpdateLock = async (
  home: string,
  operation: () => Promise<void>,
): Promise<void> => {
  await mkdir(home, {recursive: true})
  const database = new DatabaseSync(join(home, 'code-viewer-update.sqlite'), {timeout: 0})
  try {
    try {
      // OS가 소유하는 잠금은 별도 타이머 없이 프로세스 종료 때도 해제된다.
      database.exec('BEGIN IMMEDIATE')
    } catch (error) {
      const SQLITE_BUSY = 5
      if (error instanceof Error && 'errcode' in error && error.errcode === SQLITE_BUSY) {
        throw Object.assign(new Error('Code Viewer update already in progress', {cause: error}), {
          code: 'update-in-progress',
        })
      }
      throw error
    }
    await operation()
  } finally {
    database.close()
  }
}
