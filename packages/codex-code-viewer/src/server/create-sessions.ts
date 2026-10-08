import {randomUUID} from 'node:crypto'
import {statSync} from 'node:fs'
import {resolve} from 'node:path'
import {failure, type Result, success} from '../shared/contracts'
import {createWorkspace} from './create-workspace'
import {toolResult} from './tool-result'
const MAX_SESSIONS = 16

export const createSessions = () => {
  const sessions = new Map<string, ReturnType<typeof createWorkspace>>()
  const register = (workspace: ReturnType<typeof createWorkspace>) => {
    if (sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next().value
      if (oldest !== undefined) {
        sessions.get(oldest)?.dispose()
        sessions.delete(oldest)
      }
    }
    const session = randomUUID()
    sessions.set(session, workspace)
    return {session, workspace: workspace.root}
  }
  const connect = (path: string) => {
    try {
      if (!statSync(path).isDirectory()) {
        return failure('not-found')
      }
      return success(register(createWorkspace(path)))
    } catch {
      return failure('read-failed')
    }
  }
  const open = (path: string, line = 1, column = 1) => {
    try {
      const workspace = createWorkspace(resolve(path))
      const document = workspace.read(path, line, column)
      if (!document.ok) {
        workspace.dispose()
        return document
      }
      return success({...register(workspace), document: document.value})
    } catch (error) {
      return failure(
        error instanceof Error &&
          'code' in error &&
          (error.code === 'ENOENT' || error.code === 'ENOTDIR')
          ? 'not-found'
          : 'read-failed',
      )
    }
  }
  const withSession = async <Value extends Record<string, unknown>>(
    session: string,
    operation: (
      workspace: ReturnType<typeof createWorkspace>,
    ) => Result<Value> | Promise<Result<Value>>,
  ) => {
    const workspace = sessions.get(session)
    if (workspace === undefined) {
      return toolResult(failure('session-expired'))
    }
    try {
      return toolResult(await operation(workspace))
    } catch {
      return toolResult(failure('read-failed'))
    }
  }
  const dispose = (): void => {
    for (const workspace of sessions.values()) {
      workspace.dispose()
    }
    sessions.clear()
  }
  const close = (session: string): void => {
    sessions.get(session)?.dispose()
    sessions.delete(session)
  }
  return {close, connect, dispose, open, withSession}
}
