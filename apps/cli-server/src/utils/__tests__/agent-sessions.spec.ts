import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {
  isSafeAgentSessionId,
  resolveAgentSessionJsonlFilePath,
  resolveWorkspaceWithTranscripts,
} from '../agent-sessions'

const createdPathList: string[] = []

const toProjectKey = (workspacePath: string): string =>
  path
    .resolve(workspacePath)
    .split(path.sep)
    .filter((segment) => segment !== '')
    .join('-')

const createTranscriptFile = async ({
  sessionId,
  workspaceRoot,
}: {
  readonly sessionId: string
  readonly workspaceRoot: string
}): Promise<string> => {
  const transcriptDirectory = path.join(
    os.homedir(),
    '.cursor',
    'projects',
    toProjectKey(workspaceRoot),
    'agent-transcripts',
    sessionId,
  )
  const transcriptPath = path.join(transcriptDirectory, `${sessionId}.jsonl`)

  await fs.mkdir(transcriptDirectory, {recursive: true})
  await fs.writeFile(transcriptPath, '', 'utf8')
  createdPathList.push(transcriptPath)

  return transcriptPath
}

afterEach(async () => {
  await Promise.all(
    createdPathList
      .splice(0)
      .map((createdPath) => fs.rm(path.dirname(createdPath), {recursive: true})),
  )
})

describe('isSafeAgentSessionId', () => {
  it('should allow agent session identifiers', () => {
    expect(isSafeAgentSessionId('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isSafeAgentSessionId('session_123')).toBe(true)
  })

  it('should reject path traversal segments', () => {
    expect(isSafeAgentSessionId('../secret')).toBe(false)
    expect(isSafeAgentSessionId('..\\secret')).toBe(false)
    expect(isSafeAgentSessionId('session.jsonl')).toBe(false)
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
  it('should reject unsafe session identifiers before resolving a transcript path', async () => {
    const workspaceRoot = '/workspace/project'
    const transcriptPath = await resolveAgentSessionJsonlFilePath({
      sessionId: '../secret',
      workingDirectory: workspaceRoot,
      workspaceRoot,
    })

    expect(transcriptPath).toBeUndefined()
  })

  it('should resolve safe session identifiers inside the transcript directory', async () => {
    const workspaceRoot = path.join(os.tmpdir(), 'agent-session-test-workspace')
    const sessionId = '123e4567-e89b-12d3-a456-426614174000'
    const expectedPath = await createTranscriptFile({
      sessionId,
      workspaceRoot,
    })
    const transcriptPath = await resolveAgentSessionJsonlFilePath({
      sessionId,
      workingDirectory: workspaceRoot,
      workspaceRoot,
    })

    expect(transcriptPath).toBe(expectedPath)
  })
})
