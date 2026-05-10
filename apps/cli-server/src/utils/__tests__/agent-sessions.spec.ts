import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {isSafeAgentSessionId, resolveAgentSessionJsonlFilePath} from '../agent-sessions'

const CURSOR_PROJECTS_DIRECTORY = path.join(os.homedir(), '.cursor', 'projects')

const workspacePathToProjectKey = (workspacePath: string): string =>
  path
    .resolve(workspacePath)
    .split(path.sep)
    .filter((segment) => segment !== '')
    .join('-')

const resolveTranscriptDirectory = (workspacePath: string): string =>
  path.join(
    CURSOR_PROJECTS_DIRECTORY,
    workspacePathToProjectKey(workspacePath),
    'agent-transcripts',
  )

const cleanupTargets = new Set<string>()

const createTestWorkspace = async () => {
  const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-sessions-'))
  const workspaceRoot = path.join(testRoot, 'workspace')
  const projectDirectory = path.dirname(resolveTranscriptDirectory(workspaceRoot))

  cleanupTargets.add(testRoot)
  cleanupTargets.add(projectDirectory)
  await fs.mkdir(workspaceRoot, {recursive: true})

  return {
    transcriptDirectory: resolveTranscriptDirectory(workspaceRoot),
    workspaceRoot,
  }
}

afterEach(async () => {
  await Promise.all(
    [...cleanupTargets].map((target) => fs.rm(target, {force: true, recursive: true})),
  )
  cleanupTargets.clear()
})

describe('resolveAgentSessionJsonlFilePath', () => {
  it('should resolve a transcript file for a safe session id', async () => {
    const {transcriptDirectory, workspaceRoot} = await createTestWorkspace()
    const sessionId = 'safe-session-id'
    const sessionFilePath = path.join(transcriptDirectory, sessionId, `${sessionId}.jsonl`)

    await fs.mkdir(path.dirname(sessionFilePath), {recursive: true})
    await fs.writeFile(sessionFilePath, '', 'utf8')

    await expect(
      resolveAgentSessionJsonlFilePath({
        sessionId,
        workingDirectory: workspaceRoot,
        workspaceRoot,
      }),
    ).resolves.toBe(sessionFilePath)
  })

  it('should reject session ids that escape the transcript directory', async () => {
    const {transcriptDirectory, workspaceRoot} = await createTestWorkspace()
    const sessionId = '../escaped-session'
    const escapedFilePath = path.join(transcriptDirectory, sessionId, `${sessionId}.jsonl`)

    await fs.mkdir(path.dirname(escapedFilePath), {recursive: true})
    await fs.writeFile(escapedFilePath, '', 'utf8')

    await expect(
      resolveAgentSessionJsonlFilePath({
        sessionId,
        workingDirectory: workspaceRoot,
        workspaceRoot,
      }),
    ).resolves.toBeUndefined()
  })
})

describe('isSafeAgentSessionId', () => {
  it('should reject empty, dot, and path-like session ids', () => {
    expect(isSafeAgentSessionId('')).toBe(false)
    expect(isSafeAgentSessionId('.')).toBe(false)
    expect(isSafeAgentSessionId('..')).toBe(false)
    expect(isSafeAgentSessionId('../other-session')).toBe(false)
    expect(isSafeAgentSessionId('other/session')).toBe(false)
    expect(isSafeAgentSessionId('other\\session')).toBe(false)
  })

  it('should allow plain session ids', () => {
    expect(isSafeAgentSessionId('session-123_abc')).toBe(true)
  })
})
