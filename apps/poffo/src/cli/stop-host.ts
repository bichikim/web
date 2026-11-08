import {constants} from 'node:http2'
import {watch} from 'node:fs'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import type {HostConnection} from '../backend/node/start-node-host'

const SHUTDOWN_LIMIT = 30_000

/** Waits for descriptor removal, the host's shutdown completion signal. */
export const stopHost = async (connection: HostConnection, workspace: string, discard: boolean) => {
  const controller = new AbortController()
  const limit = AbortSignal.timeout(SHUTDOWN_LIMIT)
  const path = join(workspace, '.poffo/connection.json')
  let finished!: () => void
  const removed = new Promise<void>((resolve) => {
    finished = resolve
  })
  const inspect = async () => {
    const current = await readFile(path, 'utf8').catch(() => '')
    if (current === '' || JSON.parse(current).sessionId !== connection.sessionId) {
      finished()
    }
  }
  const watcher = watch(join(workspace, '.poffo'), {signal: controller.signal}, () => {
    inspect().catch(() => undefined)
  })
  try {
    const stopped = await fetch(`${connection.url}/api/stop`, {
      body: JSON.stringify({discard}),
      headers: {Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json'},
      method: 'POST',
      signal: limit,
    })
    if (!stopped.ok) {
      throw new Error(
        stopped.status === constants.HTTP_STATUS_CONFLICT
          ? 'unsaved-document: save or explicitly discard'
          : `shutdown-failed: HTTP ${stopped.status}`,
      )
    }
    await inspect()
    limit.throwIfAborted()
    await new Promise<void>((resolve, reject) => {
      const abort = () => reject(new Error('shutdown-timeout: host did not finish closing'))
      limit.addEventListener('abort', abort, {once: true})
      removed.then(() => {
        limit.removeEventListener('abort', abort)
        resolve()
      }, reject)
    })
    return {ok: true}
  } finally {
    watcher.close()
    controller.abort()
  }
}
