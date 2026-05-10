import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {
  isSafeAgentSessionId,
  resolveAgentSessionJsonlFilePath,
  resolveWorkspaceWithTranscripts,
} from '../agent-sessions'

const createdPaths: string[] = []

const workspacePathToProjectKey = (workspacePath: string): string =>
  path
    .resolve(workspacePath)
    .split(path.sep)
    .filter((segment) => segment !== '')
    .join('-')

const createWorkspaceWithTranscriptDirectory = async (): Promise<{
  readonly transcriptDirectory: string
  readonly workspaceRoot: string
}> => {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-sessions-'))
  const transcriptDirectory = path.join(
    os.homedir(),
    '.cursor',
    'projects',
    workspacePathToProjectKey(workspaceRoot),
    'agent-transcripts',
  )

  createdPaths.push(workspaceRoot, path.dirname(transcriptDirectory))
  await fs.mkdir(transcriptDirectory, {recursive: true})

  return {transcriptDirectory, workspaceRoot}
}

afterEach(async () => {
  await Promise.all(
    createdPaths.splice(0).map(async (createdPath) => {
      await fs.rm(createdPath, {force: true, recursive: true})
    }),
  )
})

describe('isSafeAgentSessionId', () => {
  it('should reject values that can escape a path segment', () => {
    expect(isSafeAgentSessionId('')).toBe(false)
    expect(isSafeAgentSessionId('.')).toBe(false)
    expect(isSafeAgentSessionId('..')).toBe(false)
    expect(isSafeAgentSessionId('../leaked')).toBe(false)
    expect(isSafeAgentSessionId('nested/session')).toBe(false)
    expect(isSafeAgentSessionId('nested\\session')).toBe(false)
    expect(isSafeAgentSessionId('session\0id')).toBe(false)
  })

  it('should accept normal session identifiers', () => {
    expect(isSafeAgentSessionId('session-123_abc')).toBe(true)
    expect(isSafeAgentSessionId('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
  })
})

describe('resolveWorkspaceWithTranscripts', () => {
  it('should ignore working directories outside the workspace root', async () => {
    await expect(
      resolveWorkspaceWithTranscripts({
        workingDirectory: '/tmp/outside-project',
        workspaceRoot: '/workspace/project',
      }),
    ).resolves.toBe(path.resolve('/workspace/project'))
  })
})

describe('resolveAgentSessionJsonlFilePath', () => {
  it('should resolve an existing session transcript inside the transcript directory', async () => {
    const {transcriptDirectory, workspaceRoot} = await createWorkspaceWithTranscriptDirectory()
    const sessionId = 'session-123'
    const transcriptPath = path.join(transcriptDirectory, sessionId, `${sessionId}.jsonl`)

    await fs.mkdir(path.dirname(transcriptPath), {recursive: true})
    await fs.writeFile(transcriptPath, '{}\n')

    await expect(
      resolveAgentSessionJsonlFilePath({
        sessionId,
        workingDirectory: workspaceRoot,
        workspaceRoot,
      }),
    ).resolves.toBe(transcriptPath)
  })

  it('should not resolve path traversal session identifiers', async () => {
    const {transcriptDirectory, workspaceRoot} = await createWorkspaceWithTranscriptDirectory()
    const sessionId = '../leaked'
    const escapedPath = path.join(transcriptDirectory, sessionId, `${sessionId}.jsonl`)

    await fs.mkdir(path.dirname(escapedPath), {recursive: true})
    await fs.writeFile(escapedPath, '{}\n')

    await expect(
      resolveAgentSessionJsonlFilePath({
        sessionId,
        workingDirectory: workspaceRoot,
        workspaceRoot,
      }),
    ).resolves.toBeUndefined()
  })
})
